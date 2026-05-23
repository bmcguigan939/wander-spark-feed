import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { syncOneExternalCalendar } from "./calendar-sync.server";

function getPublicBaseUrl(): string {
  return (
    process.env.VITE_PUBLIC_APP_URL ??
    process.env.PUBLIC_APP_URL ??
    "https://travidz.com"
  );
}

async function assertOwnsDeal(userId: string, dealId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("deals")
    .select("business_id, ical_token")
    .eq("id", dealId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Deal not found");
  if (data.business_id !== userId) throw new Error("Not your deal");
  if (data.ical_token) return data.ical_token as string;
  // Lazily mint a token
  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replaceAll("-", "")
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  const { error: updErr } = await supabaseAdmin
    .from("deals")
    .update({ ical_token: token })
    .eq("id", dealId);
  if (updErr) throw new Error(updErr.message);
  return token;
}

const httpsUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((u) => /^https?:\/\//i.test(u) || /^webcal:\/\//i.test(u), {
    message: "Must be an http(s) or webcal URL",
  })
  .transform((u) => u.replace(/^webcal:\/\//i, "https://"));

export const getDealCalendarSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ dealId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const token = await assertOwnsDeal(userId, data.dealId);

    const { data: cals, error: calsErr } = await supabaseAdmin
      .from("deal_external_calendars")
      .select("id, name, ics_url, last_synced_at, last_status, last_error, created_at")
      .eq("deal_id", data.dealId)
      .order("created_at", { ascending: true });
    if (calsErr) throw new Error(calsErr.message);

    const { count: blockedCount } = await supabaseAdmin
      .from("deal_blocked_dates")
      .select("id", { count: "exact", head: true })
      .eq("deal_id", data.dealId)
      .gte("date", new Date().toISOString().slice(0, 10));

    const feedUrl = `${getPublicBaseUrl()}/api/public/ical/deal/${data.dealId}/${token}.ics`;
    return {
      feedUrl,
      calendars: cals ?? [],
      blockedCount: blockedCount ?? 0,
    };
  });

export const addExternalCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        dealId: z.string().uuid(),
        name: z.string().trim().min(1).max(60),
        icsUrl: httpsUrl,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOwnsDeal(context.userId, data.dealId);
    const { data: row, error } = await supabaseAdmin
      .from("deal_external_calendars")
      .insert({
        deal_id: data.dealId,
        name: data.name,
        ics_url: data.icsUrl,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    // Kick off a first sync immediately
    const result = await syncOneExternalCalendar(row.id);
    return { id: row.id, ...result };
  });

export const removeExternalCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        dealId: z.string().uuid(),
        calendarId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOwnsDeal(context.userId, data.dealId);
    const { error } = await supabaseAdmin
      .from("deal_external_calendars")
      .delete()
      .eq("id", data.calendarId)
      .eq("deal_id", data.dealId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const syncExternalCalendarNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        dealId: z.string().uuid(),
        calendarId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOwnsDeal(context.userId, data.dealId);
    return syncOneExternalCalendar(data.calendarId);
  });

/**
 * Public: list blocked dates for a deal in the next 12 months.
 * Used by the booking date picker to grey out unavailable dates.
 * Returns dates only (no source/summary) — that's all the picker needs and
 * keeps the payload small.
 */
export const getBlockedDates = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ dealId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date();
    horizon.setMonth(horizon.getMonth() + 12);
    const { data: rows, error } = await supabaseAdmin
      .from("deal_blocked_dates")
      .select("date")
      .eq("deal_id", data.dealId)
      .gte("date", today)
      .lte("date", horizon.toISOString().slice(0, 10));
    if (error) throw new Error(error.message);
    const set = new Set<string>((rows ?? []).map((r) => r.date as string));
    return { dates: [...set].sort() };
  });