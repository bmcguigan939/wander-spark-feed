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

export const getProfileByUsername = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ username: z.string().min(1).max(64) }).parse(input)
  )
  .handler(async ({ data }) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id,username,display_name,bio,avatar_url,created_at")
      .eq("username", data.username)
      .maybeSingle();
    if (!profile) return { profile: null, videos: [], followerCount: 0, followingCount: 0 };

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

    return {
      profile,
      videos: videosRes.data ?? [],
      followerCount: followers.count ?? 0,
      followingCount: following.count ?? 0,
    };
  });
