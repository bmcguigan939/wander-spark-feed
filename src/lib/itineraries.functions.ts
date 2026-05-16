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
Return JSON: { "summary": string, "days": [{ "day": number, "title": string, "summary": string, "morning": string, "afternoon": string, "evening": string, "tips": string[] }] }.
Make each day distinct, realistic for the destination, and include 2-3 short practical tips per day.`;

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

export const generateItinerary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const plan = await generatePlan(data);
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
        plan: plan.days,
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