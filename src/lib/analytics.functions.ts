import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CreatorAnalytics = {
  totals: {
    videos: number;
    views: number;
    likes: number;
    saves: number;
    comments: number;
    followers: number;
    watchMs: number;
  };
  daily: Array<{ date: string; views: number }>;
  topVideos: Array<{
    id: string;
    title: string;
    thumbnail_url: string | null;
    view_count: number;
    like_count: number;
    save_count: number;
    comment_count: number;
  }>;
  recentFollowers: Array<{
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
  }>;
};

export const getCreatorAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CreatorAnalytics> => {
    const { userId } = context;

    const { data: videos } = await supabaseAdmin
      .from("videos")
      .select("id,title,thumbnail_url,view_count,like_count,save_count,comment_count")
      .eq("creator_id", userId);
    const list = videos ?? [];
    const videoIds = list.map((v) => v.id);

    const totals = list.reduce(
      (acc, v) => {
        acc.views += v.view_count ?? 0;
        acc.likes += v.like_count ?? 0;
        acc.saves += v.save_count ?? 0;
        acc.comments += v.comment_count ?? 0;
        return acc;
      },
      { views: 0, likes: 0, saves: 0, comments: 0 },
    );

    const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
    const [{ count: followerCount }, viewsRes, followersRes] = await Promise.all([
      supabaseAdmin.from("follows").select("follower_id", { count: "exact", head: true }).eq("creator_id", userId),
      videoIds.length
        ? supabaseAdmin.from("video_views").select("created_at,watch_ms").in("video_id", videoIds).gte("created_at", since).limit(5000)
        : Promise.resolve({ data: [] as Array<{ created_at: string; watch_ms: number }> }),
      supabaseAdmin
        .from("follows")
        .select("follower_id,created_at,profiles!follows_follower_id_fkey(id,username,display_name,avatar_url)")
        .eq("creator_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const rawViews = ((viewsRes as { data: Array<{ created_at: string; watch_ms: number }> | null }).data) ?? [];
    const watchMs = rawViews.reduce((s, r) => s + (r.watch_ms ?? 0), 0);
    const buckets = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const r of rawViews) {
      const key = r.created_at.slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    const daily = Array.from(buckets.entries()).map(([date, views]) => ({ date, views }));

    const topVideos = [...list]
      .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
      .slice(0, 5);

    const recentFollowers = ((followersRes.data ?? []) as any[])
      .map((r) => {
        const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        return p ? { ...p, created_at: r.created_at } : null;
      })
      .filter(Boolean) as CreatorAnalytics["recentFollowers"];

    return {
      totals: {
        videos: list.length,
        ...totals,
        followers: followerCount ?? 0,
        watchMs,
      },
      daily,
      topVideos,
      recentFollowers,
    };
  });