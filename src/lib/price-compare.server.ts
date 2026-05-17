import Firecrawl from "@mendable/firecrawl-js";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CompetitorQuote = {
  network: string;
  url: string;
  price_cents: number;
  currency: string;
  evidence_url: string | null;
  evidence_hash: string;
  fetched_at: string;
};

const NETWORK_QUERIES: { network: string; site: string }[] = [
  { network: "booking.com", site: "booking.com" },
  { network: "expedia", site: "expedia.com" },
  { network: "agoda", site: "agoda.com" },
  { network: "getyourguide", site: "getyourguide.com" },
  { network: "viator", site: "viator.com" },
];

const PRICE_SCHEMA = {
  type: "object",
  properties: {
    price: { type: "number", description: "Total price the traveller pays, in the listed currency" },
    currency: { type: "string", description: "ISO 4217 currency code, e.g. GBP, USD, EUR" },
    available: { type: "boolean" },
  },
  required: ["price", "currency"],
};

function hash(payload: string) {
  return createHash("sha256").update(payload).digest("hex");
}

function getFirecrawl(): Firecrawl | null {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;
  return new Firecrawl({ apiKey });
}

function toCents(price: number, currency: string): number {
  // Most currencies use 2 decimals; JPY etc. use 0. Keep it simple — 2 dp.
  void currency;
  return Math.round(price * 100);
}

async function scrapeOne(
  firecrawl: Firecrawl,
  network: string,
  url: string,
): Promise<CompetitorQuote | null> {
  try {
    const result = (await Promise.race([
      firecrawl.scrape(url, {
        formats: [
          { type: "json", schema: PRICE_SCHEMA, prompt: "Extract the lowest total bookable price visible on this page for the default dates/party size." } as any,
          "screenshot",
        ],
        onlyMainContent: true,
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
    ])) as any;
    const json = result?.json ?? result?.data?.json;
    if (!json || typeof json.price !== "number") return null;
    const currency = (json.currency || "GBP").toString().toUpperCase();
    const price_cents = toCents(json.price, currency);
    const screenshot: string | null =
      result?.screenshot ?? result?.data?.screenshot ?? null;
    const fetched_at = new Date().toISOString();
    return {
      network,
      url,
      price_cents,
      currency,
      evidence_url: typeof screenshot === "string" ? screenshot : null,
      evidence_hash: hash(
        JSON.stringify({ url, network, price_cents, currency, fetched_at, screenshot: screenshot ?? null }),
      ),
      fetched_at,
    };
  } catch {
    return null;
  }
}

async function searchCompetitorUrls(
  firecrawl: Firecrawl,
  query: string,
  site: string,
): Promise<string | null> {
  try {
    const result = (await Promise.race([
      firecrawl.search(`${query} site:${site}`, { limit: 1 }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 5000)),
    ])) as any;
    const items = result?.web ?? result?.data ?? [];
    const first = Array.isArray(items) ? items[0] : null;
    return first?.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Check the cache for fresh price quotes for a link, and refresh stale ones
 * by scraping. Returns the cheapest competitor quote (or null if no data).
 * Also writes a row to parity_checks documenting what was checked.
 */
export async function runParityCheck(args: {
  link_id: string;
  direct_price_cents: number | null;
  query: string; // e.g. "Hotel Foo London"
}): Promise<{
  cheapest: CompetitorQuote | null;
  quotes: CompetitorQuote[];
}> {
  const firecrawl = getFirecrawl();
  if (!firecrawl) {
    await supabaseAdmin.from("parity_checks").insert({
      link_id: args.link_id,
      providers_checked: [],
      direct_price_cents: args.direct_price_cents,
      action: "no_data",
    });
    return { cheapest: null, quotes: [] };
  }

  // 1. Read fresh cache
  const { data: cached } = await supabaseAdmin
    .from("price_quotes")
    .select("*")
    .eq("link_id", args.link_id);

  const now = Date.now();
  const fresh: CompetitorQuote[] = [];
  const staleNetworks = new Set(NETWORK_QUERIES.map((n) => n.network));

  for (const row of cached ?? []) {
    const age = (now - new Date(row.fetched_at).getTime()) / 1000;
    if (age < row.ttl_seconds) {
      fresh.push({
        network: row.network,
        url: row.url,
        price_cents: row.price_cents,
        currency: row.currency,
        evidence_url: row.evidence_url,
        evidence_hash: row.evidence_hash ?? "",
        fetched_at: row.fetched_at,
      });
      staleNetworks.delete(row.network);
    }
  }

  // 2. Refresh stale networks in parallel
  const toRefresh = NETWORK_QUERIES.filter((n) => staleNetworks.has(n.network));
  const refreshed = await Promise.all(
    toRefresh.map(async ({ network, site }) => {
      const url = await searchCompetitorUrls(firecrawl, args.query, site);
      if (!url) return null;
      return scrapeOne(firecrawl, network, url);
    }),
  );

  const allQuotes = [...fresh];
  for (const q of refreshed) {
    if (!q) continue;
    allQuotes.push(q);
    // Cache it
    await supabaseAdmin.from("price_quotes").insert({
      link_id: args.link_id,
      network: q.network,
      url: q.url,
      price_cents: q.price_cents,
      currency: q.currency,
      evidence_url: q.evidence_url,
      evidence_hash: q.evidence_hash,
      source: "firecrawl",
      ttl_seconds: 900,
    });
  }

  const cheapest =
    allQuotes.length === 0
      ? null
      : allQuotes.reduce((a, b) => (a.price_cents <= b.price_cents ? a : b));

  let action: "no_breach" | "match_issued" | "no_data" = "no_data";
  if (!cheapest) action = "no_data";
  else if (args.direct_price_cents == null) action = "no_data";
  else if (args.direct_price_cents != null && args.direct_price_cents <= cheapest.price_cents)
    action = "no_breach";
  else action = "match_issued";

  await supabaseAdmin.from("parity_checks").insert({
    link_id: args.link_id,
    providers_checked: allQuotes.map((q) => q.network),
    cheapest_network: cheapest?.network ?? null,
    cheapest_price_cents: cheapest?.price_cents ?? null,
    direct_price_cents: args.direct_price_cents,
    action,
  });

  return { cheapest, quotes: allQuotes };
}