import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Platform = "youtube" | "tiktok" | "instagram" | "facebook" | "x";

export type ProfileSocials = {
  user_id: string;
  youtube_handle: string | null;
  youtube_channel_id: string | null;
  tiktok_handle: string | null;
  instagram_handle: string | null;
  facebook_handle: string | null;
  x_handle: string | null;
  website_url: string | null;
};

const handleSchema = z
  .string()
  .trim()
  .max(80)
  .optional()
  .nullable()
  .transform((v) => {
    if (!v) return null;
    return v.replace(/^@/, "").trim() || null;
  });

const socialsInput = z.object({
  youtube_handle: handleSchema,
  tiktok_handle: handleSchema,
  instagram_handle: handleSchema,
  facebook_handle: handleSchema,
  x_handle: handleSchema,
  website_url: z
    .string()
    .trim()
    .max(300)
    .optional()
    .nullable()
    .transform((v) => v || null),
});

export const getMySocials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileSocials | null> => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("profile_socials")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return (data as ProfileSocials | null) ?? null;
  });

export const upsertMySocials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => socialsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("profile_socials")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPublicSocials = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<ProfileSocials | null> => {
    const { data: row } = await supabaseAdmin
      .from("profile_socials")
      .select("*")
      .eq("user_id", data.userId)
      .maybeSingle();
    return (row as ProfileSocials | null) ?? null;
  });

// ---------- External video preview & import ----------

export type PreviewResult = {
  platform: Platform;
  sourceId: string;
  sourceUrl: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  durationSec: number | null;
  authorName: string | null;
};

function detectPlatform(url: string): { platform: Platform; sourceId: string } | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return { platform: "youtube", sourceId: v };
      const short = u.pathname.match(/^\/shorts\/([\w-]{6,})/);
      if (short) return { platform: "youtube", sourceId: short[1] };
      const embed = u.pathname.match(/^\/embed\/([\w-]{6,})/);
      if (embed) return { platform: "youtube", sourceId: embed[1] };
    }
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      if (id) return { platform: "youtube", sourceId: id };
    }
    if (host.endsWith("tiktok.com")) {
      const m = u.pathname.match(/\/video\/(\d+)/);
      if (m) return { platform: "tiktok", sourceId: m[1] };
      return { platform: "tiktok", sourceId: u.pathname.replace(/\//g, "") || "unknown" };
    }
    if (host.endsWith("instagram.com")) {
      const m = u.pathname.match(/\/(reel|reels|p|tv)\/([\w-]+)/);
      if (m) return { platform: "instagram", sourceId: m[2] };
    }
    if (host.endsWith("facebook.com")) {
      const m =
        u.pathname.match(/\/(reel|videos|watch)\/(\d+)/) ||
        u.pathname.match(/\/([\w.-]+)\/videos\/(\d+)/);
      if (m) return { platform: "facebook", sourceId: m[2] };
      const v = u.searchParams.get("v");
      if (v) return { platform: "facebook", sourceId: v };
    }
    if (host === "fb.watch") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      if (id) return { platform: "facebook", sourceId: id };
    }
    if (host === "x.com" || host === "twitter.com") {
      const m = u.pathname.match(/\/status\/(\d+)/);
      if (m) return { platform: "x", sourceId: m[1] };
    }
  } catch {
    return null;
  }
  return null;
}

async function previewYouTube(id: string, url: string): Promise<PreviewResult> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  let title = "";
  let description: string | null = null;
  let thumbnail: string | null = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  let durationSec: number | null = null;
  let authorName: string | null = null;

  if (apiKey) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${id}&key=${apiKey}`,
      );
      const json: any = await res.json();
      const item = json.items?.[0];
      if (item) {
        title = item.snippet.title;
        description = item.snippet.description ?? null;
        authorName = item.snippet.channelTitle ?? null;
        const t = item.snippet.thumbnails;
        thumbnail = t?.maxres?.url ?? t?.standard?.url ?? t?.high?.url ?? thumbnail;
        const d = item.contentDetails?.duration as string | undefined;
        if (d) {
          const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(d);
          if (m) durationSec = +(m[1] ?? 0) * 3600 + +(m[2] ?? 0) * 60 + +(m[3] ?? 0);
        }
      }
    } catch {}
  }
  if (!title) {
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      );
      if (res.ok) {
        const json: any = await res.json();
        title = json.title ?? "";
        authorName = authorName ?? json.author_name ?? null;
        thumbnail = json.thumbnail_url ?? thumbnail;
      }
    } catch {}
  }
  return {
    platform: "youtube",
    sourceId: id,
    sourceUrl: url,
    title: title || "Untitled",
    description,
    thumbnail,
    durationSec,
    authorName,
  };
}

async function previewTikTok(url: string, sourceId: string): Promise<PreviewResult> {
  let title = "";
  let thumbnail: string | null = null;
  let authorName: string | null = null;
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const json: any = await res.json();
      title = json.title ?? "";
      thumbnail = json.thumbnail_url ?? null;
      authorName = json.author_name ?? null;
    }
  } catch {}
  return {
    platform: "tiktok",
    sourceId,
    sourceUrl: url,
    title: title || "TikTok video",
    description: null,
    thumbnail,
    durationSec: null,
    authorName,
  };
}

async function previewByOgTags(
  url: string,
  platform: Platform,
  sourceId: string,
): Promise<PreviewResult> {
  let title = "";
  let description: string | null = null;
  let thumbnail: string | null = null;
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; TravidzBot/1.0; +https://travidz.com)",
      },
    });
    if (res.ok) {
      const html = await res.text();
      const og = (prop: string) => {
        const m = new RegExp(
          `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`,
          "i",
        ).exec(html);
        return m?.[1] ?? null;
      };
      title = og("og:title") ?? "";
      description = og("og:description");
      thumbnail = og("og:image");
    }
  } catch {}
  return {
    platform,
    sourceId,
    sourceUrl: url,
    title: title || `${platform} post`,
    description,
    thumbnail,
    durationSec: null,
    authorName: null,
  };
}

export const previewExternalVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ url: z.string().url().max(500) }).parse(input),
  )
  .handler(async ({ data }): Promise<PreviewResult> => {
    const det = detectPlatform(data.url);
    if (!det)
      throw new Error("Unsupported link. Paste a YouTube, TikTok, Instagram, or X URL.");
    if (det.platform === "youtube") return previewYouTube(det.sourceId, data.url);
    if (det.platform === "tiktok") return previewTikTok(data.url, det.sourceId);
    return previewByOgTags(data.url, det.platform, det.sourceId);
  });

export const importExternalVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        url: z.string().url().max(500),
        title: z.string().min(1).max(160),
        description: z.string().max(2000).optional().nullable(),
        thumbnail: z.string().url().max(500).optional().nullable(),
        destination: z.string().max(120).optional().nullable(),
        country: z.string().max(80).optional().nullable(),
        city: z.string().max(80).optional().nullable(),
        activity_tags: z.array(z.string().max(40)).max(12).default([]),
        budget_tag: z.enum(["budget", "mid", "luxury"]).optional().nullable(),
        ownership_confirmed: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const det = detectPlatform(data.url);
    if (!det) throw new Error("Unsupported link");

    // Ensure creator role
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "creator")
      .maybeSingle();
    if (!roleRow) {
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "creator" })
        .then(
          () => {},
          () => {},
        );
    }

    // Dedupe per creator
    const { data: existing } = await supabaseAdmin
      .from("videos")
      .select("id")
      .eq("creator_id", userId)
      .eq("source_platform", det.platform)
      .eq("source_video_id", det.sourceId)
      .maybeSingle();
    if (existing) throw new Error("You already imported this video.");

    const { data: inserted, error } = await supabase
      .from("videos")
      .insert({
        creator_id: userId,
        title: data.title,
        description: data.description ?? null,
        thumbnail_url: data.thumbnail ?? null,
        destination: data.destination ?? null,
        country: data.country ?? null,
        city: data.city ?? null,
        activity_tags: data.activity_tags,
        budget_tag: data.budget_tag ?? null,
        status: "ready",
        source_platform: det.platform,
        source_url: data.url,
        source_video_id: det.sourceId,
        embed_mode: "link_card",
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    void autoTrustCreator(userId);
    return { videoId: inserted!.id };
  });

// ---------- Shared helpers used by single + bulk imports + sync paths ----------

async function ensureCreatorRole(userId: string) {
  await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: userId, role: "creator" })
    .then(
      () => {},
      () => {},
    );
}

async function autoTrustCreator(userId: string) {
  try {
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("is_verified")
      .eq("id", userId)
      .maybeSingle();
    if (p && !p.is_verified) {
      await (supabaseAdmin.from("profiles") as any)
        .update({ is_verified: true, verified_at: new Date().toISOString() })
        .eq("id", userId);
    }
  } catch (e) {
    console.error("autoTrustCreator failed", e);
  }
}

/**
 * Insert a single external video row keyed to a creator. Idempotent —
 * returns `{ videoId, skipped: true }` if the dedupe key already exists.
 */
async function insertExternalVideoRow(args: {
  creatorId: string;
  preview: PreviewResult;
  description?: string | null;
  thumbnail?: string | null;
  publishedAt?: string | null;
}): Promise<{ videoId: string; skipped: boolean }> {
  const { creatorId, preview } = args;
  const { data: existing } = await supabaseAdmin
    .from("videos")
    .select("id")
    .eq("creator_id", creatorId)
    .eq("source_platform", preview.platform)
    .eq("source_video_id", preview.sourceId)
    .maybeSingle();
  if (existing) return { videoId: existing.id, skipped: true };

  const { data: inserted, error } = await supabaseAdmin
    .from("videos")
    .insert({
      creator_id: creatorId,
      title: preview.title,
      description: args.description ?? preview.description ?? null,
      thumbnail_url: args.thumbnail ?? preview.thumbnail ?? null,
      activity_tags: [],
      status: "ready",
      source_platform: preview.platform,
      source_url: preview.sourceUrl,
      source_video_id: preview.sourceId,
      embed_mode: "link_card",
      published_at: args.publishedAt ?? new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { videoId: inserted!.id, skipped: false };
}

// ---------- Bulk no-link import ----------

export const importExternalVideosBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        urls: z.array(z.string().url().max(500)).min(1).max(25),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await ensureCreatorRole(userId);

    const imported: { url: string; videoId: string }[] = [];
    const skipped: { url: string; reason: string }[] = [];
    const failed: { url: string; error: string }[] = [];

    for (const rawUrl of data.urls) {
      const url = rawUrl.trim();
      if (!url) continue;
      try {
        const det = detectPlatform(url);
        if (!det) {
          failed.push({ url, error: "Unsupported link" });
          continue;
        }
        let preview: PreviewResult;
        if (det.platform === "youtube") {
          preview = await previewYouTube(det.sourceId, url);
        } else if (det.platform === "tiktok") {
          preview = await previewTikTok(url, det.sourceId);
        } else {
          preview = await previewByOgTags(url, det.platform, det.sourceId);
        }
        const res = await insertExternalVideoRow({ creatorId: userId, preview });
        if (res.skipped) skipped.push({ url, reason: "Already imported" });
        else imported.push({ url, videoId: res.videoId });
      } catch (e: any) {
        failed.push({ url, error: e?.message ?? "Import failed" });
      }
    }

    if (imported.length > 0) void autoTrustCreator(userId);

    return {
      imported: imported.length,
      skipped,
      failed,
      ids: imported.map((i) => i.videoId),
    };
  });

// ---------- YouTube auto-sync (per-creator, public Data API) ----------

async function fetchYouTubeJson(path: string): Promise<any> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is not configured");
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}&key=${apiKey}`);
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  return res.json();
}

async function resolveYouTubeChannelId(args: {
  userId: string;
  handle: string | null;
  channelId: string | null;
}): Promise<string | null> {
  if (args.channelId) return args.channelId;
  if (!args.handle) return null;
  const h = args.handle.replace(/^@/, "");
  try {
    const json = await fetchYouTubeJson(
      `channels?part=id&forHandle=@${encodeURIComponent(h)}`,
    );
    const id = json.items?.[0]?.id as string | undefined;
    if (id) {
      await (supabaseAdmin.from("profile_socials") as any)
        .update({ youtube_channel_id: id })
        .eq("user_id", args.userId);
      return id;
    }
  } catch (e) {
    console.error("resolveYouTubeChannelId failed", e);
  }
  return null;
}

async function syncYouTubeForUser(userId: string, maxResults = 12) {
  const { data: socials } = await supabaseAdmin
    .from("profile_socials")
    .select("youtube_handle,youtube_channel_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!socials) return { synced: 0, error: "No socials saved" };
  const channelId = await resolveYouTubeChannelId({
    userId,
    handle: socials.youtube_handle ?? null,
    channelId: socials.youtube_channel_id ?? null,
  });
  if (!channelId) return { synced: 0, error: "YouTube channel not found" };

  let uploadsPlaylistId: string | null = null;
  try {
    const ch = await fetchYouTubeJson(
      `channels?part=contentDetails&id=${encodeURIComponent(channelId)}`,
    );
    uploadsPlaylistId =
      ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
  } catch (e) {
    return { synced: 0, error: `Channel lookup failed: ${(e as Error).message}` };
  }
  if (!uploadsPlaylistId) return { synced: 0, error: "Uploads playlist missing" };

  let items: any[] = [];
  try {
    const pl = await fetchYouTubeJson(
      `playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(
        uploadsPlaylistId,
      )}&maxResults=${maxResults}`,
    );
    items = pl.items ?? [];
  } catch (e) {
    return { synced: 0, error: `Playlist fetch failed: ${(e as Error).message}` };
  }

  let synced = 0;
  for (const it of items) {
    const videoId = it.contentDetails?.videoId as string | undefined;
    if (!videoId) continue;
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const sn = it.snippet ?? {};
    const thumb =
      sn.thumbnails?.maxres?.url ??
      sn.thumbnails?.standard?.url ??
      sn.thumbnails?.high?.url ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const preview: PreviewResult = {
      platform: "youtube",
      sourceId: videoId,
      sourceUrl: url,
      title: sn.title ?? "Untitled",
      description: sn.description ?? null,
      thumbnail: thumb,
      durationSec: null,
      authorName: sn.channelTitle ?? null,
    };
    try {
      const res = await insertExternalVideoRow({
        creatorId: userId,
        preview,
        publishedAt: sn.publishedAt ?? null,
      });
      if (!res.skipped) synced++;
    } catch (e) {
      console.error("YT insert failed", videoId, e);
    }
  }

  if (synced > 0) void autoTrustCreator(userId);
  return { synced, error: null as string | null };
}

export const syncYouTubeForCreator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureCreatorRole(context.userId);
    return syncYouTubeForUser(context.userId);
  });

/** Admin-callable: sync any creator (used by the scheduled cron). */
export async function syncYouTubeForUserAdmin(userId: string) {
  return syncYouTubeForUser(userId);
}

// ---------- TikTok auto-sync (Travidz official, via Lovable connector gateway) ----------

const TIKTOK_GATEWAY = "https://connector-gateway.lovable.dev/tiktok";

export async function syncTikTokOfficialAdmin() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  const tiktokKey = process.env.TIKTOK_API_KEY;
  if (!tiktokKey) throw new Error("TIKTOK_API_KEY is not configured");
  const officialCreatorId = process.env.TRAVIDZ_OFFICIAL_CREATOR_ID;
  if (!officialCreatorId)
    throw new Error("TRAVIDZ_OFFICIAL_CREATOR_ID is not configured");

  const res = await fetch(`${TIKTOK_GATEWAY}/video/list/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": tiktokKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      max_count: 20,
      fields: [
        "id",
        "title",
        "cover_image_url",
        "share_url",
        "video_description",
        "create_time",
        "duration",
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`TikTok API ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json: any = await res.json();
  const videos: any[] = json?.data?.videos ?? [];

  let synced = 0;
  for (const v of videos) {
    const id = String(v.id);
    const url = v.share_url ?? `https://www.tiktok.com/@travidz/video/${id}`;
    const preview: PreviewResult = {
      platform: "tiktok",
      sourceId: id,
      sourceUrl: url,
      title: v.title || v.video_description || "TikTok video",
      description: v.video_description ?? null,
      thumbnail: v.cover_image_url ?? null,
      durationSec: v.duration ?? null,
      authorName: "Travidz",
    };
    try {
      const insertRes = await insertExternalVideoRow({
        creatorId: officialCreatorId,
        preview,
        publishedAt: v.create_time
          ? new Date(v.create_time * 1000).toISOString()
          : null,
      });
      if (!insertRes.skipped) synced++;
    } catch (e) {
      console.error("TikTok insert failed", id, e);
    }
  }
  return { synced, scanned: videos.length };
}

export const syncTikTokOfficial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Admin gate
    const { data: adminRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRow) throw new Error("Admin only");
    return syncTikTokOfficialAdmin();
  });
