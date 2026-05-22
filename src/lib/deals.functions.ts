import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { optionalSupabaseAuth } from "@/lib/optional-auth";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const dealSelect =
  "id,title,description,destination,country,city,discount_label,price_cents,currency,url,image_url,starts_at,ends_at,is_active,click_count,business_id,parity_exempt,parity_exempt_reason,category,business:profiles!deals_business_id_fkey(id,username,display_name,avatar_url)";

const filterSchema = z
  .object({
    country: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    destination: z.string().max(160).optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .default({});

export const listDeals = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => filterSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("deals")
      .select(dealSelect)
      .eq("is_active", true)
      .or("starts_at.is.null,starts_at.lte.now()")
      .or("ends_at.is.null,ends_at.gte.now()")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.country) q = q.ilike("country", data.country);
    if (data.city) q = q.ilike("city", data.city);
    if (data.destination) q = q.ilike("destination", data.destination);
    const { data: deals, error } = await q;
    if (error) throw new Error(error.message);
    return { deals: deals ?? [] };
  });

export const getDeal = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: deal, error } = await supabaseAdmin
      .from("deals")
      .select(dealSelect)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!deal) throw new Error("Deal not found");
    return { deal };
  });

const upsertSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  url: z.string().url().max(500),
  image_url: z.string().url().max(500).optional(),
  destination: z.string().max(160).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  discount_label: z.string().max(40).optional(),
  price_cents: z.number().int().min(0).max(10_000_000).optional(),
  currency: z.string().length(3).optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  is_active: z.boolean().optional(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  parity_exempt: z.boolean().optional(),
  parity_exempt_reason: z.string().max(500).optional().nullable(),
  category: z.enum(["stay", "eat", "do", "tour", "transport", "other"]).optional(),
  bookable: z.boolean().optional(),
  cancellation_policy_code: z
    .enum(["travidz_standard", "free_cancel_until_start", "non_refundable", "custom_24h", "custom_7d"]) 
    .optional(),
});

export const createDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => upsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Gate: bookable deals require a payout method on the business profile.
    if (data.bookable) {
      const { data: profile, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("payout_method")
        .eq("id", userId)
        .maybeSingle();
      if (pErr) throw new Error(pErr.message);
      if (!profile || profile.payout_method !== "manual_bank") {
        throw new Error(
          "Add a payout method before listing a bookable deal. Visit /business/onboarding/payout",
        );
      }
    }
    const { data: row, error } = await supabase
      .from("deals")
      .insert({ ...data, business_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), patch: upsertSchema.partial() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("deals")
      .update(data.patch)
      .eq("id", data.id)
      .eq("business_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("deals").delete().eq("id", data.id).eq("business_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyDeals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("deals")
      .select(dealSelect)
      .eq("business_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { deals: data ?? [] };
  });

export const logDealClick = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        dealId: z.string().uuid(),
        referrerVideoId: z.string().uuid().optional(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    await supabaseAdmin.from("deal_clicks").insert({
      deal_id: data.dealId,
      referrer_video_id: data.referrerVideoId ?? null,
      user_id: context.userId ?? null,
    });
    return { ok: true };
  });

export const logDealImpression = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        dealId: z.string().uuid(),
        referrerVideoId: z.string().uuid().optional(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    await supabaseAdmin.from("deal_impressions").insert({
      deal_id: data.dealId,
      referrer_video_id: data.referrerVideoId ?? null,
      user_id: context.userId ?? null,
    });
    return { ok: true };
  });

export const applyForBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "business" });
    if (error && (error as any).code !== "23505") throw new Error(error.message);
    return { ok: true };
  });

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { roles: (data ?? []).map((r) => r.role as string) };
  });

const statsSchema = z.object({
  dealId: z.string().uuid(),
  range: z.enum(["7d", "30d"]).default("7d"),
});

export const getDealStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => statsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const days = data.range === "30d" ? 30 : 7;
    // verify ownership (also returns deal meta)
    const { data: deal, error: dealErr } = await supabase
      .from("deals")
      .select("id,title,country,city,destination,is_active,click_count,business_id")
      .eq("id", data.dealId)
      .eq("business_id", userId)
      .maybeSingle();
    if (dealErr) throw new Error(dealErr.message);
    if (!deal) throw new Error("Not found");

    const since = new Date(Date.now() - days * 86_400_000);
    const sinceIso = since.toISOString();
    const prevSinceIso = new Date(since.getTime() - days * 86_400_000).toISOString();

    const { data: clicks, error: clickErr } = await supabase
      .from("deal_clicks")
      .select("clicked_at,user_id,referrer_video_id")
      .eq("deal_id", data.dealId)
      .gte("clicked_at", prevSinceIso)
      .order("clicked_at", { ascending: true });
    if (clickErr) throw new Error(clickErr.message);

    const rows = clicks ?? [];
    const inRange = rows.filter((r) => r.clicked_at >= sinceIso);
    const prevRange = rows.filter((r) => r.clicked_at < sinceIso);

    const { data: imps } = await supabase
      .from("deal_impressions")
      .select("created_at,user_id,referrer_video_id")
      .eq("deal_id", data.dealId)
      .gte("created_at", prevSinceIso)
      .order("created_at", { ascending: true });
    const impRows = imps ?? [];
    const impsInRange = impRows.filter((r) => r.created_at >= sinceIso);
    const impsPrevRange = impRows.filter((r) => r.created_at < sinceIso);

    // zero-filled daily series
    const daily: Array<{ day: string; clicks: number }> = [];
    const dayMap = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      dayMap.set(d, 0);
    }
    for (const r of inRange) {
      const k = r.clicked_at.slice(0, 10);
      if (dayMap.has(k)) dayMap.set(k, (dayMap.get(k) ?? 0) + 1);
    }
    for (const [day, n] of dayMap) daily.push({ day, clicks: n });

    const uniqueUsers = new Set(inRange.map((r) => r.user_id).filter(Boolean)).size;

    // top referring videos (clicks + impressions)
    const videoCounts = new Map<string, number>();
    for (const r of inRange) {
      if (!r.referrer_video_id) continue;
      videoCounts.set(r.referrer_video_id, (videoCounts.get(r.referrer_video_id) ?? 0) + 1);
    }
    const videoImpCounts = new Map<string, number>();
    for (const r of impsInRange) {
      if (!r.referrer_video_id) continue;
      videoImpCounts.set(r.referrer_video_id, (videoImpCounts.get(r.referrer_video_id) ?? 0) + 1);
    }
    let topVideos: Array<{
      videoId: string;
      title: string;
      thumbnail_url: string | null;
      creator_username: string | null;
      clicks: number;
      impressions: number;
      ctr: number;
    }> = [];
    const allVideoIds = new Set<string>([...videoCounts.keys(), ...videoImpCounts.keys()]);
    if (allVideoIds.size > 0) {
      const ids = Array.from(allVideoIds);
      const { data: vids } = await supabaseAdmin
        .from("videos")
        .select(
          "id,title,thumbnail_url,creator:profiles!videos_creator_id_fkey(username)"
        )
        .in("id", ids);
      topVideos = (vids ?? [])
        .map((v: any) => {
          const clicks = videoCounts.get(v.id) ?? 0;
          const impressions = videoImpCounts.get(v.id) ?? 0;
          return {
            videoId: v.id,
            title: v.title,
            thumbnail_url: v.thumbnail_url,
            creator_username: v.creator?.username ?? null,
            clicks,
            impressions,
            ctr: impressions > 0 ? clicks / impressions : 0,
          };
        })
        .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
        .slice(0, 5);
    }

    return {
      deal,
      range: data.range,
      totals: {
        clicks: inRange.length,
        prevClicks: prevRange.length,
        uniqueUsers,
        impressions: impsInRange.length,
        prevImpressions: impsPrevRange.length,
        uniqueImpressionUsers: new Set(impsInRange.map((r) => r.user_id).filter(Boolean)).size,
        ctr: impsInRange.length > 0 ? inRange.length / impsInRange.length : 0,
      },
      daily,
      topVideos,
    };
  });