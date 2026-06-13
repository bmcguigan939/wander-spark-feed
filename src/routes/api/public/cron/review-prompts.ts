import { createFileRoute } from "@tanstack/react-router";
import { checkCronAuth } from "@/lib/cron-auth.server";
import React from "react";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  enqueueTransactionalEmail,
  getUserEmail,
  SITE_URL,
} from "@/lib/email-send.server";
import { ReviewPromptEmail } from "@/lib/email-templates/review-prompt";

/**
 * Daily cron: marks bookings completed when travel_date has passed and
 * sends a 2-tap review prompt email. Re-nudges once at +3 days if no review.
 *
 * Auth: Supabase anon key in `apikey` header.
 */
export const Route = createFileRoute("/api/public/cron/review-prompts")({
  server: {
    handlers: {
      POST: async ({ request }) => {        const authFail = checkCronAuth(request);
        if (authFail) return authFail;
        const today = new Date().toISOString().slice(0, 10);

        // 1. Mark bookings completed when travel_date has passed.
        const { data: toComplete } = await supabaseAdmin
          .from("bookings")
          .select("id")
          .in("status", ["confirmed", "paid"])
          .is("completed_at", null)
          .lt("travel_date", today)
          .limit(500);
        for (const b of toComplete ?? []) {
          await supabaseAdmin
            .from("bookings")
            .update({ completed_at: new Date().toISOString() })
            .eq("id", b.id);
        }

        // 2. Find bookings ready for a prompt (completed, no review yet,
        //    not prompted OR prompted >=3 days ago and still no review).
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
        const { data: candidates } = await supabaseAdmin
          .from("bookings")
          .select(
            "id,user_id,deal_id,business_id,review_prompt_sent_at,deal:deals(title),business:profiles!bookings_business_id_fkey(business_name,display_name,username)",
          )
          .not("completed_at", "is", null)
          .in("status", ["confirmed", "paid", "completed"])
          .or(`review_prompt_sent_at.is.null,review_prompt_sent_at.lt.${threeDaysAgo}`)
          .limit(200);

        let queued = 0;
        for (const b of candidates ?? []) {
          // Skip if already reviewed
          const { data: existing } = await supabaseAdmin
            .from("booking_reviews")
            .select("id")
            .eq("booking_id", b.id)
            .maybeSingle();
          if (existing) continue;

          const email = await getUserEmail(b.user_id);
          if (!email) continue;
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("display_name,username")
            .eq("id", b.user_id)
            .maybeSingle();
          const businessName =
            (b as any).business?.business_name ||
            (b as any).business?.display_name ||
            `@${(b as any).business?.username ?? "your host"}`;
          const dealTitle = (b as any).deal?.title ?? "your trip";
          const reviewUrl = `${SITE_URL}/review/${b.id}`;

          const result = await enqueueTransactionalEmail({
            to: email,
            subject: `How was ${dealTitle}?`,
            label: "review-prompt",
            userId: b.user_id,
            category: "redemption",
            idempotencyKey: `review-prompt-${b.id}-${b.review_prompt_sent_at ? "nudge" : "first"}`,
            react: React.createElement(ReviewPromptEmail, {
              travellerName: profile?.display_name || profile?.username || "there",
              dealTitle,
              businessName,
              reviewUrl,
            }),
          });
          if ((result as any).ok) {
            await supabaseAdmin
              .from("bookings")
              .update({ review_prompt_sent_at: new Date().toISOString() })
              .eq("id", b.id);
            queued += 1;
          }
        }

        return new Response(
          JSON.stringify({
            ok: true,
            completed: (toComplete ?? []).length,
            queued,
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});