import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Partner = {
  network: string;
  tracking_param: string | null;
  tracking_value: string | null;
  enabled: boolean;
  commission_pct: number | null;
};

let cache: { partners: Map<string, Partner>; expires: number } | null = null;
const TTL_MS = 60_000;

async function loadPartners(): Promise<Map<string, Partner>> {
  if (cache && cache.expires > Date.now()) return cache.partners;
  const { data } = await supabaseAdmin
    .from("affiliate_partners")
    .select("network,tracking_param,tracking_value,enabled,commission_pct");
  const map = new Map<string, Partner>();
  for (const row of data ?? []) map.set(row.network, row as Partner);
  cache = { partners: map, expires: Date.now() + TTL_MS };
  return map;
}

/**
 * Append our affiliate tracking + utm_source to a supplier URL.
 * If the network is unknown, disabled, or has no tracking_value configured,
 * the URL is returned unchanged (still legal — just no commission).
 */
export async function wrapWithAffiliate(
  url: string,
  network: string | null | undefined,
): Promise<string> {
  if (!network) return appendUtm(url);
  const partners = await loadPartners();
  const p = partners.get(network);
  if (!p || !p.enabled || !p.tracking_param || !p.tracking_value) {
    return appendUtm(url);
  }
  try {
    const u = new URL(url);
    if (!u.searchParams.has(p.tracking_param)) {
      u.searchParams.set(p.tracking_param, p.tracking_value);
    }
    if (!u.searchParams.has("utm_source")) {
      u.searchParams.set("utm_source", "travidz");
    }
    return u.toString();
  } catch {
    return url;
  }
}

function appendUtm(url: string): string {
  try {
    const u = new URL(url);
    if (!u.searchParams.has("utm_source")) u.searchParams.set("utm_source", "travidz");
    return u.toString();
  } catch {
    return url;
  }
}

export async function getPartnerCommission(network: string | null | undefined): Promise<number | null> {
  if (!network) return null;
  const partners = await loadPartners();
  return partners.get(network)?.commission_pct ?? null;
}
