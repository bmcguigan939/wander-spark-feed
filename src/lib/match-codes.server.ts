import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { COMMISSION } from "@/lib/commission";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // base32-ish, no confusing chars

function generateCode(): string {
  let out = "TRAVIDZ-MATCH-";
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Issue a price-match code. Matched price = competitor price (business
 * keeps competitor price - 8% commission). 24h expiry. */
export async function issueMatchCode(args: {
  link_id: string;
  business_id: string | null;
  traveller_user_id: string | null;
  original_price_cents: number;
  matched_price_cents: number;
  currency: string;
  competitor_network: string;
  competitor_url: string;
  evidence_url: string | null;
  evidence_hash: string;
}): Promise<{ code: string; expires_at: string } | null> {
  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { error } = await supabaseAdmin.from("price_match_codes").insert({
      code,
      link_id: args.link_id,
      business_id: args.business_id,
      traveller_user_id: args.traveller_user_id,
      original_price_cents: args.original_price_cents,
      matched_price_cents: args.matched_price_cents,
      currency: args.currency,
      competitor_network: args.competitor_network,
      competitor_url: args.competitor_url,
      evidence_url: args.evidence_url,
      evidence_hash: args.evidence_hash,
      expires_at,
      status: "issued",
    });
    if (!error) return { code, expires_at };
  }
  return null;
}

export const COMMISSION_PCT = COMMISSION.totalPct;