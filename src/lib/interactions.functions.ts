import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VideoIdInput = z.object({ videoId: z.string().uuid() });

export const toggleLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VideoIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("likes").select("video_id").eq("user_id", userId).eq("video_id", data.videoId).maybeSingle();
    if (existing) {
      const { error } = await supabase.from("likes").delete().eq("user_id", userId).eq("video_id", data.videoId);
      if (error) throw new Error(error.message);
      return { liked: false };
    }
    const { error } = await supabase.from("likes").insert({ user_id: userId, video_id: data.videoId });
    if (error) throw new Error(error.message);
    return { liked: true };
  });

export const toggleSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VideoIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("saves").select("video_id").eq("user_id", userId).eq("video_id", data.videoId).maybeSingle();
    if (existing) {
      const { error } = await supabase.from("saves").delete().eq("user_id", userId).eq("video_id", data.videoId);
      if (error) throw new Error(error.message);
      return { saved: false };
    }
    const { error } = await supabase.from("saves").insert({ user_id: userId, video_id: data.videoId });
    if (error) throw new Error(error.message);
    return { saved: true };
  });

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ creatorId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (userId === data.creatorId) throw new Error("Cannot follow yourself");
    const { data: existing } = await supabase
      .from("follows").select("creator_id").eq("follower_id", userId).eq("creator_id", data.creatorId).maybeSingle();
    if (existing) {
      const { error } = await supabase.from("follows").delete().eq("follower_id", userId).eq("creator_id", data.creatorId);
      if (error) throw new Error(error.message);
      return { following: false };
    }
    const { error } = await supabase.from("follows").insert({ follower_id: userId, creator_id: data.creatorId });
    if (error) throw new Error(error.message);
    return { following: true };
  });