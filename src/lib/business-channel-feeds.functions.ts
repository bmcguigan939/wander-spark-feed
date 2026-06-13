import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function getPublicBaseUrl(): string {
  return (
    process.env.VITE_PUBLIC_APP_URL ??
    process.env.PUBLIC_APP_URL ??
    "https://travidz.com"
  );
}

const httpsFeed = z
  .string()
  .trim()
  .min(5)
  .max(500)
  .refine(
    (v) => /^(https?:|webcal:)\/\//i.test(v),
    "Feed URL must start with https://, http:// or webcal://",
  )
  .transform((v) => v.replace(/^webcal:\/\//i, "https://"));

/**
 * List the current user's business channel manager feeds + sync status +
 * number of deals each feed currently blocks dates on.
 */
export const listMyChannelFeeds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: feeds, error } = await supabaseAdmin
      .from("business_channel_feeds")
      .select(
        "id,label,feed_url,created_at,last_synced_at,last_status,last_error,last_blocked_count",
      )
      .eq("business_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const ids = (feeds ?? []).map((f) => f.id as string);
    let dealsByFeed: Record<string, number> = {};
    if (ids.length) {
      const { data: mirrors } = await supabaseAdmin
        .from("deal_external_calendars")
        .select("business_feed_id, deal_id")
        .in("business_feed_id", ids);
      const counts = new Map<string, Set<string>>();
      for (const m of mirrors ?? []) {
        const k = m.business_feed_id as string;
        if (!counts.has(k)) counts.set(k, new Set());
        counts.get(k)!.add(m.deal_id as string);
      }
      dealsByFeed = Object.fromEntries(
        [...counts.entries()].map(([k, set]) => [k, set.size]),
      );
    }

    return {
      feeds: (feeds ?? []).map((f) => ({
        ...f,
        deal_count: dealsByFeed[f.id as string] ?? 0,
      })),
    };
  });

export const addMyChannelFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        label: z.string().trim().max(80).optional().nullable(),
        feed_url: httpsFeed,
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { syncBusinessFeed } = await import("@/lib/calendar-sync.server");
    const { data: row, error } = await supabaseAdmin
      .from("business_channel_feeds")
      .insert({
        business_id: context.userId,
        feed_url: data.feed_url,
        label: data.label?.trim() || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const result = await syncBusinessFeed(row.id as string);
    return { id: row.id, ...result };
  });

export const updateMyChannelFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        label: z.string().trim().max(80).optional().nullable(),
        feed_url: httpsFeed.optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { syncBusinessFeed } = await import("@/lib/calendar-sync.server");
    const patch: Record<string, unknown> = {};
    if (data.label !== undefined) patch.label = data.label?.trim() || null;
    if (data.feed_url !== undefined) patch.feed_url = data.feed_url;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin
      .from("business_channel_feeds")
      .update(patch as never)
      .eq("id", data.id)
      .eq("business_id", context.userId);
    if (error) throw new Error(error.message);
    if (data.feed_url !== undefined) {
      return syncBusinessFeed(data.id);
    }
    return { ok: true };
  });

export const removeMyChannelFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("business_channel_feeds")
      .delete()
      .eq("id", data.id)
      .eq("business_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const syncMyChannelFeedNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    // Authorize: feed must belong to caller.
    const { data: feed, error } = await supabaseAdmin
      .from("business_channel_feeds")
      .select("id")
      .eq("id", data.id)
      .eq("business_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!feed) throw new Error("Feed not found");
    const { syncBusinessFeed } = await import("@/lib/calendar-sync.server");
    return syncBusinessFeed(data.id);
  });

/**
 * Return outbound .ics URLs for every deal the caller owns, so they can be
 * pasted into a channel manager's "Import calendar" screen.
 * Mints an iCal token on deals that don't yet have one.
 */
export const listMyDealIcalUrls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: deals, error } = await supabaseAdmin
      .from("deals")
      .select("id, title, ical_token, is_active, status")
      .eq("business_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const base = getPublicBaseUrl();
    const out: Array<{
      dealId: string;
      title: string;
      feedUrl: string;
      isActive: boolean;
      status: string | null;
    }> = [];
    for (const d of deals ?? []) {
      let token = (d as any).ical_token as string | null;
      if (!token) {
        token =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID().replaceAll("-", "")
            : Math.random().toString(36).slice(2) + Date.now().toString(36);
        await supabaseAdmin
          .from("deals")
          .update({ ical_token: token })
          .eq("id", d.id);
      }
      out.push({
        dealId: d.id as string,
        title: (d.title as string) ?? "Untitled",
        feedUrl: `${base}/api/public/ical/deal/${d.id}/${token}.ics`,
        isActive: !!(d as any).is_active,
        status: ((d as any).status as string | null) ?? null,
      });
    }
    return { deals: out };
  });