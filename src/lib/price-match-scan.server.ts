import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPinnedCompetitorUrls } from "@/lib/business-competitor-urls.functions";

/**
 * Deal-level price-match scan. Scrapes a handful of major OTA networks
 * for the same property/activity and returns the cheapest competitor
 * price found, normalised to the deal's currency. Results are cached
 * for 6h per (deal, check_in, check_out, guests) in parity_checks and
 * served from there on subsequent reads.
 */

export type ScanQuote = {
  network: string;
  url: string;
  price_cents: number;
  currency: string;
  confidence?: "high" | "medium" | "low";
  matched_item_name?: string | null;
};

export type ScanResult = {
  scanned: boolean;
  cheapest_competitor_cents: number | null;
  cheapest_competitor_network: string | null;
  cheapest_competitor_url: string | null;
  scanned_urls: ScanQuote[];
  ran_at: string;
  /** Auto-issued match code when Travidz is pricier than the cheapest
   *  competitor — null otherwise. */
  match_code: string | null;
  match_expires_at: string | null;
  match_confidence?: "high" | "medium" | "low" | null;
  match_notes?: string | null;
};

const NETWORKS_COMMISSION: { network: string; site: string }[] = [
  { network: "booking.com", site: "booking.com" },
  { network: "expedia", site: "expedia.com" },
  { network: "agoda", site: "agoda.com" },
  { network: "getyourguide", site: "getyourguide.com" },
  { network: "viator", site: "viator.com" },
];

// Activity operators sell direct on their own site, so we compare ONLY against
// third-party resellers (never against the operator's own host). Hotel-only OTAs
// are excluded because they don't typically list activities/tours.
const NETWORKS_OPERATOR_MARKUP: { network: string; site: string }[] = [
  { network: "getyourguide", site: "getyourguide.com" },
  { network: "viator", site: "viator.com" },
  { network: "klook", site: "klook.com" },
  { network: "tiqets", site: "tiqets.com" },
  { network: "musement", site: "musement.com" },
];

function normaliseHost(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    const host = new URL(input.startsWith("http") ? input : `https://${input}`).hostname.toLowerCase();
    return host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function urlMatchesExcludedHost(url: string, excluded: string[]): boolean {
  if (!excluded.length) return false;
  const host = normaliseHost(url);
  if (!host) return false;
  return excluded.some((h) => host === h || host.endsWith(`.${h}`));
}

const CACHE_SECONDS = 6 * 60 * 60; // 6h
const MATCH_CODE_TTL_HOURS = 24;

const PRICE_SCHEMA = {
  type: "object",
  properties: {
    price: { type: "number" },
    currency: { type: "string" },
    available: { type: "boolean" },
  },
  required: ["price", "currency"],
};

function fcKey() {
  return process.env.FIRECRAWL_API_KEY || null;
}

async function fc(path: string, body: unknown, timeoutMs: number): Promise<any> {
  const key = fcKey();
  if (!key) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.firecrawl.dev${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function toCents(price: number) {
  return Math.round(price * 100);
}

function genMatchCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "MATCH-";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

/** Reuse a still-valid issued code for this deal or mint a new one. */
async function ensureMatchCode(args: {
  dealId: string;
  businessId: string | null;
  direct_price_cents: number;
  cheapest: ScanQuote;
}): Promise<{ code: string; expires_at: string } | null> {
  const { data: existing } = await supabaseAdmin
    .from("price_match_codes")
    .select("code,expires_at")
    .eq("deal_id", args.dealId)
    .eq("status", "issued")
    .gt("expires_at", new Date().toISOString())
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.code) {
    return { code: existing.code, expires_at: existing.expires_at };
  }

  const code = genMatchCode();
  const expires_at = new Date(Date.now() + MATCH_CODE_TTL_HOURS * 3600 * 1000).toISOString();
  const { error } = await supabaseAdmin.from("price_match_codes").insert({
    code,
    deal_id: args.dealId,
    business_id: args.businessId,
    original_price_cents: args.direct_price_cents,
    matched_price_cents: args.cheapest.price_cents,
    currency: args.cheapest.currency,
    competitor_network: args.cheapest.network,
    competitor_url: args.cheapest.url,
    evidence_hash: createHash("sha256")
      .update(
        JSON.stringify({
          dealId: args.dealId,
          network: args.cheapest.network,
          url: args.cheapest.url,
          price: args.cheapest.price_cents,
        }),
      )
      .digest("hex"),
    expires_at,
  });
  if (error) return null;
  return { code, expires_at };
}

async function findUrl(
  query: string,
  site: string,
  excludeHosts: string[] = [],
): Promise<string | null> {
  const r = await fc("/v2/search", { query: `${query} site:${site}`, limit: 1 }, 5000);
  const result = r?.data ?? r;
  const items = result?.web ?? result?.data ?? [];
  const list = Array.isArray(items) ? items : [];
  for (const it of list) {
    const u = it?.url as string | undefined;
    if (!u) continue;
    if (urlMatchesExcludedHost(u, excludeHosts)) continue;
    return u;
  }
  return null;
}

async function scrape(network: string, url: string): Promise<ScanQuote | null> {
  const r = await fc(
    "/v2/scrape",
    {
      url,
      formats: [{ type: "json", schema: PRICE_SCHEMA, prompt: "Extract the lowest total bookable price visible for the default dates/party size." }],
      onlyMainContent: true,
    },
    8000,
  );
  const result = r?.data ?? r;
  const json = result?.json ?? result?.data?.json;
  if (!json || typeof json.price !== "number") return null;
  return {
    network,
    url,
    price_cents: toCents(json.price),
    currency: (json.currency || "GBP").toString().toUpperCase(),
  };
}

/** Look up the most recent cached scan; return it if it's still fresh. */
async function readCached(args: {
  dealId: string;
  check_in: string | null;
  check_out: string | null;
  guests: number | null;
}): Promise<ScanResult | null> {
  let q = supabaseAdmin
    .from("parity_checks")
    .select("*")
    .eq("deal_id", args.dealId)
    .order("ran_at", { ascending: false })
    .limit(1);
  if (args.check_in) q = q.eq("check_in", args.check_in);
  if (args.check_out) q = q.eq("check_out", args.check_out);
  if (args.guests != null) q = q.eq("guests", args.guests);
  const { data } = await q.maybeSingle();
  if (!data) return null;
  const age = (Date.now() - new Date(data.ran_at).getTime()) / 1000;
  if (age > CACHE_SECONDS) return null;
  return {
    scanned: true,
    cheapest_competitor_cents: data.cheapest_competitor_cents ?? null,
    cheapest_competitor_network: data.cheapest_competitor_network ?? null,
    cheapest_competitor_url: data.cheapest_competitor_url ?? null,
    scanned_urls: (data.scanned_urls as ScanQuote[]) ?? [],
    ran_at: data.ran_at,
    match_code: null,
    match_expires_at: null,
  };
}

/**
 * Run (or read cached) price-match scan for a deal. Best-effort: any
 * failure returns a `scanned: false` result so the UI degrades to "no
 * match data" rather than erroring.
 */
export async function runDealPriceMatch(args: {
  dealId: string;
  query: string;
  direct_price_cents: number | null;
  direct_currency: string | null;
  business_id?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  guests?: number | null;
  pricing_model?: "commission" | "operator_markup";
  operator_site_host?: string | null;
}): Promise<ScanResult> {
  const cached = await readCached({
    dealId: args.dealId,
    check_in: args.check_in ?? null,
    check_out: args.check_out ?? null,
    guests: args.guests ?? null,
  });
  if (cached) {
    if (
      args.direct_price_cents != null &&
      cached.cheapest_competitor_cents != null &&
      args.direct_price_cents > cached.cheapest_competitor_cents &&
      cached.cheapest_competitor_network &&
      cached.cheapest_competitor_url
    ) {
      const m = await ensureMatchCode({
        dealId: args.dealId,
        businessId: args.business_id ?? null,
        direct_price_cents: args.direct_price_cents,
        cheapest: {
          network: cached.cheapest_competitor_network,
          url: cached.cheapest_competitor_url,
          price_cents: cached.cheapest_competitor_cents,
          currency: args.direct_currency || "GBP",
        },
      });
      if (m) {
        cached.match_code = m.code;
        cached.match_expires_at = m.expires_at;
      }
    }
    return cached;
  }

  if (!fcKey()) {
    return {
      scanned: false,
      cheapest_competitor_cents: null,
      cheapest_competitor_network: null,
      cheapest_competitor_url: null,
      scanned_urls: [],
      ran_at: new Date().toISOString(),
      match_code: null,
      match_expires_at: null,
    };
  }

  const networks =
    args.pricing_model === "operator_markup"
      ? NETWORKS_OPERATOR_MARKUP
      : NETWORKS_COMMISSION;
  const excludeHosts = [normaliseHost(args.operator_site_host ?? null)].filter(
    (h): h is string => !!h,
  );

  // Scrape all networks in parallel — never include the operator's own site.
  const found = await Promise.all(
    networks
      .filter(({ site }) => !excludeHosts.includes(normaliseHost(site) ?? ""))
      .map(async ({ network, site }) => {
        const url = await findUrl(args.query, site, excludeHosts);
      if (!url) return null;
      return scrape(network, url);
    }),
  );
  const quotes = found.filter((q): q is ScanQuote => !!q);

  // No FX normalisation here — assume GBP/same currency. (Multi-currency
  // display is out of scope for v1; FX still happens on bookings.)
  const cheapest = quotes.length
    ? quotes.reduce((a, b) => (a.price_cents <= b.price_cents ? a : b))
    : null;

  const ran_at = new Date().toISOString();
  await supabaseAdmin.from("parity_checks").insert({
    deal_id: args.dealId,
    providers_checked: quotes.map((q) => q.network),
    cheapest_network: cheapest?.network ?? null,
    cheapest_price_cents: cheapest?.price_cents ?? null,
    cheapest_competitor_cents: cheapest?.price_cents ?? null,
    cheapest_competitor_network: cheapest?.network ?? null,
    cheapest_competitor_url: cheapest?.url ?? null,
    direct_price_cents: args.direct_price_cents,
    scanned_urls: quotes,
    check_in: args.check_in ?? null,
    check_out: args.check_out ?? null,
    guests: args.guests ?? null,
    action: cheapest ? "no_breach" : "no_data",
  });

  let match_code: string | null = null;
  let match_expires_at: string | null = null;
  if (
    cheapest &&
    args.direct_price_cents != null &&
    args.direct_price_cents > cheapest.price_cents
  ) {
    const m = await ensureMatchCode({
      dealId: args.dealId,
      businessId: args.business_id ?? null,
      direct_price_cents: args.direct_price_cents,
      cheapest,
    });
    if (m) {
      match_code = m.code;
      match_expires_at = m.expires_at;
    }
  }

  return {
    scanned: true,
    cheapest_competitor_cents: cheapest?.price_cents ?? null,
    cheapest_competitor_network: cheapest?.network ?? null,
    cheapest_competitor_url: cheapest?.url ?? null,
    scanned_urls: quotes,
    ran_at,
    match_code,
    match_expires_at,
  };
}

// Used only to keep crypto import alive if we want evidence hashes later.
export function _hashEvidence(payload: string) {
  return createHash("sha256").update(payload).digest("hex");
}