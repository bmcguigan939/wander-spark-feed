import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { COMMISSION } from "@/lib/commission";
import { stampRedemptionSplit } from "@/lib/commission.server";
import { enforceIpRateLimit } from "@/lib/rate-limit.server";

/**
 * B10: Booking attribution beacon.
 * Partner sites redirect travellers back here after booking:
 *   /api/public/attribute?match=TRAVIDZ-MATCH-XXXX&order_value=12345&currency=GBP&external_ref=BK123
 *
 * We auto-create a pending deal_redemption row tagged with the match code.
 * A signed business still has to confirm the redemption from their dashboard
 * before commission is paid out.
 */
export const Route = createFileRoute("/api/public/attribute")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const limited = await enforceIpRateLimit("public_attribute", request, 60, 60);
        if (limited) return limited;
        const url = new URL(request.url);
        const code = url.searchParams.get("match");
        const orderValueRaw = url.searchParams.get("order_value");
        const currency = (url.searchParams.get("currency") || "GBP").toUpperCase();
        const externalRef = url.searchParams.get("external_ref");

        const origin = url.origin;
        if (!code || !/^TRAVIDZ-MATCH-[A-Z0-9]{8}$/.test(code)) {
          return Response.redirect(`${origin}/`, 302);
        }

        const { data: codeRow } = await supabaseAdmin
          .from("price_match_codes")
          .select("code,link_id,business_id,matched_price_cents,currency,expires_at,status")
          .eq("code", code)
          .maybeSingle();

        if (!codeRow) return Response.redirect(`${origin}/`, 302);
        if (codeRow.status !== "issued" && codeRow.status !== "redeemed") {
          return Response.redirect(`${origin}/book/match/${code}`, 302);
        }
        if (new Date(codeRow.expires_at).getTime() < Date.now()) {
          return Response.redirect(`${origin}/book/match/${code}`, 302);
        }

        const orderValueCents = orderValueRaw
          ? Math.max(0, Math.min(10_000_000, parseInt(orderValueRaw, 10) || 0))
          : codeRow.matched_price_cents;

        // Resolve deal + creator via the affiliate link (legacy path only).
        const { data: link } = codeRow.link_id
          ? await supabaseAdmin
              .from("affiliate_links")
              .select("creator_id,video_id,business_id")
              .eq("id", codeRow.link_id)
              .maybeSingle()
          : { data: null as { creator_id: string | null; video_id: string | null; business_id: string | null } | null };

        // Need a deal_id for deal_redemptions; pick the cheapest active deal
        // owned by this business (same heuristic as parity check).
        let dealId: string | null = null;
        if (codeRow.business_id) {
          const { data: deals } = await supabaseAdmin
            .from("deals")
            .select("id")
            .eq("business_id", codeRow.business_id)
            .eq("is_active", true)
            .eq("status", "approved")
            .order("price_cents", { ascending: true })
            .limit(1);
          dealId = deals?.[0]?.id ?? null;
        }

        if (!dealId) return Response.redirect(`${origin}/book/match/${code}/thanks`, 302);

        const commissionCents = Math.round(
          orderValueCents * (COMMISSION.totalPct / 100),
        );

        // Idempotent: skip insert if we've already attributed this code
        const { data: existing } = await supabaseAdmin
          .from("deal_redemptions")
          .select("id")
          .eq("match_code", code)
          .maybeSingle();

        if (!existing) {
          const { data: inserted } = await supabaseAdmin.from("deal_redemptions").insert({
            deal_id: dealId,
            creator_id: link?.creator_id ?? null,
            user_id: null,
            code,
            match_code: code,
            matched_from_price_cents: codeRow.matched_price_cents,
            order_value_cents: orderValueCents,
            currency,
            commission_rate: COMMISSION.totalPct,
            commission_cents: commissionCents,
            status: "pending",
            notes: externalRef
              ? `auto-attributed; partner_ref=${externalRef}`
              : "auto-attributed",
          }).select("id").single();
          if (inserted?.id) await stampRedemptionSplit(inserted.id);
        }

        return Response.redirect(`${origin}/book/match/${code}/thanks`, 302);
      },
    },
  },
});