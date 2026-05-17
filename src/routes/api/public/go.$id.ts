import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runParityCheck } from "@/lib/price-compare.server";
import { issueMatchCode } from "@/lib/match-codes.server";

export const Route = createFileRoute("/api/public/go/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const id = params.id;
        if (!/^[0-9a-f-]{36}$/i.test(id)) {
          return new Response("Invalid link", { status: 400 });
        }
        const { data: link } = await supabaseAdmin
          .from("affiliate_links")
          .select("url,is_active,video_id,link_kind,business_id,parity_exempt,label,canonical_key")
          .eq("id", id)
          .maybeSingle();
        if (!link || !link.is_active) {
          return new Response("Link unavailable", { status: 404 });
        }

        const url = new URL(request.url);
        const refVideo = url.searchParams.get("v");
        const refVideoId =
          refVideo && /^[0-9a-f-]{36}$/i.test(refVideo) ? refVideo : link.video_id;

        // Fire-and-forget click log; trigger increments click_count
        supabaseAdmin
          .from("affiliate_clicks")
          .insert({ link_id: id, referrer_video_id: refVideoId })
          .then(
            () => {},
            () => {},
          );

        // Best-price guarantee: only for direct_business links that aren't
        // explicitly parity-exempt.
        if (link.link_kind === "direct_business" && !link.parity_exempt) {
          try {
            // Resolve the business's own (direct) price so we only issue a
            // match when a competitor is genuinely cheaper. Source of truth:
            // the cheapest active approved deal owned by this business.
            let directPriceCents: number | null = null;
            let directCurrency: string | null = null;
            let dealLevelExempt = false;
            if (link.business_id) {
              const { data: directDeals } = await supabaseAdmin
                .from("deals")
                .select("price_cents,currency,parity_exempt")
                .eq("business_id", link.business_id)
                .eq("is_active", true)
                .eq("status", "approved")
                .not("price_cents", "is", null)
                .order("price_cents", { ascending: true })
                .limit(1);
              const top = directDeals?.[0];
              if (top?.price_cents != null) {
                directPriceCents = top.price_cents;
                directCurrency = top.currency ?? null;
                dealLevelExempt = !!top.parity_exempt;
              }
            }
            if (dealLevelExempt) {
              // Honour deal-level exemption: skip parity check entirely.
              return new Response(null, {
                status: 302,
                headers: {
                  Location: link.url,
                  "Cache-Control": "no-store",
                  "Referrer-Policy": "no-referrer",
                },
              });
            }

            const { cheapest } = await runParityCheck({
              link_id: id,
              direct_price_cents: directPriceCents,
              query: link.label || "",
            });
            // Only issue a match if we know the direct price AND the
            // competitor is cheaper than it. Otherwise the parity_checks
            // row already recorded the outcome (no_data / no_breach).
            if (
              cheapest &&
              directPriceCents != null &&
              cheapest.price_cents < directPriceCents
            ) {
              const issued = await issueMatchCode({
                link_id: id,
                business_id: link.business_id ?? null,
                traveller_user_id: null,
                original_price_cents: directPriceCents,
                matched_price_cents: cheapest.price_cents,
                currency: directCurrency || cheapest.currency,
                competitor_network: cheapest.network,
                competitor_url: cheapest.url,
                evidence_url: cheapest.evidence_url,
                evidence_hash: cheapest.evidence_hash,
              });
              if (issued) {
                const origin = url.origin;
                return new Response(null, {
                  status: 302,
                  headers: {
                    Location: `${origin}/book/match/${issued.code}`,
                    "Cache-Control": "no-store",
                  },
                });
              }
            }
          } catch {
            // Fall through to normal redirect if parity check fails
          }
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: link.url,
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
          },
        });
      },
    },
  },
});