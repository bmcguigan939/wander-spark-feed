import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FeedVideo = {
  id: string;
  title: string;
  description: string | null;
  mux_playback_id: string | null;
  thumbnail_url: string | null;
  destination: string | null;
  country: string | null;
  city: string | null;
  activity_tags: string[];
  budget_tag: string | null;
  like_count: number;
  save_count: number;
  view_count: number;
  comment_count: number;
  created_at: string;
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
};

async function fetchFeedRows(
  limit: number,
  offset: number,
  creatorIds?: string[],
): Promise<FeedVideo[]> {
  let q = supabaseAdmin
    .from("videos")
    .select(
      "id,title,description,mux_playback_id,thumbnail_url,destination,country,city,activity_tags,budget_tag,like_count,save_count,view_count,comment_count,created_at,creator:profiles!videos_creator_id_fkey(id,username,display_name,avatar_url)"
    )
    .eq("status", "ready");
  if (creatorIds) {
    if (creatorIds.length === 0) return [];
    q = q.in("creator_id", creatorIds);
  }
  const { data, error } = await q
    .order("like_count", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  const videos = (data ?? []) as unknown as FeedVideo[];
  await attachMatchedDeals(videos);
  return videos;
}

function locKey(country?: string | null, city?: string | null) {
  return `${(country ?? "").trim().toLowerCase()}|${(city ?? "").trim().toLowerCase()}`;
}

async function attachMatchedDeals(videos: FeedVideo[]) {
  const countries = Array.from(
    new Set(videos.map((v) => v.country?.trim()).filter(Boolean) as string[])
  );
  if (countries.length === 0) return;
  const { data: deals } = await supabaseAdmin
    .from("deals")
    .select("id,title,discount_label,image_url,country,city,created_at")
    .eq("is_active", true)
    .in("country", countries)
    .or("starts_at.is.null,starts_at.lte.now()")
    .or("ends_at.is.null,ends_at.gte.now()")
    .order("created_at", { ascending: false });
  if (!deals?.length) return;
  // index: prefer city+country match, fallback to country-only
  const byCityCountry = new Map<string, (typeof deals)[number]>();
  const byCountry = new Map<string, (typeof deals)[number]>();
  for (const d of deals) {
    const ck = locKey(d.country, d.city);
    if (d.city && !byCityCountry.has(ck)) byCityCountry.set(ck, d);
    const cck = locKey(d.country, null);
    if (!byCountry.has(cck)) byCountry.set(cck, d);
  }
  for (const v of videos) {
    if (!v.country) continue;
    const match =
      (v.city && byCityCountry.get(locKey(v.country, v.city))) ||
      byCountry.get(locKey(v.country, null));
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
          "id,title,mux_playback_id,thumbnail_url,destination,country,activity_tags,like_count,creator:profiles!videos_creator_id_fkey(id,username,display_name,avatar_url)"
        )
        .eq("status", "ready")
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
        Pick<FeedVideo, "id" | "title" | "mux_playback_id" | "thumbnail_url" | "destination" | "country" | "activity_tags" | "like_count" | "creator">
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
    let q = supabaseAdmin
      .from("videos")
      .select(
        "id,title,thumbnail_url,mux_playback_id,destination,country,city,activity_tags,budget_tag,like_count,view_count,created_at,creator:profiles!videos_creator_id_fkey(id,username,display_name,avatar_url)",
      )
      .eq("status", "ready");

    if (data.country) q = q.eq("country", data.country);
    if (data.budget) q = q.eq("budget_tag", data.budget);
    if (data.tags && data.tags.length) q = q.contains("activity_tags", data.tags);
    if (data.q && data.q.trim()) {
      const clean = data.q.trim().replace(/[^\w\s]/g, " ");
      const tsQuery = clean.split(/\s+/).filter(Boolean).map((t) => `${t}:*`).join(" & ");
      if (tsQuery) q = q.textSearch("search_tsv", tsQuery, { config: "simple" });
    }

    q =
      data.sort === "popular"
        ? q.order("like_count", { ascending: false }).order("created_at", { ascending: false })
        : q.order("created_at", { ascending: false });

    const { data: rows, error } = await q.limit(60);
    if (error) throw new Error(error.message);
    return { videos: (rows ?? []) as unknown as FeedVideo[] };
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
      .select("id,username,display_name,bio,avatar_url,created_at")
      .eq("username", data.username)
      .maybeSingle();
    if (!profile) return { profile: null, videos: [], followerCount: 0, followingCount: 0, isFollowing: false };

    const [videosRes, followers, following] = await Promise.all([
      supabaseAdmin
        .from("videos")
        .select("id,title,thumbnail_url,mux_playback_id,like_count,view_count,created_at")
        .eq("creator_id", profile.id)
        .eq("status", "ready")
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
