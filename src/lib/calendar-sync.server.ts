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

    // Replace strategy: delete this feed's existing rows, then insert fresh.
    await supabaseAdmin
      .from("deal_blocked_dates")
      .delete()
      .eq("external_calendar_id", cal.id);

    if (dates.length > 0) {
      const rows = dates.map((d) => ({
        deal_id: cal.deal_id,
        date: d.date,
        source: "external_ical" as const,
        external_calendar_id: cal.id,
        summary: d.summary,
      }));
      const { error: insErr } = await supabaseAdmin
        .from("deal_blocked_dates")
        .insert(rows);
      if (insErr) throw new Error(insErr.message);
    }

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