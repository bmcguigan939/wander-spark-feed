import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Per-business pinned OTA listing URLs. When a business pastes the exact
 * URL of their property/activity on Booking.com, Expedia etc., the
 * price-match scanner uses it directly instead of guessing via search —
 * giving a like-for-like comparison (same property, same room/ticket,
 * same dates, same pax).
 */

export const COMPETITOR_NETWORKS = [
  "booking.com",
  "expedia",
  "agoda",
  "getyourguide",
  "viator",
  "airbnb",
  "vrbo",
  "tripadvisor",
  "klook",
  "tiqets",
  "musement",
] as const;
export type CompetitorNetwork = (typeof COMPETITOR_NETWORKS)[number];

/** Allowed hostnames per network. Hostname must equal one of these or end with `.{host}`. */
const NETWORK_HOSTS: Record<CompetitorNetwork, string[]> = {
  "booking.com": ["booking.com"],
  expedia: ["expedia.com", "expedia.co.uk", "expedia.de", "expedia.fr", "expedia.ca", "expedia.com.au"],
  agoda: ["agoda.com"],
  getyourguide: ["getyourguide.com", "getyourguide.co.uk", "getyourguide.de", "getyourguide.fr"],
  viator: ["viator.com"],
  airbnb: ["airbnb.com", "airbnb.co.uk", "airbnb.de", "airbnb.fr", "airbnb.es", "airbnb.it"],
  vrbo: ["vrbo.com", "vrbo.co.uk"],
  tripadvisor: ["tripadvisor.com", "tripadvisor.co.uk", "tripadvisor.de", "tripadvisor.fr", "tripadvisor.es"],
  klook: ["klook.com"],
  tiqets: ["tiqets.com"],
  musement: ["musement.com"],
};

/** Network-specific URL-shape sanity checks. Reject search-result URLs that
 *  point at city/region listings instead of a single property page. */
const NETWORK_SHAPE: Partial<Record<CompetitorNetwork, RegExp>> = {
  "booking.com": /\/hotel\/[a-z]{2}\/[^/?#]+\.(html|en|en-gb)/i,
  expedia: /\/(h\d+\.|hotels\/[^/?#]+\/[^/?#]+|activities\/)/i,
  agoda: /\/[^/?#]+\/hotel\/[^/?#]+\.html/i,
  getyourguide: /-t?\d{3,}\/?/i, // GYG slug ends with -tNNN or -lNNN
  viator: /-d\d+-/i, // Viator product URLs contain -dNNN-
  airbnb: /\/(rooms|h)\/\d+/i,
  vrbo: /\/\d+[a-z]{0,3}\b/i,
  tripadvisor: /-(d|g)\d+-/i,
  klook: /\/activity\/\d+/i,
  tiqets: /\/(products|attractions|cities)\/[^/?#]+/i,
  musement: /\/(activities|venues)\/[^/?#]+/i,
};

function hostOf(url: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function hostMatchesNetwork(host: string, network: CompetitorNetwork): boolean {
  return NETWORK_HOSTS[network].some((h) => host === h || host.endsWith(`.${h}`));
}

function validateCompetitorUrl(
  network: CompetitorNetwork,
  raw: string,
): { ok: true; normalised: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "URL is required" };
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { ok: false, error: "Not a valid URL" };
  }
  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  if (!hostMatchesNetwork(host, network)) {
    return {
      ok: false,
      error: `URL must be on ${NETWORK_HOSTS[network][0]} (got ${host})`,
    };
  }
  const shape = NETWORK_SHAPE[network];
  if (shape && !shape.test(parsed.pathname + parsed.search)) {
    return {
      ok: false,
      error:
        "That looks like a search-results page, not a single property/activity page. Open the listing itself and copy that URL.",
    };
  }
  return { ok: true, normalised: parsed.toString() };
}

/** Used by the scanner. Returns all pinned URLs for a business, keyed by network. */
export async function getPinnedCompetitorUrls(
  businessId: string,
): Promise<Map<string, { url: string; verified_at: string | null }>> {
  const { data } = await supabaseAdmin
    .from("business_competitor_urls")
    .select("network,url,verified_at")
    .eq("business_id", businessId);
  const map = new Map<string, { url: string; verified_at: string | null }>();
  for (const row of data ?? []) {
    map.set(row.network, { url: row.url, verified_at: row.verified_at });
  }
  return map;
}

// ----------------------------- Server fns -----------------------------

export const listMyCompetitorUrls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("business_competitor_urls")
      .select("*")
      .eq("business_id", context.userId)
      .order("network", { ascending: true });
    if (error) throw new Error(error.message);
    return { urls: data ?? [], networks: COMPETITOR_NETWORKS };
  });

const upsertSchema = z.object({
  network: z.enum(COMPETITOR_NETWORKS),
  url: z.string().trim().min(8).max(1024),
});

export const upsertMyCompetitorUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => upsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const v = validateCompetitorUrl(data.network, data.url);
    if (!v.ok) throw new Error(v.error);
    const { error } = await supabaseAdmin
      .from("business_competitor_urls")
      .upsert(
        {
          business_id: context.userId,
          network: data.network,
          url: v.normalised,
          // reset verification state — re-verified by next scan
          verified_at: null,
          verified_title: null,
          last_status: null,
          last_error: null,
        },
        { onConflict: "business_id,network" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, url: v.normalised };
  });

export const deleteMyCompetitorUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ network: z.enum(COMPETITOR_NETWORKS) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("business_competitor_urls")
      .delete()
      .eq("business_id", context.userId)
      .eq("network", data.network);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Exposes hostname helpers to the scanner without leaking the validator module. */
export function networkHostMatches(network: string, host: string): boolean {
  const n = network as CompetitorNetwork;
  if (!NETWORK_HOSTS[n]) return false;
  return hostMatchesNetwork(host, n);
}

export { hostOf };

/** Scanner-side writeback for pinned URL health. Called by the price-match
 *  scanner after each scrape attempt so the OTA editor can surface broken /
 *  wrong-domain / no-price pins. */
export async function recordPinnedUrlStatus(
  businessId: string,
  network: string,
  status: "verified" | "no_price" | "broken" | "wrong_domain",
  error?: string | null,
  verifiedTitle?: string | null,
): Promise<void> {
  const patch: Record<string, unknown> = {
    last_status: status,
    last_error: error ?? null,
  };
  if (status === "verified") {
    patch.verified_at = new Date().toISOString();
    if (verifiedTitle) patch.verified_title = verifiedTitle;
  }
  await supabaseAdmin
    .from("business_competitor_urls")
    .update(patch)
    .eq("business_id", businessId)
    .eq("network", network);
}