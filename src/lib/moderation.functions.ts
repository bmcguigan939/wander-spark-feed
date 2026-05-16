import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ModerationSchema = z.object({
  flags: z
    .array(
      z.object({
        label: z.enum(["spam", "fake_review", "off_platform", "hate", "nsfw", "other"]),
        confidence: z.number().min(0).max(1),
        reason: z.string().max(280).optional().nullable(),
      }),
    )
    .max(5)
    .default([]),
});

type ModerationResult = z.infer<typeof ModerationSchema>;

async function callModerationGateway(prompt: string): Promise<ModerationResult | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "raw-fetch",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You are a content moderator for a short-form travel video platform. " +
            "Detect issues: spam (promotional junk), fake_review (suspiciously generic praise), " +
            "off_platform (urging users to DM/email/visit external site to book), hate (slurs, harassment), " +
            "nsfw (sexual/graphic content). Only flag clear violations. " +
            "Return ONLY JSON: { flags: [{ label, confidence, reason }] }. " +
            "If content is fine, return { flags: [] }. confidence is 0..1. Max 5 flags.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    console.error("[moderation] gateway error", res.status);
    return null;
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) return null;
  try {
    return ModerationSchema.parse(JSON.parse(raw));
  } catch (e) {
    console.error("[moderation] parse failed", e);
    return null;
  }
}

// Auto-hide threshold. Above this, content is hidden automatically pending admin review.
const AUTO_HIDE_THRESHOLD = 0.85;

export async function moderateVideo(videoId: string): Promise<void> {
  const { data: video } = await supabaseAdmin
    .from("videos")
    .select("id,title,description,transcript")
    .eq("id", videoId)
    .maybeSingle();
  if (!video) return;

  const text = [
    `Title: ${video.title}`,
    `Description: ${video.description ?? "(none)"}`,
    (video as any).transcript ? `Transcript:\n${String((video as any).transcript).slice(0, 3000)}` : "",
  ].join("\n");

  if (text.replace(/\s+/g, "").length < 20) return;

  const result = await callModerationGateway(text);
  if (!result || result.flags.length === 0) return;

  const top = result.flags.reduce((a, b) => (a.confidence > b.confidence ? a : b));
  const shouldHide = top.confidence >= AUTO_HIDE_THRESHOLD;

  // Insert flags
  await supabaseAdmin.from("moderation_flags").insert(
    result.flags.map((f) => ({
      target_type: "video",
      target_id: videoId,
      label: f.label,
      confidence: f.confidence,
      reason: f.reason ?? null,
      status: shouldHide ? "auto_hidden" : "pending",
    })),
  );

  if (shouldHide) {
    await supabaseAdmin.from("videos").update({ is_hidden: true }).eq("id", videoId);
  }
}

export async function moderateComment(commentId: string): Promise<void> {
  const { data: comment } = await supabaseAdmin
    .from("comments")
    .select("id,body")
    .eq("id", commentId)
    .maybeSingle();
  if (!comment || !comment.body || comment.body.length < 5) return;

  const result = await callModerationGateway(`Comment: ${comment.body}`);
  if (!result || result.flags.length === 0) return;

  const top = result.flags.reduce((a, b) => (a.confidence > b.confidence ? a : b));
  const shouldHide = top.confidence >= AUTO_HIDE_THRESHOLD;

  await supabaseAdmin.from("moderation_flags").insert(
    result.flags.map((f) => ({
      target_type: "comment",
      target_id: commentId,
      label: f.label,
      confidence: f.confidence,
      reason: f.reason ?? null,
      status: shouldHide ? "auto_hidden" : "pending",
    })),
  );

  if (shouldHide) {
    // Soft-delete by removing the comment row (creator can re-post if it was a false positive).
    await supabaseAdmin.from("comments").delete().eq("id", commentId);
  }
}

// ---------- Admin server fns ----------

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listModerationFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("moderation_flags")
      .select("id,target_type,target_id,label,confidence,reason,status,created_at")
      .in("status", ["pending", "auto_hidden"])
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { flags: data ?? [] };
  });

export const resolveModerationFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      flagId: z.string().uuid(),
      action: z.enum(["uphold", "dismiss"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: flag } = await supabaseAdmin
      .from("moderation_flags")
      .select("id,target_type,target_id,status")
      .eq("id", data.flagId)
      .maybeSingle();
    if (!flag) throw new Error("Flag not found");

    if (data.action === "uphold") {
      // Permanently hide / delete the target.
      if (flag.target_type === "video") {
        await supabaseAdmin.from("videos").update({ is_hidden: true }).eq("id", flag.target_id);
      } else if (flag.target_type === "comment") {
        await supabaseAdmin.from("comments").delete().eq("id", flag.target_id);
      }
      await supabaseAdmin
        .from("moderation_flags")
        .update({ status: "resolved", resolved_by: context.userId, resolved_at: new Date().toISOString() })
        .eq("id", data.flagId);
    } else {
      // Dismiss: restore auto-hidden video if applicable, mark flag dismissed.
      if (flag.target_type === "video" && flag.status === "auto_hidden") {
        await supabaseAdmin.from("videos").update({ is_hidden: false }).eq("id", flag.target_id);
      }
      await supabaseAdmin
        .from("moderation_flags")
        .update({ status: "dismissed", resolved_by: context.userId, resolved_at: new Date().toISOString() })
        .eq("id", data.flagId);
    }
    return { ok: true };
  });
