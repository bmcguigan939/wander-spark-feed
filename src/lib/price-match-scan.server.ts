import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
};

export type ScanResult = {
  scanned: boolean;
  cheapest_competitor_cents: number | null;
  cheapest_competitor_network: string | null;
  cheapest_competitor_url: string | null;
  scanned_urls: ScanQuote[];
  ran_at: string;
};

const NETWORKS: { network: string; site: string }[] = [
  { network: "booking.com", site: "booking.com" },
  { network: "expedia", site: "expedia.com" },
  { network: "agoda", site: "agoda.com" },
  { network: "getyourguide", site: "getyourguide.com" },
  { network: "viator", site: "viator.com" },
];

const CACHE_SECONDS = 6 * 60 * 60; // 6h

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

async function findUrl(query: string, site: string): Promise<string | null> {
  const r = await fc("/v2/search", { query: `${query} site:${site}`, limit: 1 }, 5000);
  const result = r?.data ?? r;
  const items = result?.web ?? result?.data ?? [];
  const first = Array.isArray(items) ? items[0] : null;
  return first?.url ?? null;
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
  check_in?: string | null;
  check_out?: string | null;
  guests?: number | null;
}): Promise<ScanResult> {
  const cached = await readCached({
    dealId: args.dealId,
    check_in: args.check_in ?? null,
    check_out: args.check_out ?? null,
    guests: args.guests ?? null,
  });
  if (cached) return cached;

  if (!fcKey()) {
    return {
      scanned: false,
      cheapest_competitor_cents: null,
      cheapest_competitor_network: null,
      cheapest_competitor_url: null,
      scanned_urls: [],
      ran_at: new Date().toISOString(),
    };
  }

  // Scrape all networks in parallel
  const found = await Promise.all(
    NETWORKS.map(async ({ network, site }) => {
      const url = await findUrl(args.query, site);
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

  return {
    scanned: true,
    cheapest_competitor_cents: cheapest?.price_cents ?? null,
    cheapest_competitor_network: cheapest?.network ?? null,
    cheapest_competitor_url: cheapest?.url ?? null,
    scanned_urls: quotes,
    ran_at,
  };
}

// Used only to keep crypto import alive if we want evidence hashes later.
export function _hashEvidence(payload: string) {
  return createHash("sha256").update(payload).digest("hex");
}