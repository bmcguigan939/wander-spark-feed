import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function muxClient() {
  // Lazy import keeps Mux SDK out of any code path that doesn't call it.
  const { default: Mux } = await import("@mux/mux-node");
  return new Mux({
    tokenId: process.env.MUX_TOKEN_ID!,
    tokenSecret: process.env.MUX_TOKEN_SECRET!,
  });
}

export const becomeCreator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "creator" });
    // 23505 = unique_violation — already a creator, treat as success
    if (error && (error as any).code !== "23505") throw new Error(error.message);
    return { ok: true };
  });

export const createDirectUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ title: z.string().min(1).max(160).default("Untitled") }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check creator role
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "creator").maybeSingle();
    if (!roleRow) throw new Error("You must be a creator to upload");

    const mux = await muxClient();
    const upload = await mux.video.uploads.create({
      cors_origin: "*",
      new_asset_settings: {
        playback_policies: ["public"],
        video_quality: "basic",
        // Auto-generate English subtitles for accessibility & richer AI tagging
        input: [
          {
            generated_subtitles: [
              { language_code: "en", name: "English (auto)" },
            ],
          },
        ],
      } as any,
    });

    const { data: video, error } = await supabase
      .from("videos")
      .insert({
        creator_id: userId,
        title: data.title,
        status: "uploading",
        mux_upload_id: upload.id,
      })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { uploadUrl: upload.url, uploadId: upload.id, videoId: video.id };
  });

export const finalizeVideoMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      videoId: z.string().uuid(),
      title: z.string().min(1).max(160),
      description: z.string().max(2000).optional(),
      destination: z.string().max(160).optional(),
      country: z.string().max(80).optional(),
      city: z.string().max(80).optional(),
      activity_tags: z.array(z.string().min(1).max(40)).max(10).default([]),
      budget_tag: z.enum(["budget", "mid", "luxury"]).optional(),
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
      publish_mode: z.enum(["now", "draft", "schedule"]).default("now"),
      scheduled_at: z.string().datetime().nullable().optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const isDraft = data.publish_mode === "draft";
    const scheduledAt =
      data.publish_mode === "schedule" && data.scheduled_at
        ? data.scheduled_at
        : null;
    if (data.publish_mode === "schedule") {
      if (!scheduledAt) throw new Error("Scheduled time required");
      if (new Date(scheduledAt).getTime() <= Date.now() + 30_000) {
        throw new Error("Schedule time must be in the future");
      }
    }
    const publishedAt =
      data.publish_mode === "now" ? new Date().toISOString() : null;
    const { error } = await supabase
      .from("videos")
      .update({
        title: data.title,
        description: data.description ?? null,
        destination: data.destination ?? null,
        country: data.country ?? null,
        city: data.city ?? null,
        activity_tags: data.activity_tags,
        budget_tag: data.budget_tag ?? null,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        is_draft: isDraft,
        scheduled_at: scheduledAt,
        published_at: publishedAt,
      })
      .eq("id", data.videoId)
      .eq("creator_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });