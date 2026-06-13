import { createFileRoute } from "@tanstack/react-router";
import { checkCronAuth } from "@/lib/cron-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  enqueueTransactionalEmail,
  getUserEmail,
  SITE_URL,
} from "@/lib/email-send.server";
import { DealExpiringEmail } from "@/lib/email-templates/deal-expiring";

/**
 * Daily cron — finds deals expiring within the next 7 days, inserts a
 * `deal_expiring_soon` notification for the business owner (deduped on
 * deal_id within last 7d) and enqueues a transactional email.
 *
 * Auth: Supabase anon key in `apikey` header (route lives under /api/public/).
 */
export const Route = createFileRoute("/api/public/cron/expiring-deals")({
  server: {
    handlers: {
      POST: async ({ request }) => {        const authFail = checkCronAuth(request);
        if (authFail) return authFail;
        // 1. Insert notifications via the existing SQL function (idempotent on its own).
        const { data: inserted, error: rpcErr } = await supabaseAdmin.rpc(
          "notify_expiring_deals" as any,
          {} as any,
        );
        if (rpcErr) {
          return new Response(
            JSON.stringify({ ok: false, error: rpcErr.message }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }

        // 2. Find candidates and enqueue one email per deal expiring in the next 7d
        //    whose business owner hasn't been emailed about it in the last 7d.
        const horizon = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
        const { data: deals } = await supabaseAdmin
          .from("deals")
          .select("id,title,ends_at,business_id")
          .eq("is_active", true)
          .not("business_id", "is", null)
          .gt("ends_at", new Date().toISOString())
          .lte("ends_at", horizon);

        let emailed = 0;
        for (const d of deals ?? []) {
          if (!d.business_id || !d.ends_at) continue;
          const days = Math.max(
            1,
            Math.ceil(
              (new Date(d.ends_at).getTime() - Date.now()) / (24 * 3600 * 1000),
            ),
          );
          const email = await getUserEmail(d.business_id);
          if (!email) continue;

          // Lightweight de-dupe by checking email_send_log for the same idempotency label
          const idem = `deal-expiring-${d.id}-${new Date().toISOString().slice(0, 10)}`;
          const { data: dup } = await supabaseAdmin
            .from("email_send_log")
            .select("id")
            .eq("template_name", "deal_expiring")
            .eq("recipient_email", email.toLowerCase())
            .gte("created_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
            .limit(1)
            .maybeSingle();
          if (dup) continue;

          const business = (
            await supabaseAdmin
              .from("profiles")
              .select("display_name,username")
              .eq("id", d.business_id)
              .maybeSingle()
          ).data;

          const res = await enqueueTransactionalEmail({
            to: email,
            subject: `Your deal "${d.title}" expires in ${days} day${days === 1 ? "" : "s"}`,
            label: "deal_expiring",
            userId: d.business_id,
            category: "expiry",
            idempotencyKey: idem,
            react: DealExpiringEmail({
              businessName: business?.display_name || `@${business?.username ?? "there"}`,
              dealTitle: d.title,
              daysLeft: days,
              editUrl: `${SITE_URL}/business/deals/${d.id}/edit`,
            }),
          });
          if ("queued" in res && res.queued) emailed++;
        }

        return new Response(
          JSON.stringify({
            ok: true,
            notifications_inserted: inserted ?? 0,
            emails_enqueued: emailed,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});