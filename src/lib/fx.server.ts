import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Get FX rate to convert `base` -> `quote`. Returns 1 if same currency.
 * Reads from public.fx_rates which is refreshed daily by cron.
 * Falls back to null (no conversion possible) if not in cache.
 */
export async function getFxRate(
  base: string,
  quote: string,
): Promise<number | null> {
  const b = base.toUpperCase();
  const q = quote.toUpperCase();
  if (b === q) return 1;
  const { data } = await supabaseAdmin
    .from("fx_rates")
    .select("rate")
    .eq("base", b)
    .eq("quote", q)
    .maybeSingle();
  if (data?.rate) return Number(data.rate);
  // Try inverse
  const { data: inv } = await supabaseAdmin
    .from("fx_rates")
    .select("rate")
    .eq("base", q)
    .eq("quote", b)
    .maybeSingle();
  if (inv?.rate && Number(inv.rate) > 0) return 1 / Number(inv.rate);
  return null;
}

/** Convert cents in `base` to cents in `quote`. Returns null if no rate. */
export async function convertCents(
  cents: number,
  base: string,
  quote: string,
): Promise<{ cents: number; rate: number } | null> {
  const rate = await getFxRate(base, quote);
  if (rate == null) return null;
  return { cents: Math.round(cents * rate), rate };
}
