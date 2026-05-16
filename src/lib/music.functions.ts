import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  cover_url: string | null;
  duration_sec: number | null;
};

export const listMusicTracks = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ q: z.string().max(120).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("music_tracks")
      .select("id,title,artist,audio_url,cover_url,duration_sec")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(60);
    if (data.q && data.q.trim()) {
      const term = `%${data.q.trim()}%`;
      q = q.or(`title.ilike.${term},artist.ilike.${term}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { tracks: (rows ?? []) as MusicTrack[] };
  });

export const getMusicTrack = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: track } = await supabaseAdmin
      .from("music_tracks")
      .select("id,title,artist,audio_url,cover_url,duration_sec,source,license")
      .eq("id", data.id)
      .maybeSingle();
    if (!track) return { track: null, videos: [], usageCount: 0 };
    const { data: videos, count } = await supabaseAdmin
      .from("videos")
      .select(
        "id,title,thumbnail_url,mux_playback_id,like_count,creator:profiles!videos_creator_id_fkey(id,username,display_name,avatar_url)",
        { count: "exact" },
      )
      .eq("music_track_id", data.id)
      .eq("status", "ready")
      .eq("is_draft", false)
      .or("scheduled_at.is.null,scheduled_at.lte.now()")
      .eq("is_hidden", false)
      .order("like_count", { ascending: false })
      .limit(60);
    return { track, videos: videos ?? [], usageCount: count ?? 0 };
  });

export const attachMusicToVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        videoId: z.string().uuid(),
        trackId: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("videos")
      .update({ music_track_id: data.trackId })
      .eq("id", data.videoId)
      .eq("creator_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });