import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type NotificationRow = {
  id: string;
  type: "like" | "comment" | "follow" | "reply";
  video_id: string | null;
  comment_id: string | null;
  deal_id: string | null;
  read_at: string | null;
  created_at: string;
  actor: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  video: { id: string; title: string; thumbnail_url: string | null } | null;
};

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select(
        "id,type,video_id,comment_id,deal_id,read_at,created_at,actor:profiles!notifications_actor_id_fkey(id,username,display_name,avatar_url),video:videos!notifications_video_id_fkey(id,title,thumbnail_url)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) {
      // Fallback without FK alias if PostgREST can't infer relationships
      const { data: rows } = await supabaseAdmin
        .from("notifications")
        .select("id,type,video_id,comment_id,deal_id,read_at,created_at,actor_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(80);
      const actorIds = Array.from(new Set((rows ?? []).map((r: any) => r.actor_id).filter(Boolean)));
      const videoIds = Array.from(new Set((rows ?? []).map((r: any) => r.video_id).filter(Boolean)));
      const [{ data: actors }, { data: videos }] = await Promise.all([
        actorIds.length
          ? supabaseAdmin.from("profiles").select("id,username,display_name,avatar_url").in("id", actorIds)
          : Promise.resolve({ data: [] as any[] }),
        videoIds.length
          ? supabaseAdmin.from("videos").select("id,title,thumbnail_url").in("id", videoIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const aMap = new Map((actors ?? []).map((a: any) => [a.id, a]));
      const vMap = new Map((videos ?? []).map((v: any) => [v.id, v]));
      return {
        notifications: (rows ?? []).map((r: any) => ({
          id: r.id,
          type: r.type,
          video_id: r.video_id,
          comment_id: r.comment_id,
          deal_id: r.deal_id,
          read_at: r.read_at,
          created_at: r.created_at,
          actor: aMap.get(r.actor_id) ?? null,
          video: r.video_id ? vMap.get(r.video_id) ?? null : null,
        })) as NotificationRow[],
      };
    }
    return { notifications: (data ?? []) as unknown as NotificationRow[] };
  });

export const getUnreadCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { count } = await supabaseAdmin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    return { count: count ?? 0 };
  });

export const markAllRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    await supabaseAdmin
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    return { ok: true };
  });

export const markRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await supabaseAdmin
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: true };
  });