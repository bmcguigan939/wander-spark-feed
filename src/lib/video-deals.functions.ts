import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { discoverForVideo } from "./discovery.functions";
import { embedText } from "./ai.functions";

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

async function assertCreatorContracts(creatorId: string, dealIds: string[]) {
  if (!dealIds.length) return;
  const { data: apps, error } = await supabaseAdmin
    .from("deal_applications")
    .select("deal_id")
    .eq("creator_id", creatorId)
    .eq("status", "approved")
    .in("deal_id", dealIds);
  if (error) throw new Error(error.message);
  const approved = new Set((apps ?? []).map((a: any) => a.deal_id));
  const missing = dealIds.filter((id) => !approved.has(id));
  if (missing.length) {
    throw new Error(
      "You don't have an approved contract for one or more of these deals. Apply to the business first.",
    );
  }
}

export const suggestDealsForVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ videoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: video, error: vErr } = await supabaseAdmin
      .from("videos")
      .select("id,creator_id,city,country,destination,activity_tags,title,description,embedding")
      .eq("id", data.videoId)
      .maybeSingle();
    if (vErr || !video) throw new Error("Video not found");
    if (video.creator_id !== context.userId) throw new Error("Forbidden");

    const v = video!;
    const tags = (v.activity_tags ?? []) as string[];
    const place = v.city || v.destination || v.country;
    const vCity = v.city;
    const vCountry = v.country;
    const vId = v.id;

    // Build a semantic similarity map (video.embedding -> deals) when available.
    async function semanticMap(): Promise<Map<string, number>> {
      const map = new Map<string, number>();
      let qvec: number[] | null = null;
      const emb = (v as any).embedding;
      if (emb) {
        try {
          const arr = typeof emb === "string" ? (JSON.parse(emb) as number[]) : (emb as number[]);
          if (Array.isArray(arr) && arr.length > 100) qvec = arr;
        } catch {}
      }
      if (!qvec) {
        const text = [v.title, (v as any).description ?? "", place ?? "", tags.join(" ")]
          .filter(Boolean)
          .join("\n");
        qvec = await embedText(text).catch(() => null);
      }
      if (!qvec) return map;
      const { data: rows } = await (supabaseAdmin as any).rpc("match_deals", {
        query_embedding: `[${qvec.join(",")}]`,
        match_count: 25,
        min_similarity: 0.15,
        only_active: true,
      });
      for (const r of (rows ?? []) as Array<{ id: string; similarity: number }>) {
        map.set(r.id, r.similarity);
      }
      return map;
    }

    async function loadMatches(): Promise<SuggestedDeal[]> {
      const semantic = await semanticMap();
      let q = supabaseAdmin
        .from("deals")
        .select("id,title,description,city,country,price_cents,currency,affiliate_network,ai_confidence,image_url,discovered_at")
        .eq("status", "approved")
        .eq("is_active", true)
        .limit(60);
      if (vCity) q = q.ilike("city", vCity);
      else if (vCountry) q = q.ilike("country", vCountry);
      const { data: rows } = await q;
      const byId = new Map<string, any>();
      for (const d of rows ?? []) byId.set(d.id, d);
      // Pull semantic-only candidates that geo filter missed.
      const missing = Array.from(semantic.keys()).filter((id) => !byId.has(id));
      if (missing.length) {
        const { data: extras } = await supabaseAdmin
          .from("deals")
          .select("id,title,description,city,country,price_cents,currency,affiliate_network,ai_confidence,image_url,discovered_at")
          .in("id", missing.slice(0, 20))
          .eq("status", "approved")
          .eq("is_active", true);
        for (const d of extras ?? []) byId.set(d.id, d);
      }
      const list = Array.from(byId.values()).map((d) => {
        const overlap = tags.filter((t) => (d.description ?? "").toLowerCase().includes(t)).length;
        const base = scoreDeal(d, { city: vCity, country: vCountry, tags }, overlap);
        const sim = semantic.get(d.id) ?? 0;
        return {
          ...d,
          score: base + sim * 2.5,
        } as SuggestedDeal;
      });
      list.sort((a, b) => b.score - a.score);
      return list.slice(0, 6);
    }

    let suggestions = await loadMatches();
    if (suggestions.length < 3 && place) {
      try {
        await discoverForVideo({
          city: vCity,
          country: vCountry,
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
      await supabaseAdmin.from("video_deal_suggestions").delete().eq("video_id", vId);
      await supabaseAdmin.from("video_deal_suggestions").insert(
        suggestions.map((s) => ({ video_id: vId, deal_id: s.id, score: s.score })),
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
    await assertCreatorContracts(context.userId, [data.dealId]);
    const { error } = await supabaseAdmin
      .from("video_deals")
      .upsert(
        { video_id: data.videoId, deal_id: data.dealId, position: data.position, attached_by: context.userId },
        { onConflict: "video_id,deal_id" },
      );
    if (error) throw new Error(error.message);
    await (supabaseAdmin.from("videos") as any)
      .update({ bumped_at: new Date().toISOString() })
      .eq("id", data.videoId);
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
    await (supabaseAdmin.from("videos") as any)
      .update({ bumped_at: new Date().toISOString() })
      .eq("id", data.videoId);
    return { ok: true };
  });

export const listVideoDeals = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ videoId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    // Look up the video's creator so we can contract-gate visible deals.
    const { data: video } = await supabaseAdmin
      .from("videos")
      .select("creator_id")
      .eq("id", data.videoId)
      .maybeSingle();
    if (!video) return { deals: [] };

    const { data: rows, error } = await supabaseAdmin
      .from("video_deals")
      .select("deal_id,position,deal:deals(id,title,price_cents,currency,image_url,affiliate_network,city,country,deal_rating_avg,deal_rating_count)")
      .eq("video_id", data.videoId)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);

    const candidates = (rows ?? [])
      .map((r: any) => r.deal)
      .filter(Boolean);
    if (!candidates.length) return { deals: [] };

    // Only return deals where THIS video's creator has an approved contract.
    const { data: apps } = await supabaseAdmin
      .from("deal_applications")
      .select("deal_id")
      .eq("creator_id", video.creator_id)
      .eq("status", "approved")
      .in("deal_id", candidates.map((d: any) => d.id));
    const approved = new Set((apps ?? []).map((a: any) => a.deal_id));
    const deals = candidates.filter((d: any) => approved.has(d.id));
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
    await assertCreatorContracts(context.userId, data.dealIds);
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
    await (supabaseAdmin.from("videos") as any)
      .update({ bumped_at: new Date().toISOString() })
      .eq("id", data.videoId);
    return { ok: true, count: rows.length };
  });