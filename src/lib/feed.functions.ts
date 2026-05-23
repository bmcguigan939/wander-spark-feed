import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { optionalSupabaseAuth } from "@/lib/optional-auth";
import { embedText, embedVideo, embedDeal } from "@/lib/ai.functions";

export type FeedVideo = {
  id: string;
  title: string;
  description: string | null;
  mux_playback_id: string | null;
  thumbnail_url: string | null;
  destination: string | null;
  country: string | null;
  city: string | null;
  lat?: number | null;
  lng?: number | null;
  activity_tags: string[];
  budget_tag: string | null;
  like_count: number;
  save_count: number;
  view_count: number;
  comment_count: number;
  created_at: string;
  bumped_at?: string | null;
  source_platform?: string | null;
  source_url?: string | null;
  embed_mode?: string | null;
  cross_links?: Array<{ platform: string; url: string }>;
  creator: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  matchedDeal?: {
    id: string;
    title: string;
    discount_label: string | null;
    image_url: string | null;
  } | null;
  matchedBusiness?: {
    id: string;
    name: string;
    website_url: string | null;
    logo_url: string | null;
    city: string | null;
    country: string | null;
  } | null;
  music?: {
    id: string;
    title: string;
    artist: string;
    cover_url: string | null;
  } | null;
};

async function fetchFeedRows(
  limit: number,
  offset: number,
  creatorIds?: string[],
): Promise<FeedVideo[]> {
  let q = supabaseAdmin
    .from("videos")
    .select(
      "id,creator_id,title,description,mux_playback_id,thumbnail_url,destination,country,city,lat,lng,activity_tags,budget_tag,like_count,save_count,view_count,comment_count,created_at,bumped_at,source_platform,source_url,embed_mode,cross_links,creator:profiles!videos_creator_id_fkey(id,username,display_name,avatar_url),music:music_tracks!videos_music_track_id_fkey(id,title,artist,cover_url)"
    )
    .eq("status", "ready")
    .eq("is_draft", false)
    .eq("is_hidden", false)
    .or("scheduled_at.is.null,scheduled_at.lte.now()");
  if (creatorIds) {
    if (creatorIds.length === 0) return [];
    q = q.in("creator_id", creatorIds);
  }
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  const videos = (data ?? []) as unknown as FeedVideo[];
  await attachMatchedDeals(videos);
  await attachMatchedBusiness(videos);
  await applySocialVisibility(videos);
  return videos;
}

function locKey(country?: string | null, city?: string | null) {
  return `${(country ?? "").trim().toLowerCase()}|${(city ?? "").trim().toLowerCase()}`;
}

async function applySocialVisibility(videos: FeedVideo[]) {
  // Creator-level toggle: when show_social_links=false, strip cross_links so
  // the platform icons don't render on any of their videos.
  const creatorIds = Array.from(
    new Set(videos.map((v: any) => v.creator_id).filter(Boolean) as string[]),
  );
  if (creatorIds.length === 0) return;
  const { data: rows } = await supabaseAdmin
    .from("profile_socials")
    .select("user_id,show_social_links")
    .in("user_id", creatorIds);
  const hidden = new Set(
    (rows ?? [])
      .filter((r: any) => r.show_social_links === false)
      .map((r: any) => r.user_id),
  );
  if (!hidden.size) return;
  for (const v of videos as any[]) {
    if (hidden.has(v.creator_id)) v.cross_links = [];
  }
}

async function attachMatchedDeals(videos: FeedVideo[]) {
  await _attachMatchedDealsImpl(videos);
}

async function attachMatchedBusiness(videos: FeedVideo[]) {
  // Auto-surface "Book with {business}" card on every video by a creator who
  // has signed a business via invite. Does NOT replace matchedDeal — only
  // fills the gap when there's no per-video deal match.
  const creatorIds = Array.from(
    new Set(videos.map((v: any) => v.creator_id).filter(Boolean) as string[]),
  );
  if (creatorIds.length === 0) return;

  const { data: signings } = await supabaseAdmin
    .from("creator_business_signings")
    .select("creator_id,business_id,business:profiles!creator_business_signings_business_id_fkey(id,business_name,business_website_url,business_logo_url,business_city,business_country)")
    .eq("status", "active")
    .in("creator_id", creatorIds);
  if (!signings?.length) return;

  // Index per creator: list of business signings (most recent first as
  // returned). For city/country matching against the video.
  const perCreator = new Map<string, any[]>();
  for (const row of signings as any[]) {
    const b = row.business;
    if (!b || !b.business_name) continue;
    const list = perCreator.get(row.creator_id) ?? [];
    list.push(b);
    perCreator.set(row.creator_id, list);
  }

  for (const v of videos as any[]) {
    if (v.matchedDeal) continue; // real deal wins
    const list = perCreator.get(v.creator_id);
    if (!list?.length) continue;
    const vCity = (v.city ?? "").trim().toLowerCase();
    const vCountry = (v.country ?? "").trim().toLowerCase();
    // city-match > country-match > any
    let pick =
      list.find(
        (b) =>
          vCity &&
          (b.business_city ?? "").trim().toLowerCase() === vCity,
      ) ||
      list.find(
        (b) =>
          vCountry &&
          (b.business_country ?? "").trim().toLowerCase() === vCountry,
      ) ||
      list[0];
    v.matchedBusiness = {
      id: pick.id,
      name: pick.business_name,
      website_url: pick.business_website_url ?? null,
      logo_url: pick.business_logo_url ?? null,
      city: pick.business_city ?? null,
      country: pick.business_country ?? null,
    };
  }
}

async function _attachMatchedDealsImpl(videos: FeedVideo[]) {
  // CONTRACT GATING: a video may only surface deals where THAT video's creator
  // has an approved deal_applications row for the deal. If none exists, the
  // video shows no deal CTA (matches the "Hide deals entirely" product rule).
  const creatorIds = Array.from(
    new Set(videos.map((v: any) => v.creator_id).filter(Boolean) as string[]),
  );
  if (creatorIds.length === 0) return;

  const { data: apps } = await supabaseAdmin
    .from("deal_applications")
    .select("creator_id,deal:deals!inner(id,title,discount_label,image_url,country,city,is_active,starts_at,ends_at,status)")
    .eq("status", "approved")
    .in("creator_id", creatorIds);
  if (!apps?.length) return;

  // Index approved deals per creator, then per city/country.
  const perCreator = new Map<
    string,
    { byCityCountry: Map<string, any>; byCountry: Map<string, any> }
  >();
  for (const row of apps as any[]) {
    const d = row.deal;
    if (!d) continue;
    if (d.is_active !== true) continue;
    if (d.status !== "approved") continue;
    if (d.starts_at && new Date(d.starts_at).getTime() > Date.now()) continue;
    if (d.ends_at && new Date(d.ends_at).getTime() < Date.now()) continue;

    let bucket = perCreator.get(row.creator_id);
    if (!bucket) {
      bucket = { byCityCountry: new Map(), byCountry: new Map() };
      perCreator.set(row.creator_id, bucket);
    }
    if (d.city) {
      const ck = locKey(d.country, d.city);
      if (!bucket.byCityCountry.has(ck)) bucket.byCityCountry.set(ck, d);
    }
    const cck = locKey(d.country, null);
    if (!bucket.byCountry.has(cck)) bucket.byCountry.set(cck, d);
  }

  for (const v of videos as any[]) {
    const bucket = perCreator.get(v.creator_id);
    if (!bucket || !v.country) continue;
    const match =
      (v.city && bucket.byCityCountry.get(locKey(v.country, v.city))) ||
      bucket.byCountry.get(locKey(v.country, null));
    if (match) {
      v.matchedDeal = {
        id: match.id,
        title: match.title,
        discount_label: match.discount_label,
        image_url: match.image_url,
      };
    }
  }
}

export const getFeed = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ limit: z.number().min(1).max(50).default(20), offset: z.number().min(0).default(0) }).parse(input)
  )
  .handler(async ({ data }) => {
    return { videos: await fetchFeedRows(data.limit, data.offset) };
  });

const idsInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

export const getVideosByIds = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => idsInput.parse(i))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("videos")
      .select(
        "id,creator_id,title,description,mux_playback_id,thumbnail_url,destination,country,city,lat,lng,activity_tags,budget_tag,like_count,save_count,view_count,comment_count,created_at,bumped_at,source_platform,source_url,embed_mode,cross_links,creator:profiles!videos_creator_id_fkey(id,username,display_name,avatar_url),music:music_tracks!videos_music_track_id_fkey(id,title,artist,cover_url)"
      )
      .in("id", data.ids)
      .eq("status", "ready")
      .eq("is_draft", false)
      .eq("is_hidden", false);
    if (error) throw new Error(error.message);
    const byId = new Map<string, FeedVideo>(
      ((rows ?? []) as unknown as FeedVideo[]).map((v) => [v.id, v]),
    );
    const videos = data.ids.map((id) => byId.get(id)).filter(Boolean) as FeedVideo[];
    await attachMatchedDeals(videos);
    await applySocialVisibility(videos);
    return { videos };
  });

// ---------- For-You ranking ----------

type RankRow = FeedVideo & { creator_id?: string };

function hoursSince(iso: string) {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 36e5);
}

function effectiveTime(v: { created_at: string; bumped_at?: string | null }): string {
  if (v.bumped_at && new Date(v.bumped_at).getTime() > new Date(v.created_at).getTime()) {
    return v.bumped_at;
  }
  return v.created_at;
}

type SearchBudget = "$" | "$$" | "$$$";

function budgetValues(budget?: SearchBudget) {
  if (!budget) return null;
  if (budget === "$") return ["$", "budget"];
  if (budget === "$$") return ["$$", "mid", "mid-range"];
  return ["$$$", "luxury"];
}

function applyBudgetFilter<T>(q: T, budget?: SearchBudget): T {
  const values = budgetValues(budget);
  return values ? (q as any).in("budget_tag", values) : q;
}

function isFreshUpload(
  v: Pick<FeedVideo, "mux_playback_id" | "source_platform" | "created_at" | "bumped_at">,
) {
  // Creator uploads (Mux native OR cross-posted link cards like
  // TikTok/Instagram) from the last 7 days get a surfacing boost so
  // brand-new content isn't buried by older seeded engagement-heavy rows.
  const isCreatorUpload = !!v.mux_playback_id || !!v.source_platform;
  return isCreatorUpload && hoursSince(effectiveTime(v)) <= 24 * 7;
}

function scoreVideo(
  v: RankRow,
  ctx: {
    followedCreatorIds: Set<string>;
    tagAffinity: Map<string, number>;
    countryAffinity: Map<string, number>;
    seenVideoIds: Set<string>;
    semanticAffinity: Map<string, number>;
  },
) {
  if (ctx.seenVideoIds.has(v.id)) return -Infinity;
  const age = hoursSince(effectiveTime(v));
  // freshness decays: 1.0 at 0h, ~0.5 at 48h, ~0.2 at 168h
  const freshness = 1 / (1 + age / 48);
  const engagement =
    Math.log1p(v.like_count) * 1.0 +
    Math.log1p(v.save_count) * 1.4 +
    Math.log1p(v.comment_count) * 1.1 +
    Math.log1p(v.view_count) * 0.25;
  const creatorBoost =
    v.creator_id && ctx.followedCreatorIds.has(v.creator_id) ? 3.5 : 0;
  const tagBoost = (v.activity_tags ?? []).reduce(
    (sum, t) => sum + (ctx.tagAffinity.get(t.toLowerCase()) ?? 0),
    0,
  );
  const countryBoost = v.country
    ? (ctx.countryAffinity.get(v.country.trim().toLowerCase()) ?? 0)
    : 0;
  // Semantic affinity: cosine sim (0..1) against viewer's taste vector.
  const semantic = ctx.semanticAffinity.get(v.id) ?? 0;
  const newUploadBoost = isFreshUpload(v) ? 18 : 0;
  const jitter = Math.random() * 0.4; // small variety
  return (
    freshness * 4 + engagement * 0.7 + creatorBoost + tagBoost * 1.5 + countryBoost + semantic * 5 + newUploadBoost + jitter
  );
}

async function buildAffinity(userId: string) {
  const [likesRes, savesRes, followsRes] = await Promise.all([
    supabaseAdmin.from("likes").select("video_id,created_at").eq("user_id", userId).limit(200),
    supabaseAdmin.from("saves").select("video_id,created_at").eq("user_id", userId).limit(200),
    supabaseAdmin.from("follows").select("creator_id").eq("follower_id", userId),
  ]);
  // Track the latest interaction time per video so we can re-admit videos
  // that have been bumped (edited / new deals) since the user last engaged.
  const lastInteractionAt = new Map<string, number>();
  for (const r of [...(likesRes.data ?? []), ...(savesRes.data ?? [])] as any[]) {
    const t = r.created_at ? new Date(r.created_at).getTime() : 0;
    const prev = lastInteractionAt.get(r.video_id) ?? 0;
    if (t > prev) lastInteractionAt.set(r.video_id, t);
  }
  const interactedIds = Array.from(lastInteractionAt.keys());
  const tagAffinity = new Map<string, number>();
  const countryAffinity = new Map<string, number>();
  const seenVideoIds = new Set<string>();
  let tasteVector: number[] | null = null;
  if (interactedIds.length) {
    const { data: vids } = await supabaseAdmin
      .from("videos")
      .select("id,activity_tags,country,embedding,created_at,bumped_at")
      .in("id", interactedIds.slice(0, 50));
    const vecs: number[][] = [];
    for (const v of vids ?? []) {
      for (const t of ((v as any).activity_tags ?? []) as string[]) {
        const k = t?.trim().toLowerCase();
        if (k) tagAffinity.set(k, (tagAffinity.get(k) ?? 0) + 1);
      }
      const c = (v as any).country?.trim().toLowerCase();
      if (c) countryAffinity.set(c, (countryAffinity.get(c) ?? 0) + 1);
      // Only mark as "seen" (filter out of feed) if the user's last
      // interaction was AFTER the video's latest bump. If a creator has
      // edited the video or attached new deals since, let it resurface.
      const vid = (v as any).id as string;
      const eff = effectiveTime(v as any);
      const interactedAt = lastInteractionAt.get(vid) ?? 0;
      if (interactedAt >= new Date(eff).getTime()) seenVideoIds.add(vid);
      const emb = (v as any).embedding;
      if (emb) {
        // pgvector returns as string like "[0.1,0.2,...]" via PostgREST.
        const parsed = typeof emb === "string" ? JSON.parse(emb) : emb;
        if (Array.isArray(parsed) && parsed.length === 1536) vecs.push(parsed as number[]);
      }
    }
    if (vecs.length > 0) {
      const sum = new Array(1536).fill(0);
      for (const v of vecs) for (let i = 0; i < 1536; i++) sum[i] += v[i];
      // L2-normalize (cosine-friendly)
      let norm = 0;
      for (let i = 0; i < 1536; i++) { sum[i] /= vecs.length; norm += sum[i] * sum[i]; }
      norm = Math.sqrt(norm) || 1;
      for (let i = 0; i < 1536; i++) sum[i] /= norm;
      tasteVector = sum;
    }
  }
  const followedCreatorIds = new Set<string>(
    (followsRes.data ?? []).map((r: any) => r.creator_id as string),
  );
  return { followedCreatorIds, tagAffinity, countryAffinity, seenVideoIds, tasteVector };
}

export const getForYouFeed = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      limit: z.number().min(1).max(50).default(20),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId ?? null;

    // Candidate pool: most recent ready, non-hidden videos
    const POOL = 150;
    const baseSelect =
        "id,creator_id,title,description,mux_playback_id,thumbnail_url,destination,country,city,lat,lng,activity_tags,budget_tag,like_count,save_count,view_count,comment_count,created_at,bumped_at,source_platform,source_url,embed_mode,cross_links,creator:profiles!videos_creator_id_fkey(id,username,display_name,avatar_url),music:music_tracks!videos_music_track_id_fkey(id,title,artist,cover_url)"
    ;
    const [freshRes, bumpedRes] = await Promise.all([
      supabaseAdmin
        .from("videos")
        .select(baseSelect)
        .eq("status", "ready")
        .eq("is_draft", false)
        .or("scheduled_at.is.null,scheduled_at.lte.now()")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(120),
      supabaseAdmin
        .from("videos")
        .select(baseSelect)
        .eq("status", "ready")
        .eq("is_draft", false)
        .or("scheduled_at.is.null,scheduled_at.lte.now()")
        .eq("is_hidden", false)
        .not("bumped_at", "is", null)
        .order("bumped_at", { ascending: false })
        .limit(60),
    ]);
    if (freshRes.error) throw new Error(freshRes.error.message);
    if (bumpedRes.error) throw new Error(bumpedRes.error.message);
    const seenPoolIds = new Set<string>();
    const pool: RankRow[] = [];
    for (const r of [...(freshRes.data ?? []), ...(bumpedRes.data ?? [])] as unknown as RankRow[]) {
      if (seenPoolIds.has(r.id)) continue;
      seenPoolIds.add(r.id);
      pool.push(r);
    }

    const affinity = userId
      ? await buildAffinity(userId)
      : {
          followedCreatorIds: new Set<string>(),
          tagAffinity: new Map<string, number>(),
          countryAffinity: new Map<string, number>(),
          seenVideoIds: new Set<string>(),
          tasteVector: null as number[] | null,
        };

    // Semantic candidates: pull top matches against viewer's taste vector
    // and merge into the pool so older-but-relevant videos can surface.
    const semanticAffinity = new Map<string, number>();
    if (affinity.tasteVector) {
      const { data: hits } = await supabaseAdmin.rpc("match_videos", {
        query_embedding: `[${affinity.tasteVector.join(",")}]` as any,
        match_count: 60,
        min_similarity: 0.2,
      });
      const havePoolIds = new Set(pool.map((p) => p.id));
      const extraIds: string[] = [];
      for (const h of (hits ?? []) as Array<{ id: string; similarity: number }>) {
        semanticAffinity.set(h.id, h.similarity);
        if (!havePoolIds.has(h.id)) extraIds.push(h.id);
      }
      if (extraIds.length > 0) {
        const { data: extras } = await supabaseAdmin
          .from("videos")
          .select(baseSelect)
          .in("id", extraIds.slice(0, 40));
        for (const r of (extras ?? []) as unknown as RankRow[]) pool.push(r);
      }
    }

    const ctx = { ...affinity, semanticAffinity };

    const ranked = pool
      .map((v) => ({ v, s: scoreVideo(v, ctx) }))
      .filter((x) => Number.isFinite(x.s))
      .sort((a, b) => b.s - a.s)
      .slice(0, data.limit)
      .map((x) => x.v);

    await attachMatchedDeals(ranked);
    return { videos: ranked };
  });

export const getFollowingFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ limit: z.number().min(1).max(50).default(20), offset: z.number().min(0).default(0) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: follows } = await supabaseAdmin
      .from("follows").select("creator_id").eq("follower_id", userId);
    const ids = (follows ?? []).map((r: any) => r.creator_id as string);
    return { videos: await fetchFeedRows(data.limit, data.offset, ids) };
  });

export const searchAll = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ q: z.string().min(1).max(200) }).parse(input)
  )
  .handler(async ({ data }) => {
    const q = data.q.trim().replace(/[^\w\s]/g, " ");
    const tsQuery = q.split(/\s+/).filter(Boolean).map((t) => `${t}:*`).join(" & ");

    const [videosRes, creatorsRes] = await Promise.all([
      supabaseAdmin
        .from("videos")
        .select(
          "id,title,mux_playback_id,thumbnail_url,destination,country,activity_tags,like_count,source_platform,source_url,embed_mode,cross_links,creator:profiles!videos_creator_id_fkey(id,username,display_name,avatar_url)"
        )
        .eq("status", "ready")
        .eq("is_draft", false)
        .eq("is_hidden", false)
        .or("scheduled_at.is.null,scheduled_at.lte.now()")
        .textSearch("search_tsv", tsQuery, { config: "simple" })
        .limit(30),
      supabaseAdmin
        .from("profiles")
        .select("id,username,display_name,avatar_url,bio")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%,bio.ilike.%${q}%`)
        .limit(15),
    ]);

    return {
      videos: (videosRes.data ?? []) as unknown as Array<
        Pick<FeedVideo, "id" | "title" | "mux_playback_id" | "thumbnail_url" | "destination" | "country" | "activity_tags" | "like_count" | "creator" | "source_platform" | "source_url" | "embed_mode">
      >,
      creators: creatorsRes.data ?? [],
    };
  });

export type SearchFacets = {
  countries: Array<{ value: string; count: number }>;
  tags: Array<{ value: string; count: number }>;
};

let facetsCache: { at: number; facets: SearchFacets } | null = null;

async function loadFacets(): Promise<SearchFacets> {
  if (facetsCache && Date.now() - facetsCache.at < 60_000) return facetsCache.facets;
  const { data } = await supabaseAdmin
    .from("videos")
    .select("country,activity_tags")
    .eq("status", "ready")
    .eq("is_draft", false)
    .eq("is_hidden", false)
    .or("scheduled_at.is.null,scheduled_at.lte.now()")
    .limit(2000);
  const countryMap = new Map<string, number>();
  const tagMap = new Map<string, number>();
  for (const row of data ?? []) {
    const c = (row as any).country?.trim();
    if (c) countryMap.set(c, (countryMap.get(c) ?? 0) + 1);
    for (const t of ((row as any).activity_tags ?? []) as string[]) {
      const v = t?.trim().toLowerCase();
      if (v) tagMap.set(v, (tagMap.get(v) ?? 0) + 1);
    }
  }
  const facets: SearchFacets = {
    countries: [...countryMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([value, count]) => ({ value, count })),
    tags: [...tagMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([value, count]) => ({ value, count })),
  };
  facetsCache = { at: Date.now(), facets };
  return facets;
}

export const getSearchFacets = createServerFn({ method: "GET" }).handler(async () => {
  return await loadFacets();
});

export const searchVideos = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        q: z.string().max(200).optional(),
        country: z.string().max(80).optional(),
        tags: z.array(z.string().max(40)).max(8).optional(),
        budget: z.enum(["$", "$$", "$$$"]).optional(),
        sort: z.enum(["new", "popular"]).default("new"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // Hybrid search: when a text query is present, fetch both keyword (tsv)
    // and semantic (pgvector) candidates and merge with weighted scoring.
    const hasText = !!(data.q && data.q.trim());
    if (hasText) {
      const qText = data.q!.trim();
      const clean = qText.replace(/[^\w\s]/g, " ");
      const tsQuery = clean.split(/\s+/).filter(Boolean).map((t) => `${t}:*`).join(" & ");

      // Run keyword + semantic in parallel.
      const [kwRes, semIds] = await Promise.all([
        (async () => {
          let kw = supabaseAdmin
            .from("videos")
            .select(
              "id,title,thumbnail_url,mux_playback_id,source_platform,source_url,embed_mode,cross_links,destination,country,city,lat,lng,activity_tags,budget_tag,like_count,view_count,created_at,creator:profiles!videos_creator_id_fkey(id,username,display_name,avatar_url)",
            )
            .eq("status", "ready")
            .eq("is_draft", false)
            .eq("is_hidden", false)
            .or("scheduled_at.is.null,scheduled_at.lte.now()");
          if (data.country) kw = kw.eq("country", data.country);
          kw = applyBudgetFilter(kw, data.budget);
          if (data.tags && data.tags.length) kw = kw.contains("activity_tags", data.tags);
          if (tsQuery) kw = kw.textSearch("search_tsv", tsQuery, { config: "simple" });
          return await kw.limit(60);
        })(),
        (async () => {
          const vec = await embedText(qText);
          if (!vec) return [] as Array<{ id: string; similarity: number }>;
          const { data: hits } = await supabaseAdmin.rpc("match_videos", {
            query_embedding: `[${vec.join(",")}]` as any,
            match_count: 60,
            min_similarity: 0.25,
          });
          return (hits ?? []) as Array<{ id: string; similarity: number }>;
        })(),
      ]);

      const kwRows = (kwRes.data ?? []) as any[];
      const kwIds = new Set(kwRows.map((r) => r.id as string));

      // Fetch metadata for semantic-only hits, honouring filters.
      const newIds = semIds.map((s) => s.id).filter((id) => !kwIds.has(id));
      let extraRows: any[] = [];
      if (newIds.length) {
        let extra = supabaseAdmin
          .from("videos")
          .select(
            "id,title,thumbnail_url,mux_playback_id,source_platform,source_url,embed_mode,cross_links,destination,country,city,lat,lng,activity_tags,budget_tag,like_count,view_count,created_at,creator:profiles!videos_creator_id_fkey(id,username,display_name,avatar_url)",
          )
          .in("id", newIds)
          .eq("status", "ready")
          .eq("is_draft", false)
          .eq("is_hidden", false)
          .or("scheduled_at.is.null,scheduled_at.lte.now()");
        if (data.country) extra = extra.eq("country", data.country);
        extra = applyBudgetFilter(extra, data.budget);
        if (data.tags && data.tags.length) extra = extra.contains("activity_tags", data.tags);
        const { data: extraData } = await extra;
        extraRows = (extraData ?? []) as any[];
      }

      const simById = new Map(semIds.map((s) => [s.id, s.similarity]));
      const merged = [...kwRows, ...extraRows];
      const ranked = merged
        .map((r) => {
          const sim = simById.get(r.id) ?? 0;
          const kw = kwIds.has(r.id) ? 1 : 0;
          const pop = Math.log1p(r.like_count ?? 0) * 0.15;
          // Weight: keyword match is strong, semantic is supportive, then engagement.
          const score =
            data.sort === "popular"
              ? pop * 1.5 + sim * 1.2 + kw * 0.6
              : kw * 1.0 + sim * 1.5 + pop;
          return { r, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 60)
        .map((x) => x.r);

      return { videos: ranked as unknown as FeedVideo[] };
    }

    // No text query → plain filtered listing.
    let q = supabaseAdmin
      .from("videos")
      .select(
        "id,title,thumbnail_url,mux_playback_id,source_platform,source_url,embed_mode,cross_links,destination,country,city,lat,lng,activity_tags,budget_tag,like_count,view_count,created_at,creator:profiles!videos_creator_id_fkey(id,username,display_name,avatar_url)",
      )
      .eq("status", "ready")
      .eq("is_draft", false)
      .eq("is_hidden", false)
      .or("scheduled_at.is.null,scheduled_at.lte.now()");

    if (data.country) q = q.eq("country", data.country);
    q = applyBudgetFilter(q, data.budget);
    if (data.tags && data.tags.length) q = q.contains("activity_tags", data.tags);

    q =
      data.sort === "popular"
        ? q.order("like_count", { ascending: false }).order("created_at", { ascending: false })
        : q.order("created_at", { ascending: false });

    const { data: rows, error } = await q.limit(60);
    if (error) throw new Error(error.message);
    return { videos: (rows ?? []) as unknown as FeedVideo[] };
  });

// ---------- Backfill: admin-only ----------

export const backfillEmbeddings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ kind: z.enum(["videos", "deals"]), limit: z.number().min(1).max(100).default(25) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) throw new Error("Forbidden");

    if (data.kind === "videos") {
      const { data: rows } = await supabaseAdmin
        .from("videos")
        .select("id")
        .is("embedding", null)
        .eq("status", "ready")
        .eq("is_hidden", false)
        .limit(data.limit);
      let ok = 0;
      for (const r of rows ?? []) {
        try { await embedVideo((r as any).id); ok += 1; } catch { /* skip */ }
      }
      return { ok, attempted: rows?.length ?? 0 };
    } else {
      const { data: rows } = await supabaseAdmin
        .from("deals")
        .select("id")
        .is("embedding", null)
        .eq("is_active", true)
        .limit(data.limit);
      let ok = 0;
      for (const r of rows ?? []) {
        try { await embedDeal((r as any).id); ok += 1; } catch { /* skip */ }
      }
      return { ok, attempted: rows?.length ?? 0 };
    }
  });

export const getProfileByUsername = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({
      username: z.string().min(1).max(64),
      viewerId: z.string().uuid().nullable().optional(),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id,username,display_name,bio,avatar_url,created_at,is_verified,verified_at")
      .eq("username", data.username)
      .maybeSingle();
    if (!profile) return { profile: null, videos: [], followerCount: 0, followingCount: 0, isFollowing: false };

    const [videosRes, followers, following] = await Promise.all([
      supabaseAdmin
        .from("videos")
        .select("id,title,thumbnail_url,mux_playback_id,like_count,view_count,created_at")
        .eq("creator_id", profile.id)
        .eq("status", "ready")
    .eq("is_draft", false)
    .or("scheduled_at.is.null,scheduled_at.lte.now()")
        .order("created_at", { ascending: false })
        .limit(60),
      supabaseAdmin.from("follows").select("follower_id", { count: "exact", head: true }).eq("creator_id", profile.id),
      supabaseAdmin.from("follows").select("creator_id", { count: "exact", head: true }).eq("follower_id", profile.id),
    ]);

    let isFollowing = false;
    if (data.viewerId && data.viewerId !== profile.id) {
      const { data: rel } = await supabaseAdmin
        .from("follows")
        .select("creator_id")
        .eq("follower_id", data.viewerId)
        .eq("creator_id", profile.id)
        .maybeSingle();
      isFollowing = !!rel;
    }

    return {
      profile,
      videos: videosRes.data ?? [],
      followerCount: followers.count ?? 0,
      followingCount: following.count ?? 0,
      isFollowing,
    };
  });
