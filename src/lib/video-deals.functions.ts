import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { discoverForVideo } from "./discovery.functions";

export type SuggestedDeal = {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  country: string | null;
  price_cents: number | null;
  currency: string | null;
  affiliate_network: string | null;
  ai_confidence: number | null;
  image_url: string | null;
  score: number;
};

function scoreDeal(
  deal: { city: string | null; country: string | null; ai_confidence: number | null; discovered_at: string | null },
  video: { city: string | null; country: string | null; tags: string[] },
  tagOverlap: number,
): number {
  const cityMatch = deal.city && video.city && deal.city.toLowerCase() === video.city.toLowerCase() ? 1 : 0;
  const countryMatch = deal.country && video.country && deal.country.toLowerCase() === video.country.toLowerCase() ? 0.5 : 0;
  const conf = deal.ai_confidence ?? 0.7;
  const ageDays = deal.discovered_at
    ? Math.max(0, (Date.now() - new Date(deal.discovered_at).getTime()) / 86400000)
    : 30;
  const freshness = Math.max(0.2, 1 - ageDays / 60);
  return (cityMatch * 2 + countryMatch + tagOverlap * 0.5) * conf * freshness;
}

export const suggestDealsForVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ videoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: video, error: vErr } = await supabaseAdmin
      .from("videos")
      .select("id,creator_id,city,country,destination,activity_tags")
      .eq("id", data.videoId)
      .maybeSingle();
    if (vErr || !video) throw new Error("Video not found");
    if (video.creator_id !== context.userId) throw new Error("Forbidden");

    const tags = (video.activity_tags ?? []) as string[];
    const place = video.city || video.destination || video.country;

    async function loadMatches(): Promise<SuggestedDeal[]> {
      let q = supabaseAdmin
        .from("deals")
        .select("id,title,description,city,country,price_cents,currency,affiliate_network,ai_confidence,image_url,discovered_at")
        .eq("status", "approved")
        .eq("is_active", true)
        .limit(50);
      if (video.city) q = q.ilike("city", video.city);
      else if (video.country) q = q.ilike("country", video.country);
      const { data: rows } = await q;
      const list = (rows ?? []).map((d) => {
        const overlap = tags.filter((t) => (d.description ?? "").toLowerCase().includes(t)).length;
        return {
          ...d,
          score: scoreDeal(d, { city: video.city, country: video.country, tags }, overlap),
        } as SuggestedDeal;
      });
      list.sort((a, b) => b.score - a.score);
      return list.slice(0, 5);
    }

    let suggestions = await loadMatches();
    if (suggestions.length < 3 && place) {
      try {
        await discoverForVideo({
          city: video.city,
          country: video.country,
          destination: video.destination,
          tags,
        });
        suggestions = await loadMatches();
      } catch (e) {
        // live discovery is best-effort
        console.error("discoverForVideo failed", e);
      }
    }

    // Cache top picks for instant re-open (best-effort).
    if (suggestions.length) {
      await supabaseAdmin.from("video_deal_suggestions").delete().eq("video_id", video.id);
      await supabaseAdmin.from("video_deal_suggestions").insert(
        suggestions.map((s) => ({ video_id: video.id, deal_id: s.id, score: s.score })),
      );
    }

    return { deals: suggestions };
  });

export const attachDealToVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ videoId: z.string().uuid(), dealId: z.string().uuid(), position: z.number().int().min(0).max(20).default(0) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: v } = await supabaseAdmin
      .from("videos")
      .select("creator_id")
      .eq("id", data.videoId)
      .maybeSingle();
    if (!v || v.creator_id !== context.userId) throw new Error("Forbidden");
    const { error } = await supabaseAdmin
      .from("video_deals")
      .upsert(
        { video_id: data.videoId, deal_id: data.dealId, position: data.position, attached_by: context.userId },
        { onConflict: "video_id,deal_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const detachDealFromVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ videoId: z.string().uuid(), dealId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: v } = await supabaseAdmin
      .from("videos")
      .select("creator_id")
      .eq("id", data.videoId)
      .maybeSingle();
    if (!v || v.creator_id !== context.userId) throw new Error("Forbidden");
    const { error } = await supabaseAdmin
      .from("video_deals")
      .delete()
      .eq("video_id", data.videoId)
      .eq("deal_id", data.dealId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listVideoDeals = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ videoId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("video_deals")
      .select("deal_id,position,deal:deals(id,title,price_cents,currency,image_url,affiliate_network,city,country)")
      .eq("video_id", data.videoId)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    const deals = (rows ?? [])
      .map((r: any) => r.deal)
      .filter(Boolean);
    return { deals };
  });

export const attachDealsBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ videoId: z.string().uuid(), dealIds: z.array(z.string().uuid()).max(10) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: v } = await supabaseAdmin
      .from("videos")
      .select("creator_id")
      .eq("id", data.videoId)
      .maybeSingle();
    if (!v || v.creator_id !== context.userId) throw new Error("Forbidden");
    if (!data.dealIds.length) return { ok: true, count: 0 };
    const rows = data.dealIds.map((dealId, i) => ({
      video_id: data.videoId,
      deal_id: dealId,
      position: i,
      attached_by: context.userId,
    }));
    const { error } = await supabaseAdmin
      .from("video_deals")
      .upsert(rows, { onConflict: "video_id,deal_id" });
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });