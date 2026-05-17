import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { moderateComment } from "@/lib/moderation.functions";
import { checkRateLimit } from "@/lib/rate-limit.server";

export type CommentRow = {
  id: string;
  video_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  author: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export const listComments = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ videoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("comments")
      .select("id, video_id, user_id, parent_id, body, created_at")
      .eq("video_id", data.videoId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)));
    const profilesById = new Map<string, { username: string; display_name: string | null; avatar_url: string | null }>();
    if (userIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);
      for (const p of profs ?? []) {
        profilesById.set(p.id, { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url });
      }
    }
    const comments: CommentRow[] = (rows ?? []).map((r: any) => ({
      id: r.id,
      video_id: r.video_id,
      user_id: r.user_id,
      parent_id: r.parent_id,
      body: r.body,
      created_at: r.created_at,
      author: profilesById.get(r.user_id) ?? null,
    }));
    return { comments };
  });

export const postComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        videoId: z.string().uuid(),
        body: z.string().min(1).max(2000),
        parentId: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const allowed = await checkRateLimit("post_comment", userId, 20, 60);
    if (!allowed) throw new Error("Too many comments — slow down for a minute.");
    const { data: row, error } = await supabase
      .from("comments")
      .insert({
        video_id: data.videoId,
        user_id: userId,
        parent_id: data.parentId ?? null,
        body: data.body.trim(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    // Best-effort async moderation; do not block the response.
    try { await moderateComment(row.id); } catch (e) { console.error("[comments] moderation failed", e); }
    return { id: row.id };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
