import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
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

export async function runAutoTag(videoId: string): Promise<void> {
  const { data: video, error } = await supabaseAdmin
    .from("videos")
    .select("id,title,description,thumbnail_url,destination,country,city,activity_tags,budget_tag")
    .eq("id", videoId)
    .maybeSingle();
  if (error || !video) return;

  const prompt = `Title: ${video.title}\nDescription: ${video.description ?? "(none)"}\nExisting destination hint: ${video.destination ?? "(none)"}\n\nFrom the title, description, and thumbnail image, infer the travel location and activities. Return JSON:\n{ "country": string|null, "city": string|null, "destination": string|null (short human label like "Bali" or "Lisbon"), "activity_tags": string[], "budget_tag": "budget"|"mid-range"|"luxury"|null, "suggested_title": string|null (only if current title is generic) }`;

  const result = await callGateway(prompt, video.thumbnail_url);
  if (!result) return;

  const patch: Record<string, unknown> = {};
  if (!video.country && result.country) patch.country = result.country;
  if (!video.city && result.city) patch.city = result.city;
  if (!video.destination && result.destination) patch.destination = result.destination;
  if ((!video.activity_tags || video.activity_tags.length === 0) && result.activity_tags.length > 0) {
    patch.activity_tags = result.activity_tags.map((t) => t.toLowerCase().replace(/\s+/g, "-")).slice(0, 6);
  }
  if (!video.budget_tag && result.budget_tag) patch.budget_tag = result.budget_tag;

  if (Object.keys(patch).length === 0) return;
  const { error: updErr } = await supabaseAdmin.from("videos").update(patch).eq("id", videoId);
  if (updErr) console.error("[ai] update failed", updErr.message);
}

export const autoTagVideo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ videoId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await runAutoTag(data.videoId);
    return { ok: true };
  });