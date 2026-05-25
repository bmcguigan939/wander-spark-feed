import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkRateLimit } from "@/lib/rate-limit.server";
import { setResponseHeaders } from "@tanstack/react-start/server";

// Country/city overview pages get heavy SEO traffic. Short TTL + long SWR
// so the edge absorbs spikes while origin refreshes in the background.
const PUBLIC_READ_CACHE = "public, s-maxage=120, stale-while-revalidate=900";

export const listDestinations = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeaders(new Headers({ "Cache-Control": PUBLIC_READ_CACHE }));
  const { data, error } = await supabaseAdmin
    .from("videos")
    .select("country,city,thumbnail_url")
    .eq("status", "ready")
    .not("country", "is", null)
    .limit(500);
  if (error) throw new Error(error.message);

  const countries = new Map<string, { country: string; videoCount: number; cities: Set<string>; cover: string | null }>();
  for (const row of data ?? []) {
    const c = row.country as string | null;
    if (!c) continue;
    const entry = countries.get(c) ?? { country: c, videoCount: 0, cities: new Set<string>(), cover: null };
    entry.videoCount += 1;
    if (row.city) entry.cities.add(row.city);
    if (!entry.cover && row.thumbnail_url) entry.cover = row.thumbnail_url as string;
    countries.set(c, entry);
  }
  return {
    countries: Array.from(countries.values())
      .map((e) => ({ country: e.country, videoCount: e.videoCount, cityCount: e.cities.size, cover: e.cover }))
      .sort((a, b) => b.videoCount - a.videoCount),
  };
});

export const getDestination = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ country: z.string().min(1).max(100), city: z.string().min(1).max(100).optional() }).parse(input)
  )
  .handler(async ({ data }) => {
    setResponseHeaders(new Headers({ "Cache-Control": PUBLIC_READ_CACHE }));
    let q = supabaseAdmin
      .from("videos")
      .select(
        "id,title,description,mux_playback_id,thumbnail_url,destination,country,city,activity_tags,budget_tag,like_count,save_count,view_count,created_at,creator:profiles!videos_creator_id_fkey(id,username,display_name,avatar_url)"
      )
      .eq("status", "ready")
      .ilike("country", data.country);
    if (data.city) q = q.ilike("city", data.city);
    q = q.order("like_count", { ascending: false }).order("created_at", { ascending: false }).limit(60);
    const { data: videos, error } = await q;
    if (error) throw new Error(error.message);

    const cities = new Map<string, number>();
    if (!data.city) {
      for (const v of videos ?? []) {
        const c = (v as { city: string | null }).city;
        if (c) cities.set(c, (cities.get(c) ?? 0) + 1);
      }
    }
    return {
      videos: (videos ?? []) as any[],
      cities: Array.from(cities.entries()).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count),
    };
  });

const OverviewInput = z.object({
  country: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
});

export const getDestinationOverview = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => OverviewInput.parse(input))
  .handler(async ({ data }) => {
    setResponseHeaders(new Headers({ "Cache-Control": PUBLIC_READ_CACHE }));
    const { country, city } = data;

    const [{ data: videos, error: vErr }, { data: summary }, { data: deals }] = await Promise.all([
      supabaseAdmin
        .from("videos")
        .select(
          "id,title,thumbnail_url,mux_playback_id,activity_tags,like_count,save_count,view_count,created_at,creator_id,creator:profiles!videos_creator_id_fkey(id,username,display_name,avatar_url)"
        )
        .eq("status", "ready")
        .ilike("country", country)
        .ilike("city", city)
        .order("like_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(24),
      supabaseAdmin
        .from("destination_summaries")
        .select("summary,highlights,best_time,generated_at")
        .ilike("country", country)
        .ilike("city", city)
        .maybeSingle(),
      supabaseAdmin
        .from("deals")
        .select("id,title,image_url,discount_label,price_cents,currency,url,country,city")
        .eq("is_active", true)
        .ilike("country", country)
        .ilike("city", city)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);
    if (vErr) throw new Error(vErr.message);

    type CreatorAgg = {
      id: string;
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
      video_count: number;
      total_likes: number;
    };
    const creators = new Map<string, CreatorAgg>();
    let totalLikes = 0;
    for (const v of (videos ?? []) as any[]) {
      totalLikes += v.like_count ?? 0;
      const c = v.creator;
      if (!c) continue;
      const entry = creators.get(c.id) ?? {
        id: c.id, username: c.username, display_name: c.display_name, avatar_url: c.avatar_url,
        video_count: 0, total_likes: 0,
      };
      entry.video_count += 1;
      entry.total_likes += v.like_count ?? 0;
      creators.set(c.id, entry);
    }
    const topCreators = Array.from(creators.values())
      .sort((a, b) => b.total_likes - a.total_likes || b.video_count - a.video_count)
      .slice(0, 6);

    return {
      videos: (videos ?? []) as any[],
      summary: summary ?? null,
      deals: (deals ?? []) as any[],
      topCreators,
      stats: {
        videos: (videos ?? []).length,
        creators: creators.size,
        likes: totalLikes,
      },
    };
  });

const OverviewSchema = z.object({
  summary: z.string().min(20).max(600),
  highlights: z.array(z.string().min(2).max(80)).min(3).max(6),
  best_time: z.string().min(2).max(120),
});

async function buildAndStoreOverview(country: string, city: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured");

  const { data: vids } = await supabaseAdmin
    .from("videos")
    .select("title,activity_tags")
    .eq("status", "ready")
    .ilike("country", country)
    .ilike("city", city)
    .order("like_count", { ascending: false })
    .limit(12);

  const ctx = (vids ?? [])
    .map((v: any) => `- ${v.title}${v.activity_tags?.length ? ` [${v.activity_tags.join(", ")}]` : ""}`)
    .join("\n");

  const prompt = `Write a concise traveler overview for ${city}, ${country}.
${ctx ? `Recent traveler videos there:\n${ctx}\n` : ""}
Return JSON: { "summary": string (2-3 sentences, evocative but practical),
"highlights": string[] (3-6 short tags like "Old Town", "Rice terraces"),
"best_time": string (e.g. "Apr-Jun & Sep-Oct") }`;

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
        { role: "system", content: "You are a travel guide editor. Reply ONLY with valid JSON matching the schema." },
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
  const parsed = OverviewSchema.parse(JSON.parse(raw));

  const { data: row, error: upErr } = await supabaseAdmin
    .from("destination_summaries")
    .upsert(
      {
        country,
        city,
        summary: parsed.summary,
        highlights: parsed.highlights,
        best_time: parsed.best_time,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "country,city" },
    )
    .select("summary,highlights,best_time,generated_at")
    .single();
  if (upErr) throw new Error(upErr.message);
  return row;
}

export const generateDestinationOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => OverviewInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await (supabaseAdmin as any).rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const ok = await checkRateLimit("dest_overview_generate", context.userId, 10, 60);
    if (!ok) throw new Error("Generating overviews too quickly — please wait.");
    return buildAndStoreOverview(data.country, data.city);
  });

// Admin-only batch: find (country,city) pairs with >= minVideos and no/stale summary,
// then generate up to `limit` of them. Best-effort, sequential to respect rate limits.
export const backfillDestinationSummaries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(20).default(5),
        minVideos: z.number().int().min(1).max(20).default(3),
        staleDays: z.number().int().min(1).max(365).default(30),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await (supabaseAdmin as any).rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    // Aggregate video counts by (country, city) in memory (RLS-friendly admin scope).
    const { data: rows } = await supabaseAdmin
      .from("videos")
      .select("country,city")
      .eq("status", "ready")
      .eq("is_draft", false)
      .eq("is_hidden", false)
      .not("country", "is", null)
      .not("city", "is", null)
      .limit(5000);
    const counts = new Map<string, { country: string; city: string; n: number }>();
    for (const r of rows ?? []) {
      const key = `${(r.country ?? "").toLowerCase()}|${(r.city ?? "").toLowerCase()}`;
      const e = counts.get(key) ?? { country: r.country as string, city: r.city as string, n: 0 };
      e.n += 1;
      counts.set(key, e);
    }
    const eligible = Array.from(counts.values())
      .filter((e) => e.n >= data.minVideos)
      .sort((a, b) => b.n - a.n);

    const { data: existing } = await supabaseAdmin
      .from("destination_summaries")
      .select("country,city,generated_at");
    const staleCutoff = Date.now() - data.staleDays * 86400000;
    const fresh = new Set(
      (existing ?? [])
        .filter((e: any) => new Date(e.generated_at).getTime() >= staleCutoff)
        .map((e: any) => `${e.country.toLowerCase()}|${e.city.toLowerCase()}`),
    );

    const todo = eligible.filter((e) => !fresh.has(`${e.country.toLowerCase()}|${e.city.toLowerCase()}`)).slice(0, data.limit);
    const results: Array<{ country: string; city: string; ok: boolean; error?: string }> = [];
    for (const t of todo) {
      try {
        await buildAndStoreOverview(t.country, t.city);
        results.push({ country: t.country, city: t.city, ok: true });
      } catch (e: any) {
        results.push({ country: t.country, city: t.city, ok: false, error: e?.message ?? String(e) });
      }
    }
    return { attempted: todo.length, ok: results.filter((r) => r.ok).length, results };
  });