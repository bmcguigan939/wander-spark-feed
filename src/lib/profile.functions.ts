import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: roles }, videos, liked, followers, following] = await Promise.all([
      supabase.from("profiles").select("id,username,display_name,bio,avatar_url,created_at").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("videos").select("id,title,thumbnail_url,status,mux_playback_id,like_count,created_at,ai_analyzed_at,ai_suggested_title,activity_tags").eq("creator_id", userId).order("created_at", { ascending: false }),
      supabase.from("likes").select("video_id, videos!inner(id,title,thumbnail_url,mux_playback_id,like_count,creator_id)").eq("user_id", userId).order("created_at", { ascending: false }).limit(60),
      supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("creator_id", userId),
      supabase.from("follows").select("creator_id", { count: "exact", head: true }).eq("follower_id", userId),
    ]);
    return {
      profile,
      roles: (roles ?? []).map((r) => r.role),
      videos: videos.data ?? [],
      liked: (liked.data ?? []).map((l: any) => l.videos).filter(Boolean),
      followerCount: followers.count ?? 0,
      followingCount: following.count ?? 0,
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      display_name: z.string().min(1).max(80).optional(),
      bio: z.string().max(280).optional(),
      avatar_url: z.string().url().max(500).optional(),
      username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").update(data).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });