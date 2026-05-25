import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { crossLinksSchema } from "./cross-links.functions";
import { checkRateLimit } from "@/lib/rate-limit.server";

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

    // Cost guardrail: cap upload attempts so a single account can't
    // burn Mux ingest budget (10/min, 50/hour per user).
    const okMin = await checkRateLimit("mux_upload_create", userId, 10, 60);
    const okHour = await checkRateLimit("mux_upload_create_hour", userId, 50, 3600);
    if (!okMin || !okHour) {
      throw new Error("Too many uploads in a short time. Please wait a moment and try again.");
    }

    // Check creator role
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "creator").maybeSingle();
    if (!roleRow) throw new Error("You must be a creator to upload");

    const mux = await muxClient();
    let upload;
    try {
      upload = await mux.video.uploads.create({
        cors_origin: "*",
        new_asset_settings: {
          playback_policies: ["public"],
          video_quality: "basic",
          // Delivery cost guardrails: cap resolution at 1080p so creators
          // can't push 4K masters that 10x storage + delivery bills. Disable
          // MP4 renditions so nobody can hot-link the source file and bypass
          // HLS adaptive bitrate + CDN.
          max_resolution_tier: "1080p",
          mp4_support: "none",
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
    } catch (err: any) {
      const status = err?.status ?? err?.statusCode;
      console.error("[mux.uploads.create] failed", {
        status,
        message: err?.message,
        body: err?.error ?? err?.response?.data,
      });
      if (status === 401 || status === 403) {
        throw new Error(
          "Video service is not accepting uploads right now (auth failed). Please contact support — code MUX_AUTH.",
        );
      }
      throw new Error(
        "Couldn't start upload. Please try again in a moment. If this keeps happening, contact support.",
      );
    }

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
      music_track_id: z.string().uuid().nullable().optional(),
      cross_links: crossLinksSchema.optional(),
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
        music_track_id: data.music_track_id ?? null,
        cross_links: (data.cross_links ?? []) as any,
      })
      .eq("id", data.videoId)
      .eq("creator_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reconcileMyStuckUploads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Each call fans out up to 20 Mux API requests; cap to 5/min per user.
    const ok = await checkRateLimit("mux_reconcile", userId, 5, 60);
    if (!ok) {
      throw new Error("Already checking — please wait a moment before retrying.");
    }

    const { data: rows, error: fetchErr } = await supabase
      .from("videos")
      .select("id, mux_upload_id")
      .eq("creator_id", userId)
      .eq("status", "uploading")
      .not("mux_upload_id", "is", null)
      .limit(20);
    if (fetchErr) throw new Error(fetchErr.message);
    if (!rows || rows.length === 0) return { checked: 0, repaired: 0, failed: 0, details: [] as any[] };

    let mux;
    try {
      mux = await muxClient();
    } catch (e: any) {
      throw new Error("Video service is not reachable right now. Try again in a moment.");
    }

    let repaired = 0;
    let failed = 0;
    const details: { videoId: string; result: string }[] = [];

    for (const row of rows) {
      const uploadId = row.mux_upload_id as string;
      try {
        const upload: any = await mux.video.uploads.retrieve(uploadId);
        const uStatus = upload?.status as string | undefined;
        const assetId = upload?.asset_id as string | undefined;

        if (uStatus === "asset_created" && assetId) {
          const asset: any = await mux.video.assets.retrieve(assetId);
          const playback = asset?.playback_ids?.[0]?.id as string | undefined;
          const thumbnail = playback
            ? `https://image.mux.com/${playback}/thumbnail.jpg?width=540&fit_mode=preserve`
            : null;
          const aStatus = asset?.status as string | undefined; // preparing | ready | errored
          await supabase
            .from("videos")
            .update({
              mux_asset_id: assetId,
              mux_playback_id: playback ?? null,
              thumbnail_url: thumbnail,
              duration_sec: asset?.duration ?? null,
              status: aStatus === "ready" ? "ready" : aStatus === "errored" ? "failed" : "processing",
            })
            .eq("id", row.id)
            .eq("creator_id", userId);
          if (aStatus === "ready") repaired++;
          details.push({ videoId: row.id, result: aStatus ?? "asset_created" });
        } else if (uStatus === "errored" || uStatus === "cancelled" || uStatus === "timed_out") {
          await supabase.from("videos").update({ status: "failed" }).eq("id", row.id).eq("creator_id", userId);
          failed++;
          details.push({ videoId: row.id, result: uStatus });
        } else {
          details.push({ videoId: row.id, result: uStatus ?? "waiting" });
        }
      } catch (e: any) {
        console.error("[reconcileMyStuckUploads] retrieve failed", { uploadId, msg: e?.message, status: e?.status });
        details.push({ videoId: row.id, result: "retrieve_failed" });
      }
    }

    return { checked: rows.length, repaired, failed, details };
  });