import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runDealPriceMatch } from "@/lib/price-match-scan.server";

/**
 * Public server fn — anyone viewing a deal can trigger a price-match
 * scan. Cached at 6h per (deal, dates, guests) so this is cheap on
 * repeat views.
 */
export const scanDealPriceMatch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        dealId: z.string().uuid(),
        check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
        check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
        guests: z.number().int().min(1).max(20).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: deal } = await supabaseAdmin
      .from("deals")
      .select("id,title,city,country,destination,price_cents,currency,is_active,status,business_id")
      .eq("id", data.dealId)
      .maybeSingle();
    if (!deal || !deal.is_active || deal.status !== "approved") {
      return {
        scanned: false,
        cheapest_competitor_cents: null,
        cheapest_competitor_network: null,
        cheapest_competitor_url: null,
        scanned_urls: [],
        ran_at: new Date().toISOString(),
        match_code: null,
        match_expires_at: null,
        direct_price_cents: null as number | null,
        currency: "GBP",
      };
    }
    const locality = [deal.city, deal.country].filter(Boolean).join(" ") || deal.destination || "";
    const query = `${deal.title} ${locality}`.trim();
    const result = await runDealPriceMatch({
      dealId: deal.id,
      query,
      direct_price_cents: deal.price_cents ?? null,
      direct_currency: deal.currency ?? "GBP",
      business_id: (deal as any).business_id ?? null,
      check_in: data.check_in ?? null,
      check_out: data.check_out ?? null,
      guests: data.guests ?? null,
    });
    return {
      ...result,
      direct_price_cents: deal.price_cents ?? null,
      currency: deal.currency ?? "GBP",
    };
  });