import ICAL from "ical.js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FETCH_TIMEOUT_MS = 10_000;
const HORIZON_MONTHS = 18;

function toDateKey(d: Date): string {
  // YYYY-MM-DD in UTC (iCal DATE values are calendar dates, not instants)
  return d.toISOString().slice(0, 10);
}

function addDaysUTC(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setUTCDate(nd.getUTCDate() + n);
  return nd;
}

/**
 * Expand a parsed iCal feed into the set of blocked calendar dates within
 * [now, now + 18 months]. Handles all-day VEVENTs (DTEND exclusive) and
 * timed events (treats every overlapping calendar day as blocked).
 */
export function expandIcsToDates(
  ics: string,
): Array<{ date: string; summary: string | null }> {
  const jcal = ICAL.parse(ics);
  const comp = new ICAL.Component(jcal);
  const vevents = comp.getAllSubcomponents("vevent");

  const now = new Date();
  const horizon = new Date(now);
  horizon.setUTCMonth(horizon.getUTCMonth() + HORIZON_MONTHS);

  const out = new Map<string, string | null>();

  for (const ve of vevents) {
    const ev = new ICAL.Event(ve);
    if (!ev.startDate) continue;

    // Skip cancelled events
    const status = ve.getFirstPropertyValue("status");
    if (typeof status === "string" && status.toUpperCase() === "CANCELLED") continue;

    const isAllDay = ev.startDate.isDate;
    const startJs: Date = ev.startDate.toJSDate();
    let endJs: Date = ev.endDate ? ev.endDate.toJSDate() : addDaysUTC(startJs, 1);

    // For all-day events, DTEND is exclusive per RFC 5545.
    // For timed events with no DTEND, treat as one day.
    if (!isAllDay && endJs.getTime() === startJs.getTime()) {
      endJs = addDaysUTC(startJs, 1);
    }

    // Cursor walks UTC midnight to UTC midnight.
    let cursor = new Date(
      Date.UTC(
        startJs.getUTCFullYear(),
        startJs.getUTCMonth(),
        startJs.getUTCDate(),
      ),
    );
    const endCursor = new Date(
      Date.UTC(
        endJs.getUTCFullYear(),
        endJs.getUTCMonth(),
        endJs.getUTCDate(),
      ),
    );

    // For all-day events DTEND is exclusive, so we stop before endCursor.
    // For timed events that bleed past midnight, the last partial day still
    // counts as blocked, so we include endCursor when end > endCursor midnight.
    const includeEnd = !isAllDay && endJs.getTime() > endCursor.getTime();

    let guard = 0;
    while (
      (cursor < endCursor || (includeEnd && cursor.getTime() === endCursor.getTime())) &&
      guard < 800 // 2+ years safety
    ) {
      if (cursor >= new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) && cursor <= horizon) {
        const key = toDateKey(cursor);
        if (!out.has(key)) out.set(key, ev.summary ?? null);
      }
      cursor = addDaysUTC(cursor, 1);
      guard += 1;
    }
  }

  return [...out.entries()].map(([date, summary]) => ({ date, summary }));
}

async function fetchIcsWithTimeout(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "text/calendar, */*;q=0.1" },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text.includes("BEGIN:VCALENDAR")) {
      throw new Error("Response is not a valid iCal feed");
    }
    return text;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Replace one calendar row's blocked-date set with the given expanded dates.
 * Shared by per-deal and per-business-feed sync paths.
 */
async function replaceBlockedDatesForCalendar(
  calendarId: string,
  dealId: string,
  dates: Array<{ date: string; summary: string | null }>,
): Promise<void> {
  await supabaseAdmin
    .from("deal_blocked_dates")
    .delete()
    .eq("external_calendar_id", calendarId);

  if (dates.length > 0) {
    const rows = dates.map((d) => ({
      deal_id: dealId,
      date: d.date,
      source: "external_ical" as const,
      external_calendar_id: calendarId,
      summary: d.summary,
    }));
    const { error: insErr } = await supabaseAdmin
      .from("deal_blocked_dates")
      .insert(rows);
    if (insErr) throw new Error(insErr.message);
  }
}

/**
 * Pull the external feed, parse, and replace this feed's rows in
 * deal_blocked_dates with the freshly-expanded set. Updates last_synced_at /
 * last_status / last_error on the calendar row regardless of outcome.
 */
export async function syncOneExternalCalendar(calendarId: string): Promise<{
  ok: boolean;
  blockedCount: number;
  error?: string;
}> {
  const { data: cal, error: calErr } = await supabaseAdmin
    .from("deal_external_calendars")
    .select("id, deal_id, ics_url")
    .eq("id", calendarId)
    .maybeSingle();
  if (calErr || !cal) {
    return { ok: false, blockedCount: 0, error: calErr?.message ?? "Calendar not found" };
  }

  try {
    const ics = await fetchIcsWithTimeout(cal.ics_url);
    const dates = expandIcsToDates(ics);

    await replaceBlockedDatesForCalendar(cal.id, cal.deal_id as string, dates);

    await supabaseAdmin
      .from("deal_external_calendars")
      .update({
        last_synced_at: new Date().toISOString(),
        last_status: "ok",
        last_error: null,
      })
      .eq("id", cal.id);

    return { ok: true, blockedCount: dates.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabaseAdmin
      .from("deal_external_calendars")
      .update({
        last_synced_at: new Date().toISOString(),
        last_status: "error",
        last_error: msg.slice(0, 500),
      })
      .eq("id", cal.id);
    return { ok: false, blockedCount: 0, error: msg };
  }
}

/**
 * Sync one business-level channel manager feed across every deal owned by
 * that business. Ensures a mirror deal_external_calendars row exists for
 * each deal (linked by business_feed_id), then replaces blocked dates from
 * the freshly-fetched ICS. Stamps status on the feed row.
 */
export async function syncBusinessFeed(feedId: string): Promise<{
  ok: boolean;
  blockedCount: number;
  dealCount: number;
  error?: string;
}> {
  const { data: feed, error: feedErr } = await supabaseAdmin
    .from("business_channel_feeds")
    .select("id, business_id, label, feed_url")
    .eq("id", feedId)
    .maybeSingle();
  if (feedErr || !feed) {
    return {
      ok: false,
      blockedCount: 0,
      dealCount: 0,
      error: feedErr?.message ?? "Feed not found",
    };
  }

  const stampFeed = async (patch: Record<string, unknown>) => {
    await supabaseAdmin
      .from("business_channel_feeds")
      .update({ ...patch, last_synced_at: new Date().toISOString() })
      .eq("id", feed.id);
  };

  try {
    const ics = await fetchIcsWithTimeout(feed.feed_url);
    const dates = expandIcsToDates(ics);

    const { data: deals, error: dealsErr } = await supabaseAdmin
      .from("deals")
      .select("id")
      .eq("business_id", feed.business_id);
    if (dealsErr) throw new Error(dealsErr.message);
    const dealIds = (deals ?? []).map((d) => d.id as string);

    if (dealIds.length === 0) {
      await stampFeed({
        last_status: "ok",
        last_error: null,
        last_blocked_count: 0,
      });
      return { ok: true, blockedCount: 0, dealCount: 0 };
    }

    // Existing mirrors
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("deal_external_calendars")
      .select("id, deal_id")
      .eq("business_feed_id", feed.id);
    if (exErr) throw new Error(exErr.message);
    const byDeal = new Map<string, string>();
    for (const r of existing ?? []) byDeal.set(r.deal_id as string, r.id as string);

    // Create missing mirrors, refresh URL on existing ones
    const name = feed.label?.trim() || "Channel manager";
    const toCreate = dealIds
      .filter((id) => !byDeal.has(id))
      .map((id) => ({
        deal_id: id,
        business_feed_id: feed.id,
        name,
        ics_url: feed.feed_url,
      }));
    if (toCreate.length) {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from("deal_external_calendars")
        .insert(toCreate)
        .select("id, deal_id");
      if (insErr) throw new Error(insErr.message);
      for (const r of inserted ?? []) byDeal.set(r.deal_id as string, r.id as string);
    }

    if (byDeal.size) {
      await supabaseAdmin
        .from("deal_external_calendars")
        .update({ ics_url: feed.feed_url, name })
        .eq("business_feed_id", feed.id);
    }

    // Replace blocks per mirror
    for (const dealId of dealIds) {
      const calId = byDeal.get(dealId)!;
      await replaceBlockedDatesForCalendar(calId, dealId, dates);
      await supabaseAdmin
        .from("deal_external_calendars")
        .update({
          last_synced_at: new Date().toISOString(),
          last_status: "ok",
          last_error: null,
        })
        .eq("id", calId);
    }

    await stampFeed({
      last_status: "ok",
      last_error: null,
      last_blocked_count: dates.length,
    });
    return { ok: true, blockedCount: dates.length, dealCount: dealIds.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await stampFeed({ last_status: "error", last_error: msg.slice(0, 500) });
    return { ok: false, blockedCount: 0, dealCount: 0, error: msg };
  }
}