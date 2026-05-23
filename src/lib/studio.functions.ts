import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertCreator(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "creator")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: creator role required");
}

export type StudioVideo = {
  id: string;
  title: string;
  status: string;
  thumbnail_url: string | null;
  mux_playback_id: string | null;
  source_platform: string | null;
  is_draft: boolean;
  is_hidden: boolean;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  view_count: number;
  like_count: number;
  save_count: number;
  comment_count: number;
  derived_state: "live" | "scheduled" | "draft" | "processing" | "hidden";
};

function deriveState(v: any): StudioVideo["derived_state"] {
  if (v.is_hidden) return "hidden";
  if (v.is_draft) return "draft";
  if (v.status !== "ready") return "processing";
  if (v.scheduled_at && new Date(v.scheduled_at).getTime() > Date.now()) return "scheduled";
  return "live";
}

export const listMyVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      filter: z.enum(["all", "live", "scheduled", "draft", "processing"]).default("all"),
      q: z.string().max(160).optional(),
    }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    await assertCreator(context.supabase, context.userId);
    let q = supabaseAdmin
      .from("videos")
      .select("id,title,status,thumbnail_url,mux_playback_id,source_platform,is_draft,is_hidden,scheduled_at,published_at,created_at,view_count,like_count,save_count,comment_count")
      .eq("creator_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.q && data.q.trim()) q = q.ilike("title", `%${data.q.trim()}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const all = (rows ?? []).map((v) => ({ ...v, derived_state: deriveState(v) })) as StudioVideo[];
    const videos = data.filter === "all" ? all : all.filter((v) => v.derived_state === data.filter);
    return { videos, counts: countByState(all) };
  });

function countByState(list: StudioVideo[]) {
  const c = { all: list.length, live: 0, scheduled: 0, draft: 0, processing: 0, hidden: 0 };
  for (const v of list) c[v.derived_state] += 1;
  return c;
}

export const setVideoDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ videoId: z.string().uuid(), isDraft: z.boolean() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("videos")
      .update({
        is_draft: data.isDraft,
        published_at: data.isDraft ? null : new Date().toISOString(),
        scheduled_at: null,
      })
      .eq("id", data.videoId)
      .eq("creator_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const scheduleVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ videoId: z.string().uuid(), scheduledAt: z.string().datetime().nullable() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    if (data.scheduledAt && new Date(data.scheduledAt).getTime() <= Date.now() + 30_000) {
      throw new Error("Schedule time must be in the future");
    }
    const { error } = await context.supabase
      .from("videos")
      .update({
        scheduled_at: data.scheduledAt,
        is_draft: false,
        published_at: data.scheduledAt ? null : new Date().toISOString(),
      })
      .eq("id", data.videoId)
      .eq("creator_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const publishVideoNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ videoId: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("videos")
      .update({
        is_draft: false,
        scheduled_at: null,
        published_at: new Date().toISOString(),
      })
      .eq("id", data.videoId)
      .eq("creator_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type VideoInsights = {
  video: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    mux_playback_id: string | null;
    source_platform: string | null;
    cross_links: Array<{ platform: string; url: string }>;
    view_count: number;
    like_count: number;
    save_count: number;
    comment_count: number;
    created_at: string;
    derived_state: StudioVideo["derived_state"];
    description: string | null;
    destination: string | null;
    country: string | null;
    city: string | null;
    activity_tags: string[];
    budget_tag: string | null;
    status: string;
  };
  totals: {
    views: number;
    likes: number;
    saves: number;
    comments: number;
    watchMs: number;
    dealClicks: number;
  };
  daily: Array<{ date: string; views: number; likes: number; saves: number }>;
  recentComments: Array<{ id: string; body: string; created_at: string; user: { username: string; display_name: string | null; avatar_url: string | null } | null }>;
};

export const getVideoInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ videoId: z.string().uuid(), days: z.number().min(7).max(90).default(14) }).parse(input)
  )
  .handler(async ({ data, context }): Promise<VideoInsights> => {
    await assertCreator(context.supabase, context.userId);
    const { data: v, error } = await supabaseAdmin
      .from("videos")
      .select("id,title,thumbnail_url,mux_playback_id,source_platform,cross_links,view_count,like_count,save_count,comment_count,created_at,status,is_draft,is_hidden,scheduled_at,description,destination,country,city,activity_tags,budget_tag")
      .eq("id", data.videoId)
      .eq("creator_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!v) throw new Error("Not found");

    const since = new Date(Date.now() - data.days * 24 * 3600 * 1000).toISOString();
    const [viewsRes, likesRes, savesRes, commentsRes, dealClicksRes] = await Promise.all([
      supabaseAdmin.from("video_views").select("created_at,watch_ms").eq("video_id", data.videoId).gte("created_at", since).limit(10000),
      supabaseAdmin.from("likes").select("created_at").eq("video_id", data.videoId).gte("created_at", since).limit(5000),
      supabaseAdmin.from("saves").select("created_at").eq("video_id", data.videoId).gte("created_at", since).limit(5000),
      supabaseAdmin
        .from("comments")
        .select("id,body,created_at,user:profiles!comments_user_id_fkey(username,display_name,avatar_url)")
        .eq("video_id", data.videoId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabaseAdmin.from("deal_clicks").select("id", { count: "exact", head: true }).eq("referrer_video_id", data.videoId),
    ]);

    const views = (viewsRes.data ?? []) as Array<{ created_at: string; watch_ms: number }>;
    const likes = (likesRes.data ?? []) as Array<{ created_at: string }>;
    const saves = (savesRes.data ?? []) as Array<{ created_at: string }>;

    const buckets = new Map<string, { date: string; views: number; likes: number; saves: number }>();
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
      buckets.set(d, { date: d, views: 0, likes: 0, saves: 0 });
    }
    for (const r of views) { const k = r.created_at.slice(0, 10); const b = buckets.get(k); if (b) b.views += 1; }
    for (const r of likes) { const k = r.created_at.slice(0, 10); const b = buckets.get(k); if (b) b.likes += 1; }
    for (const r of saves) { const k = r.created_at.slice(0, 10); const b = buckets.get(k); if (b) b.saves += 1; }

    return {
      video: {
        id: v.id,
        title: v.title,
        thumbnail_url: v.thumbnail_url,
        mux_playback_id: v.mux_playback_id,
        source_platform: (v as any).source_platform ?? null,
        cross_links: ((v as any).cross_links ?? []) as Array<{ platform: string; url: string }>,
        view_count: v.view_count ?? 0,
        like_count: v.like_count ?? 0,
        save_count: v.save_count ?? 0,
        comment_count: v.comment_count ?? 0,
        created_at: v.created_at,
        derived_state: deriveState(v),
        description: (v as any).description ?? null,
        destination: (v as any).destination ?? null,
        country: (v as any).country ?? null,
        city: (v as any).city ?? null,
        activity_tags: ((v as any).activity_tags ?? []) as string[],
        budget_tag: (v as any).budget_tag ?? null,
        status: (v as any).status ?? "ready",
      },
      totals: {
        views: views.length,
        likes: likes.length,
        saves: saves.length,
        comments: (commentsRes.data ?? []).length,
        watchMs: views.reduce((s, r) => s + (r.watch_ms ?? 0), 0),
        dealClicks: dealClicksRes.count ?? 0,
      },
      daily: Array.from(buckets.values()),
      recentComments: (commentsRes.data ?? []).map((c: any) => ({
        id: c.id, body: c.body, created_at: c.created_at,
        user: c.user ?? null,
      })),
    };
  });

export const updateVideoMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      videoId: z.string().uuid(),
      title: z.string().trim().min(1).max(160),
      description: z.string().trim().max(2000).optional().nullable(),
      destination: z.string().trim().max(160).optional().nullable(),
      country: z.string().trim().max(80).optional().nullable(),
      city: z.string().trim().max(120).optional().nullable(),
      activity_tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
      budget_tag: z.enum(["budget", "mid", "luxury", "none"]).optional().nullable(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertCreator(context.supabase, context.userId);
    const patch: Record<string, unknown> = {
      title: data.title,
      description: data.description ?? null,
      destination: data.destination ?? null,
      country: data.country ?? null,
      city: data.city ?? null,
    };
    if (data.activity_tags) {
      patch.activity_tags = Array.from(
        new Set(data.activity_tags.map((t) => t.toLowerCase()).filter(Boolean))
      );
    }
    if (data.budget_tag !== undefined) {
      patch.budget_tag = data.budget_tag === "none" ? null : data.budget_tag;
    }
    const { error } = await context.supabase
      .from("videos")
      .update(patch)
      .eq("id", data.videoId)
      .eq("creator_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getStudioOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCreator(context.supabase, context.userId);
    const userId = context.userId;
    const since7 = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const { data: videos } = await supabaseAdmin
      .from("videos").select("id,is_draft,scheduled_at,status,is_hidden").eq("creator_id", userId);
    const list = videos ?? [];
    const ids = list.map((v: any) => v.id);

    const [viewsRes, likesRes, savesRes, followersRes] = await Promise.all([
      ids.length ? supabaseAdmin.from("video_views").select("id", { count: "exact", head: true }).in("video_id", ids).gte("created_at", since7) : Promise.resolve({ count: 0 } as any),
      ids.length ? supabaseAdmin.from("likes").select("user_id", { count: "exact", head: true }).in("video_id", ids).gte("created_at", since7) : Promise.resolve({ count: 0 } as any),
      ids.length ? supabaseAdmin.from("saves").select("user_id", { count: "exact", head: true }).in("video_id", ids).gte("created_at", since7) : Promise.resolve({ count: 0 } as any),
      supabaseAdmin.from("follows").select("follower_id", { count: "exact", head: true }).eq("creator_id", userId).gte("created_at", since7),
    ]);

    const counts = {
      live: 0, scheduled: 0, draft: 0, processing: 0, hidden: 0,
    } as Record<string, number>;
    for (const v of list as any[]) {
      const s = deriveState(v);
      counts[s] = (counts[s] ?? 0) + 1;
    }

    const { data: queue } = await supabaseAdmin
      .from("videos")
      .select("id,title,thumbnail_url,scheduled_at,is_draft,status,created_at")
      .eq("creator_id", userId)
      .or("is_draft.eq.true,scheduled_at.gt.now()")
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .limit(10);

    return {
      kpis: {
        views7d: viewsRes.count ?? 0,
        likes7d: likesRes.count ?? 0,
        saves7d: savesRes.count ?? 0,
        followers7d: followersRes.count ?? 0,
      },
      counts,
      queue: (queue ?? []).map((v: any) => ({
        id: v.id, title: v.title, thumbnail_url: v.thumbnail_url,
        scheduled_at: v.scheduled_at, is_draft: v.is_draft, status: v.status,
        kind: v.is_draft ? "draft" : v.scheduled_at ? "scheduled" : "queued",
      })),
    };
  });