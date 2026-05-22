import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CROSS_LINK_PLATFORMS = [
  "instagram",
  "tiktok",
  "facebook",
  "youtube",
  "x",
] as const;
export type CrossLinkPlatform = (typeof CROSS_LINK_PLATFORMS)[number];

export type CrossLink = { platform: CrossLinkPlatform; url: string };

const linkSchema = z.object({
  platform: z.enum(CROSS_LINK_PLATFORMS),
  url: z.string().url().max(500),
});

export const crossLinksSchema = z.array(linkSchema).max(5).default([]);

export const updateVideoCrossLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        videoId: z.string().uuid(),
        links: crossLinksSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Dedupe by platform — last entry wins.
    const map = new Map<CrossLinkPlatform, CrossLink>();
    for (const l of data.links) {
      map.set(l.platform, { platform: l.platform, url: l.url.trim() });
    }
    const dedup = Array.from(map.values());
    const { error } = await supabaseAdmin
      .from("videos")
      .update({ cross_links: dedup as any })
      .eq("id", data.videoId)
      .eq("creator_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true, links: dedup };
  });