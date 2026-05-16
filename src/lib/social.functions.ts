import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Platform = "youtube" | "tiktok" | "instagram" | "x";

export type ProfileSocials = {
  user_id: string;
  youtube_handle: string | null;
  youtube_channel_id: string | null;
  tiktok_handle: string | null;
  instagram_handle: string | null;
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
    return { videoId: inserted!.id };
  });
