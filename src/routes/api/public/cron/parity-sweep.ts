import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runParityCheck } from "@/lib/price-compare.server";
import { issueMatchCode } from "@/lib/match-codes.server";

/**
 * Periodic parity sweep — refreshes competitor prices for active
 * direct_business affiliate links so the audit log shows the business
 * we've been checking even when nobody clicks. Runs every 6 hours.
 *
 * Auth: Supabase anon key in `apikey` header.
 */
export const Route = createFileRoute("/api/public/cron/parity-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey =
          request.headers.get("apikey") ?? request.headers.get("Apikey");
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY ??
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        const { data: links } = await supabaseAdmin
          .from("affiliate_links")
          .select("id,label,business_id,parity_exempt")
          .eq("link_kind", "direct_business")
          .eq("is_active", true)
          .eq("parity_exempt", false)
          .limit(50);

        let checked = 0;
        let matchesIssued = 0;
        for (const link of links ?? []) {
          try {
            let directPriceCents: number | null = null;
            let directCurrency: string | null = null;
            if (link.business_id) {
              const { data: deals } = await supabaseAdmin
                .from("deals")
                .select("price_cents,currency")
                .eq("business_id", link.business_id)
                .eq("is_active", true)
                .eq("status", "approved")
                .not("price_cents", "is", null)
                .order("price_cents", { ascending: true })
                .limit(1);
              const top = deals?.[0];
              if (top?.price_cents != null) {
                directPriceCents = top.price_cents;
                directCurrency = top.currency ?? null;
              }
            }

            const { cheapest, cheapest_normalised_cents } = await runParityCheck({
              link_id: link.id,
              direct_price_cents: directPriceCents,
              query: link.label || "",
              direct_currency: directCurrency,
            });
            checked++;

            if (
              cheapest &&
              directPriceCents != null &&
              cheapest_normalised_cents != null &&
              cheapest_normalised_cents < directPriceCents
            ) {
              const issued = await issueMatchCode({
                link_id: link.id,
                business_id: link.business_id ?? null,
                traveller_user_id: null,
                original_price_cents: directPriceCents,
                matched_price_cents: cheapest_normalised_cents,
                currency: directCurrency || cheapest.currency,
                competitor_network: cheapest.network,
                competitor_url: cheapest.url,
                evidence_url: cheapest.evidence_url,
                evidence_hash: cheapest.evidence_hash,
              });
              if (issued) matchesIssued++;
            }
          } catch {
            // continue with next link
          }
        }

        return new Response(
          JSON.stringify({ ok: true, checked, matches_issued: matchesIssued }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});