import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DaySchema = z.object({
  day: z.number().int().min(1),
  title: z.string(),
  summary: z.string().optional().default(""),
  morning: z.string().optional().default(""),
  afternoon: z.string().optional().default(""),
  evening: z.string().optional().default(""),
  tips: z.array(z.string()).optional().default([]),
  suggestions: z
    .array(
      z.object({
        key: z.string(),
        kind: z.enum(["hotel", "activity", "tour", "restaurant", "experience"]),
        title: z.string(),
        query: z.string(),
        tags: z.array(z.string()).optional().default([]),
      }),
    )
    .optional()
    .default([]),
});

const PlanSchema = z.object({
  summary: z.string(),
  days: z.array(DaySchema),
});

const InputSchema = z.object({
  destination: z.string().min(1).max(120),
  days: z.number().int().min(1).max(14),
  interests: z.array(z.string().min(1).max(40)).max(10).default([]),
  budget_tag: z.enum(["budget", "mid-range", "luxury"]).optional(),
});

async function generatePlan(input: z.infer<typeof InputSchema>) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured");

  const prompt = `Build a ${input.days}-day travel itinerary for ${input.destination}.
Interests: ${input.interests.length ? input.interests.join(", ") : "general sightseeing"}.
Budget: ${input.budget_tag ?? "mid-range"}.
Return JSON matching this schema:
{
  "summary": string,
  "days": [{
    "day": number, "title": string, "summary": string,
    "morning": string, "afternoon": string, "evening": string,
    "tips": string[],
    "suggestions": [{
      "key": string,            // short stable id like "palma-cathedral"
      "kind": "hotel"|"activity"|"tour"|"restaurant"|"experience",
      "title": string,          // concrete name, e.g. "Uluwatu Sunset Kecak Tour"
      "query": string,          // 2-5 keyword search string for matching against bookings/videos
      "tags": string[]          // 2-4 lowercase tags, e.g. ["sunset","temple","bali"]
    }]
  }]
}
Rules:
- Each day MUST include 3-5 suggestions covering bookable things (1 hotel/stay + 2-4 activities or tours).
- Use REAL, specific, bookable place/tour names (no vague "go to a beach" — name the beach or operator).
- Each day distinct. Include 2-3 short practical tips per day.`;

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
        { role: "system", content: "You are an expert travel planner. Reply ONLY with valid JSON matching the schema." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("AI is rate-limited. Try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings.");
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) throw new Error("AI returned no content");
  return PlanSchema.parse(JSON.parse(raw));
}

type Suggestion = {
  key: string;
  kind: string;
  title: string;
  query: string;
  tags: string[];
  deal_matches?: Array<{
    id: string;
    title: string;
    image_url: string | null;
    price_cents: number | null;
    currency: string | null;
    affiliate_network: string | null;
  }>;
  video_matches?: Array<{
    id: string;
    title: string;
    thumbnail_url: string | null;
    username: string | null;
  }>;
};

function tsQuery(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 5)
    .join(" | ");
}

async function enrichSuggestion(
  s: Suggestion,
  destination: string,
): Promise<Suggestion> {
  const ilike = `%${s.query.split(/\s+/)[0] ?? s.title}%`;
  const dest = `%${destination.split(",")[0].trim()}%`;

  // Find matching deals (approved + active, matching destination + query/tags)
  const [{ data: dealsByText }, { data: dealsByTag }] = await Promise.all([
    supabaseAdmin
      .from("deals")
      .select("id,title,image_url,price_cents,currency,affiliate_network")
      .eq("status", "approved")
      .eq("is_active", true)
      .or(`title.ilike.${ilike},description.ilike.${ilike}`)
      .or(`destination.ilike.${dest},city.ilike.${dest},country.ilike.${dest}`)
      .limit(2),
    s.tags.length
      ? supabaseAdmin
          .from("deals")
          .select("id,title,image_url,price_cents,currency,affiliate_network")
          .eq("status", "approved")
          .eq("is_active", true)
          .or(`destination.ilike.${dest},city.ilike.${dest},country.ilike.${dest}`)
          .or(s.tags.map((t) => `title.ilike.%${t}%`).join(","))
          .limit(2)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const dealMap = new Map<string, any>();
  for (const d of [...(dealsByText ?? []), ...(dealsByTag ?? [])]) dealMap.set(d.id, d);
  const deal_matches = Array.from(dealMap.values()).slice(0, 2);

  // Find matching videos via full-text search
  const tsq = tsQuery(`${s.query} ${destination}`);
  let video_matches: Suggestion["video_matches"] = [];
  if (tsq) {
    const { data: vids } = await supabaseAdmin
      .from("videos")
      .select("id,title,thumbnail_url,creator_id")
      .eq("status", "ready")
      .eq("is_draft", false)
      .eq("is_hidden", false)
      .textSearch("search_tsv", tsq, { config: "simple" })
      .limit(2);
    if (vids && vids.length) {
      const creatorIds = Array.from(new Set(vids.map((v) => v.creator_id)));
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id,username")
        .in("id", creatorIds);
      const userMap = new Map((profs ?? []).map((p) => [p.id, p.username]));
      video_matches = vids.map((v) => ({
        id: v.id,
        title: v.title,
        thumbnail_url: v.thumbnail_url,
        username: userMap.get(v.creator_id) ?? null,
      }));
    }
  }

  return { ...s, deal_matches, video_matches };
}

async function enrichPlan(days: any[], destination: string): Promise<any[]> {
  return Promise.all(
    days.map(async (d) => {
      const suggestions: Suggestion[] = Array.isArray(d.suggestions) ? d.suggestions : [];
      const enriched = await Promise.all(
        suggestions.map((s) => enrichSuggestion(s, destination).catch(() => s)),
      );
      return { ...d, suggestions: enriched };
    }),
  );
}

export const generateItinerary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const plan = await generatePlan(data);
    const enrichedDays = await enrichPlan(plan.days, data.destination);
    const title = `${data.days}-day ${data.destination}`;
    const { data: row, error } = await supabaseAdmin
      .from("itineraries")
      .insert({
        user_id: userId,
        title,
        destination: data.destination,
        days: data.days,
        interests: data.interests,
        budget_tag: data.budget_tag ?? null,
        summary: plan.summary,
        plan: enrichedDays,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const listMyItineraries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("itineraries")
      .select("id,title,destination,days,budget_tag,summary,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const getItinerary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await supabaseAdmin
      .from("itineraries")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Itinerary not found");
    return { itinerary: row };
  });

export const deleteItinerary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("itineraries")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });