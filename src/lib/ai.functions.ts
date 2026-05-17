import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============================================================================
// Embeddings (Lovable AI Gateway, OpenAI text-embedding-3-small, 1536 dims)
// ============================================================================

const EMBED_MODEL = "openai/text-embedding-3-small";
const EMBED_DIMS = 1536;

export async function embedText(text: string): Promise<number[] | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 8000);
  if (!clean) return null;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "raw-fetch",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: clean }),
  });
  if (!res.ok) {
    console.error("[ai] embeddings error", res.status, await res.text().catch(() => ""));
    return null;
  }
  const json = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
  const vec = json.data?.[0]?.embedding;
  if (!vec || vec.length !== EMBED_DIMS) return null;
  return vec;
}

function vecLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

export async function embedVideo(videoId: string): Promise<void> {
  const { data: v } = await supabaseAdmin
    .from("videos")
    .select("id,title,description,destination,country,city,activity_tags,transcript")
    .eq("id", videoId)
    .maybeSingle();
  if (!v) return;
  const parts = [
    v.title,
    v.description ?? "",
    [v.destination, v.city, v.country].filter(Boolean).join(", "),
    (v.activity_tags ?? []).join(" "),
    (v as any).transcript ? String((v as any).transcript).slice(0, 4000) : "",
  ].filter(Boolean);
  const vec = await embedText(parts.join("\n"));
  if (!vec) return;
  await supabaseAdmin
    .from("videos")
    .update({ embedding: vecLiteral(vec) as any, embedded_at: new Date().toISOString() })
    .eq("id", videoId);
}

export async function embedDeal(dealId: string): Promise<void> {
  const { data: d } = await supabaseAdmin
    .from("deals")
    .select("id,title,description,destination,country,city,ai_summary")
    .eq("id", dealId)
    .maybeSingle();
  if (!d) return;
  const parts = [
    d.title,
    d.description ?? "",
    d.ai_summary ?? "",
    [d.destination, d.city, d.country].filter(Boolean).join(", "),
  ].filter(Boolean);
  const vec = await embedText(parts.join("\n"));
  if (!vec) return;
  await supabaseAdmin
    .from("deals")
    .update({ embedding: vecLiteral(vec) as any, embedded_at: new Date().toISOString() })
    .eq("id", dealId);
}

const TagSchema = z.object({
  country: z.string().nullable(),
  city: z.string().nullable(),
  destination: z.string().nullable(),
  activity_tags: z.array(z.string()).max(8).default([]),
  budget_tag: z.enum(["budget", "mid-range", "luxury"]).nullable(),
  suggested_title: z.string().nullable(),
});

type TagResult = z.infer<typeof TagSchema>;

async function callGateway(prompt: string, thumbnailUrl: string | null): Promise<TagResult | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;

  const userContent: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
  if (thumbnailUrl) userContent.push({ type: "image_url", image_url: { url: thumbnailUrl } });

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
            "You extract travel metadata from short-form travel videos. Reply ONLY with JSON matching the schema. Use null when unknown. activity_tags are short lowercase kebab-case nouns like 'hiking', 'street-food', 'snorkeling' (max 6).",
        },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    console.error("[ai] gateway error", res.status, await res.text().catch(() => ""));
    return null;
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) return null;
  try {
    return TagSchema.parse(JSON.parse(raw));
  } catch (e) {
    console.error("[ai] parse failed", e);
    return null;
  }
}

export async function runAutoTag(videoId: string, opts?: { useTranscript?: boolean }): Promise<void> {
  const { data: video, error } = await supabaseAdmin
    .from("videos")
    .select("id,title,description,thumbnail_url,destination,country,city,activity_tags,budget_tag,transcript")
    .eq("id", videoId)
    .maybeSingle();
  if (error || !video) return;

  const transcript = opts?.useTranscript ? (video as any).transcript ?? null : null;
  const transcriptBlock = transcript
    ? `\nTranscript (auto-captioned, may contain errors, truncated to 4000 chars):\n${String(transcript).slice(0, 4000)}\n`
    : "";

  const prompt = `Title: ${video.title}\nDescription: ${video.description ?? "(none)"}\nExisting destination hint: ${video.destination ?? "(none)"}${transcriptBlock}\n\nFrom the title, description${transcript ? ", spoken transcript," : ""} and thumbnail image, infer the travel location and activities. Return JSON:\n{ "country": string|null, "city": string|null, "destination": string|null (short human label like "Bali" or "Lisbon"), "activity_tags": string[], "budget_tag": "budget"|"mid-range"|"luxury"|null, "suggested_title": string|null (only if current title is generic) }`;

  const result = await callGateway(prompt, video.thumbnail_url);
  if (!result) {
    // Still mark analyzed so the UI doesn't spin forever
    await supabaseAdmin.from("videos").update({ ai_analyzed_at: new Date().toISOString() }).eq("id", videoId);
    return;
  }

  const patch: {
    country?: string;
    city?: string;
    destination?: string;
    activity_tags?: string[];
    budget_tag?: string;
    ai_suggested_title?: string | null;
    ai_analyzed_at?: string;
  } = {};
  if (!video.country && result.country) patch.country = result.country;
  if (!video.city && result.city) patch.city = result.city;
  if (!video.destination && result.destination) patch.destination = result.destination;
  if ((!video.activity_tags || video.activity_tags.length === 0) && result.activity_tags.length > 0) {
    patch.activity_tags = result.activity_tags.map((t) => t.toLowerCase().replace(/\s+/g, "-")).slice(0, 6);
  }
  if (!video.budget_tag && result.budget_tag) patch.budget_tag = result.budget_tag;
  if (result.suggested_title && result.suggested_title.trim() && result.suggested_title.trim() !== video.title) {
    patch.ai_suggested_title = result.suggested_title.trim().slice(0, 160);
  }
  patch.ai_analyzed_at = new Date().toISOString();

  const { error: updErr } = await supabaseAdmin.from("videos").update(patch).eq("id", videoId);
  if (updErr) console.error("[ai] update failed", updErr.message);

  // After tagging, also extract businesses mentioned (best-effort).
  // Skip on the pre-transcript pass — we want richer signal first.
  if (opts?.useTranscript) {
    try { await runBusinessExtraction(videoId); }
    catch (e) { console.error("[ai] business extraction failed", e); }
  }

  // Re-embed after metadata update so semantic search reflects latest signal.
  try { await embedVideo(videoId); }
  catch (e) { console.error("[ai] embed video failed", e); }
}

// ---------- Business extraction ----------

const BusinessSchema = z.object({
  businesses: z
    .array(
      z.object({
        name: z.string().min(1).max(160),
        category: z
          .enum(["hotel", "restaurant", "tour", "activity", "bar", "other"])
          .nullable()
          .optional(),
        city: z.string().max(120).nullable().optional(),
        country: z.string().max(120).nullable().optional(),
        website_guess: z.string().max(500).nullable().optional(),
        confidence: z.number().min(0).max(1).optional(),
      }),
    )
    .max(8)
    .default([]),
});

async function callBusinessGateway(prompt: string): Promise<z.infer<typeof BusinessSchema> | null> {
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
            "You extract REAL named businesses (hotels, restaurants, tour operators, bars, activity providers) that a creator mentions or features in a short travel video. " +
            "Reject generic nouns like 'the hotel', 'a cafe', 'some restaurant'. Only include businesses with a real proper name. " +
            "Reply ONLY with JSON shaped as { businesses: [{ name, category, city, country, website_guess, confidence }] }. " +
            "category must be one of: hotel, restaurant, tour, activity, bar, other. confidence is 0..1. Use null when unknown. Max 8 entries.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    console.error("[ai] business gateway error", res.status);
    return null;
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) return null;
  try {
    return BusinessSchema.parse(JSON.parse(raw));
  } catch (e) {
    console.error("[ai] business parse failed", e);
    return null;
  }
}

export async function runBusinessExtraction(videoId: string): Promise<void> {
  const { data: video } = await supabaseAdmin
    .from("videos")
    .select("id,title,description,transcript,city,country,destination")
    .eq("id", videoId)
    .maybeSingle();
  if (!video) return;

  const transcript = (video as any).transcript as string | null;
  const titleLen = (video.title ?? "").length;
  const descLen = (video.description ?? "").length;
  // Need at least a transcript OR a reasonably descriptive title/description.
  if (!transcript && titleLen + descLen < 40) return;

  const prompt = [
    `Title: ${video.title}`,
    `Description: ${video.description ?? "(none)"}`,
    `Location hint: ${video.destination ?? ""} ${video.city ?? ""} ${video.country ?? ""}`.trim(),
    transcript ? `\nTranscript (auto, may have errors, truncated):\n${String(transcript).slice(0, 4000)}` : "",
    `\nExtract real named businesses mentioned or featured. Use the location hint to guide city/country when missing.`,
  ].join("\n");

  const result = await callBusinessGateway(prompt);
  if (!result || result.businesses.length === 0) return;

  // Fetch existing rows so we don't overwrite dismissed/converted ones.
  const { data: existing } = await supabaseAdmin
    .from("video_business_suggestions")
    .select("name,status")
    .eq("video_id", videoId);
  const seen = new Map<string, string>(
    (existing ?? []).map((r: any) => [String(r.name).toLowerCase(), r.status]),
  );

  const source = transcript ? "transcript" : titleLen >= descLen ? "title" : "description";
  const rows = result.businesses
    .filter((b) => {
      const prev = seen.get(b.name.toLowerCase());
      // Skip if already dismissed or converted — only insert fresh names.
      return !prev;
    })
    .map((b) => ({
      video_id: videoId,
      name: b.name.trim().slice(0, 160),
      category: b.category ?? null,
      city: b.city ?? video.city ?? null,
      country: b.country ?? video.country ?? null,
      website_guess: b.website_guess ?? null,
      confidence: b.confidence ?? null,
      source,
      status: "pending",
    }));

  if (rows.length === 0) return;
  const { error } = await supabaseAdmin
    .from("video_business_suggestions")
    .upsert(rows, { onConflict: "video_id,name", ignoreDuplicates: true });
  if (error) console.error("[ai] insert business suggestions failed", error.message);
}

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const rerunAutoTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ videoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: row } = await supabaseAdmin
      .from("videos")
      .select("id,creator_id,transcript")
      .eq("id", data.videoId)
      .maybeSingle();
    if (!row || row.creator_id !== userId) throw new Error("Not allowed");
    // Clear current tags so the model can re-fill them, then re-run with transcript if available.
    await supabaseAdmin
      .from("videos")
      .update({ activity_tags: [], destination: null, country: null, city: null, budget_tag: null })
      .eq("id", data.videoId);
    await runAutoTag(data.videoId, { useTranscript: !!row.transcript });
    return { ok: true };
  });

export const applyAiSuggestedTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ videoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: row } = await supabaseAdmin
      .from("videos")
      .select("id,creator_id,ai_suggested_title")
      .eq("id", data.videoId)
      .maybeSingle();
    if (!row || row.creator_id !== userId) throw new Error("Not allowed");
    if (!row.ai_suggested_title) throw new Error("No suggestion available");
    const { error } = await supabaseAdmin
      .from("videos")
      .update({ title: row.ai_suggested_title, ai_suggested_title: null })
      .eq("id", data.videoId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });