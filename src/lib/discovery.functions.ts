import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ----------------------------------------------------------------------------
// Affiliate-friendly suppliers we recognise. URLs from anywhere else are still
// ingested but stored with affiliate_network=null (no commission wrapping).
// ----------------------------------------------------------------------------
const NETWORK_RULES: Array<{ network: string; match: RegExp }> = [
  { network: "getyourguide", match: /(^|\.)getyourguide\.com$/i },
  { network: "viator", match: /(^|\.)viator\.com$/i },
  { network: "booking", match: /(^|\.)booking\.com$/i },
  { network: "tiqets", match: /(^|\.)tiqets\.com$/i },
  { network: "klook", match: /(^|\.)klook\.com$/i },
  { network: "expedia", match: /(^|\.)expedia\.[a-z.]+$/i },
];

function inferNetwork(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    for (const r of NETWORK_RULES) if (r.match.test(host)) return r.network;
    return null;
  } catch {
    return null;
  }
}

// Allow-list filter for cron pipeline (avoid junk pages).
function isAffiliateFriendly(url: string): boolean {
  return inferNetwork(url) !== null;
}

// ----------------------------------------------------------------------------
// Firecrawl search wrapper (server-only). Returns ranked SERP results with
// markdown bodies populated in a single call.
// ----------------------------------------------------------------------------
type SearchHit = { url: string; title: string; description?: string; markdown?: string };

async function firecrawlSearch(query: string, limit = 10): Promise<SearchHit[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query,
      limit,
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Firecrawl ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json: any = await res.json().catch(() => ({}));
  const raw: any[] = json?.data?.web ?? json?.data ?? json?.web ?? [];
  return raw
    .map((r) => ({
      url: r.url as string,
      title: (r.title ?? "") as string,
      description: r.description as string | undefined,
      markdown: (r.markdown ?? r.content) as string | undefined,
    }))
    .filter((r) => typeof r.url === "string" && r.url.startsWith("http"));
}

// ----------------------------------------------------------------------------
// Lovable AI extraction. Returns a structured deal candidate or null if the
// page doesn't look like a single bookable activity/stay.
// ----------------------------------------------------------------------------
type Extracted = {
  title: string;
  description: string | null;
  city: string | null;
  country: string | null;
  activity_tags: string[];
  price_cents: number | null;
  currency: string | null;
  ai_summary: string;
  ai_confidence: number;
};

async function extractDeal(hit: SearchHit): Promise<Extracted | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
  const md = (hit.markdown ?? hit.description ?? "").slice(0, 6000);
  if (md.length < 80) return null;
  const sys = `You extract structured travel deals from a single web page.
Return ONLY valid JSON matching the schema. If the page is NOT a single
bookable activity, tour, ticket, or stay (e.g. a category list, a blog
round-up, a home page), set ai_confidence below 0.4.`;
  const user = `URL: ${hit.url}\nTITLE: ${hit.title}\n\nPAGE:\n${md}\n\nReturn JSON:
{"title":string,"description":string|null,"city":string|null,"country":string|null,
"activity_tags":string[],"price_cents":number|null,"currency":string|null,
"ai_summary":string,"ai_confidence":number}`;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) return null;
  const json: any = await res.json().catch(() => null);
  const txt: string | undefined = json?.choices?.[0]?.message?.content;
  if (!txt) return null;
  try {
    const parsed = JSON.parse(txt);
    if (typeof parsed.title !== "string" || !parsed.title.trim()) return null;
    return {
      title: String(parsed.title).slice(0, 200),
      description: parsed.description ? String(parsed.description).slice(0, 1200) : null,
      city: parsed.city ?? null,
      country: parsed.country ?? null,
      activity_tags: Array.isArray(parsed.activity_tags)
        ? parsed.activity_tags.slice(0, 8).map((t: unknown) => String(t).toLowerCase().slice(0, 32))
        : [],
      price_cents:
        typeof parsed.price_cents === "number" && parsed.price_cents > 0
          ? Math.round(parsed.price_cents)
          : null,
      currency: parsed.currency ? String(parsed.currency).slice(0, 6).toUpperCase() : null,
      ai_summary: String(parsed.ai_summary ?? "").slice(0, 400),
      ai_confidence: Math.max(0, Math.min(1, Number(parsed.ai_confidence) || 0)),
    };
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// Quality grader. Scores price competitiveness, photo/media richness, review
// signals, refundability, and clarity. Returns a 0..1 score + list of reasons.
// ----------------------------------------------------------------------------
type QualityResult = {
  quality_score: number;
  reasons: string[];
};

async function gradeQuality(hit: SearchHit, extracted: Extracted): Promise<QualityResult | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return null;
  const md = (hit.markdown ?? hit.description ?? "").slice(0, 4000);
  if (md.length < 80) return null;
  const sys = `You score the quality of a travel deal landing page on a 0..1 scale.
Consider: price competitiveness vs. typical market, photo/media richness, review
count and rating, free cancellation / refundability, clarity of what's included.
Return ONLY JSON: {"quality_score": number, "reasons": string[]} where reasons
are short tags like "no_reviews", "free_cancellation", "high_rating", "expensive",
"rich_photos", "vague_inclusions". Max 5 reasons.`;
  const user = `TITLE: ${extracted.title}\nPRICE: ${extracted.price_cents ?? "unknown"} ${extracted.currency ?? ""}\nCITY: ${extracted.city ?? ""}\n\nPAGE:\n${md}`;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) return null;
  const json: any = await res.json().catch(() => null);
  const txt: string | undefined = json?.choices?.[0]?.message?.content;
  if (!txt) return null;
  try {
    const parsed = JSON.parse(txt);
    return {
      quality_score: Math.max(0, Math.min(1, Number(parsed.quality_score) || 0)),
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 5).map((r: unknown) => String(r).slice(0, 40)) : [],
    };
  } catch {
    return null;
  }
}

// Pre-reject deals scoring below this; they never enter the admin queue.
const QUALITY_REJECT_THRESHOLD = 0.3;

// Canonicalise URL for dedupe: strip query + trailing slash.
function canon(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return url;
  }
}

// ----------------------------------------------------------------------------
// Public: discovery cycle. One call per cron tick. Rate-limited globally.
// ----------------------------------------------------------------------------
const SEED_QUERIES = [
  "best things to do in Lisbon site:getyourguide.com OR site:viator.com OR site:tiqets.com",
  "top tours in Bali site:klook.com OR site:viator.com OR site:getyourguide.com",
  "best activities in Tokyo site:klook.com OR site:viator.com OR site:tiqets.com",
  "things to do in Barcelona site:getyourguide.com OR site:tiqets.com",
  "best tours in Mexico City site:viator.com OR site:getyourguide.com",
  "things to do in Rome site:tiqets.com OR site:getyourguide.com",
  "best activities in Bangkok site:klook.com OR site:viator.com",
  "things to do in New York site:viator.com OR site:tiqets.com",
];

async function ingestCandidates(
  hits: SearchHit[],
  runId: string | null,
  opts: { autoApproveThreshold?: number } = {},
): Promise<{ inserted: number; skippedDuplicate: number; errors: string[] }> {
  const threshold = opts.autoApproveThreshold ?? 0.75;
  let inserted = 0;
  let skippedDuplicate = 0;
  const errors: string[] = [];

  // Dedupe by canonical URL within this batch.
  const seen = new Set<string>();
  const filtered = hits.filter((h) => {
    if (!isAffiliateFriendly(h.url)) return false;
    const c = canon(h.url);
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });

  for (const hit of filtered) {
    try {
      const c = canon(hit.url);
      const { data: existing } = await supabaseAdmin
        .from("deals")
        .select("id")
        .eq("original_url", c)
        .maybeSingle();
      if (existing) {
        await supabaseAdmin
          .from("deals")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", existing.id);
        skippedDuplicate += 1;
        continue;
      }
      const extracted = await extractDeal(hit);
      if (!extracted || extracted.ai_confidence < 0.4) continue;
      // Grade quality. Skip if below reject threshold.
      const quality = await gradeQuality(hit, extracted);
      if (quality && quality.quality_score < QUALITY_REJECT_THRESHOLD) {
        skippedDuplicate += 0; // not a dup; just track silently
        continue;
      }
      const network = inferNetwork(hit.url);
      const status = extracted.ai_confidence >= threshold ? "approved" : "pending_review";
      const { error } = await supabaseAdmin.from("deals").insert({
        title: extracted.title,
        description: extracted.description,
        url: hit.url,
        original_url: c,
        destination: [extracted.city, extracted.country].filter(Boolean).join(", ") || null,
        city: extracted.city,
        country: extracted.country,
        price_cents: extracted.price_cents,
        currency: extracted.currency ?? "USD",
        source: "ai_discovered",
        status,
        affiliate_network: network,
        ai_confidence: extracted.ai_confidence,
        ai_summary: extracted.ai_summary,
        quality_score: quality?.quality_score ?? null,
        quality_reasons: quality?.reasons ?? [],
        discovered_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        is_active: true,
      });
      if (error) {
        errors.push(error.message);
        continue;
      }
      inserted += 1;
    } catch (e: any) {
      errors.push(String(e?.message ?? e).slice(0, 200));
    }
  }

  if (runId) {
    await supabaseAdmin
      .from("deal_discovery_runs")
      .update({
        finished_at: new Date().toISOString(),
        candidates_found: filtered.length,
        inserted,
        skipped_duplicate: skippedDuplicate,
        errors: errors.slice(0, 20),
      })
      .eq("id", runId);
  }

  return { inserted, skippedDuplicate, errors };
}

export async function runDiscoveryCycle(): Promise<{ ok: true; inserted: number; query: string }> {
  const query = SEED_QUERIES[Math.floor(Math.random() * SEED_QUERIES.length)];
  const { data: run } = await supabaseAdmin
    .from("deal_discovery_runs")
    .insert({ query })
    .select("id")
    .single();
  const hits = await firecrawlSearch(query, 10);
  const out = await ingestCandidates(hits, run?.id ?? null);
  return { ok: true, inserted: out.inserted, query };
}

// ----------------------------------------------------------------------------
// Live, per-video discovery (used by suggestDealsForVideo when DB is sparse).
// ----------------------------------------------------------------------------
export async function discoverForVideo(input: {
  city: string | null;
  country: string | null;
  destination: string | null;
  tags: string[];
}): Promise<number> {
  const place = input.city || input.destination || input.country;
  if (!place) return 0;
  const tagPart = input.tags.slice(0, 2).join(" ");
  const q = `things to do in ${place} ${tagPart} site:getyourguide.com OR site:viator.com OR site:tiqets.com`;
  let hits = await firecrawlSearch(q, 8);
  if (hits.filter((h) => isAffiliateFriendly(h.url)).length < 3) {
    hits = hits.concat(await firecrawlSearch(`things to do in ${place} ${tagPart}`, 6));
  }
  const out = await ingestCandidates(hits, null);
  return out.inserted;
}

// ----------------------------------------------------------------------------
// Admin moderation queue
// ----------------------------------------------------------------------------
async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listPendingDiscoveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("deals")
      .select("id,title,description,url,original_url,city,country,destination,price_cents,currency,affiliate_network,ai_confidence,ai_summary,quality_score,quality_reasons,discovered_at")
      .eq("source", "ai_discovered")
      .eq("status", "pending_review")
      .order("quality_score", { ascending: false, nullsFirst: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { deals: data ?? [] };
  });

export const approveDiscovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ dealId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("deals")
      .update({ status: "approved" })
      .eq("id", data.dealId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rejectDiscovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ dealId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("deals")
      .update({ status: "rejected", is_active: false })
      .eq("id", data.dealId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const runDiscoveryManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    return runDiscoveryCycle();
  });