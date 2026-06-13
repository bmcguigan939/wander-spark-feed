import { createFileRoute } from "@tanstack/react-router";
import { checkCronAuth } from "@/lib/cron-auth.server";
import React from "react";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  enqueueTransactionalEmail,
  getUserEmail,
  SITE_URL,
} from "@/lib/email-send.server";
import { BusinessDigestEmail } from "@/lib/email-templates/business-digest";

/**
 * Weekly business digest — summarises parity checks, matches issued, and
 * commission accrued over the past 7 days. One email per business with
 * activity. Dedupe via email_send_log.
 *
 * Auth: Supabase anon key in `apikey` header.
 */
export const Route = createFileRoute("/api/public/cron/business-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {        const authFail = checkCronAuth(request);
        if (authFail) return authFail;
        const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

        // Pull all active businesses (profiles with a business role)
        const { data: businesses } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("role", "business");

        let emailed = 0;
        for (const b of businesses ?? []) {
          const businessId = b.user_id;

          // Collect link ids for this business
          const { data: links } = await supabaseAdmin
            .from("affiliate_links")
            .select("id")
            .eq("business_id", businessId);
          const linkIds = (links ?? []).map((l) => l.id);
          if (linkIds.length === 0) continue;

          const [{ count: checksRun }, { count: matchesIssued }, redemptionsAgg] =
            await Promise.all([
              supabaseAdmin
                .from("parity_checks")
                .select("id", { count: "exact", head: true })
                .in("link_id", linkIds)
                .gte("created_at", since),
              supabaseAdmin
                .from("price_match_codes")
                .select("id", { count: "exact", head: true })
                .in("link_id", linkIds)
                .gte("created_at", since),
              supabaseAdmin
                .from("deal_redemptions")
                .select("commission_cents,currency")
                .eq("status", "confirmed")
                .gte("confirmed_at", since)
                .in(
                  "deal_id",
                  (
                    await supabaseAdmin
                      .from("deals")
                      .select("id")
                      .eq("business_id", businessId)
                  ).data?.map((d) => d.id) ?? ["00000000-0000-0000-0000-000000000000"],
                ),
            ]);

          const redemptions = redemptionsAgg.data ?? [];
          const totalCommissionCents = redemptions.reduce(
            (sum, r) => sum + (r.commission_cents ?? 0),
            0,
          );
          const currency = redemptions[0]?.currency || "GBP";

          // Skip if zero activity
          if (
            (checksRun ?? 0) === 0 &&
            (matchesIssued ?? 0) === 0 &&
            redemptions.length === 0
          ) {
            continue;
          }

          const email = await getUserEmail(businessId);
          if (!email) continue;

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("display_name,username")
            .eq("id", businessId)
            .maybeSingle();

          const weekStamp = new Date().toISOString().slice(0, 10);
          const res = await enqueueTransactionalEmail({
            to: email,
            subject: "Your weekly Travidz best-price summary",
            userId: businessId,
            category: "applications",
            label: "business_digest",
            idempotencyKey: `business-digest-${businessId}-${weekStamp}`,
            react: React.createElement(BusinessDigestEmail, {
              businessName:
                profile?.display_name || `@${profile?.username ?? "there"}`,
              checksRun: checksRun ?? 0,
              matchesIssued: matchesIssued ?? 0,
              redemptionsConfirmed: redemptions.length,
              totalCommissionCents,
              currency,
              auditUrl: `${SITE_URL}/business/price-audit`,
            }),
          });
          if ("queued" in res && res.queued) emailed++;
        }

        return new Response(
          JSON.stringify({ ok: true, emails_enqueued: emailed }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});