import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { refreshConnectAccountById } from "@/lib/stripe-connect.functions";

async function sendConfirmationEmail(opts: {
  to: string;
  customerName: string | null;
  dealTitle: string;
  totalCents: number;
  currency: string;
  guests: number;
  bookingId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || !lovableKey) {
    console.log("[booking] confirmation email skipped (RESEND_API_KEY not configured)");
    return;
  }
  const amount = (opts.totalCents / 100).toLocaleString("en-GB", {
    style: "currency",
    currency: opts.currency,
  });
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a">
      <h2 style="margin:0 0 12px">Your Travidz booking is confirmed</h2>
      <p style="margin:0 0 16px">Hi ${opts.customerName ?? "there"}, thanks for booking with Travidz.</p>
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0">
        <p style="margin:0 0 6px"><strong>${opts.dealTitle}</strong></p>
        <p style="margin:0;color:#475569">Guests: ${opts.guests} · Total: ${amount}</p>
        <p style="margin:8px 0 0;color:#64748b;font-size:12px">Booking ref: ${opts.bookingId}</p>
      </div>
      <p style="color:#64748b;font-size:13px">The business will be in touch with arrangements. Cancellation policy follows the listing terms.</p>
    </div>`;
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": apiKey,
      },
      body: JSON.stringify({
        from: "Travidz <bookings@resend.dev>",
        to: [opts.to],
        subject: `Booking confirmed — ${opts.dealTitle}`,
        html,
      }),
    });
    if (!res.ok) console.error("[booking] email send failed", res.status, await res.text());
  } catch (e) {
    console.error("[booking] email send error", e);
  }
}

async function handleCheckoutCompleted(session: any) {
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) {
    console.error("[webhook] checkout.session.completed missing bookingId");
    return;
  }
  const { data: bookingRow, error: bErr } = await supabaseAdmin
    .from("bookings")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: session.payment_intent ?? null,
      customer_email: session.customer_details?.email ?? session.customer_email ?? null,
    })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select("id, deal_id, guests, total_cents, currency, customer_email, customer_name")
    .maybeSingle();
  if (bErr) {
    console.error("[webhook] booking update failed", bErr);
    return;
  }
  if (!bookingRow) {
    console.log("[webhook] booking already processed or not pending", bookingId);
    return;
  }

  // Decrement inventory if fixed
  const { data: deal } = await supabaseAdmin
    .from("deals")
    .select("title, inventory_mode, inventory_remaining")
    .eq("id", bookingRow.deal_id)
    .maybeSingle();
  if (deal?.inventory_mode === "fixed" && typeof deal.inventory_remaining === "number") {
    const remaining = Math.max(0, deal.inventory_remaining - (bookingRow.guests as number));
    await supabaseAdmin
      .from("deals")
      .update({
        inventory_remaining: remaining,
        ...(remaining === 0 ? { is_active: false } : {}),
      })
      .eq("id", bookingRow.deal_id);
  }

  // Mark the booked date as blocked so the public iCal feed (and the
  // booking date picker) reflect the new booking on the next refresh.
  const { data: bookingDates } = await supabaseAdmin
    .from("bookings")
    .select("travel_date")
    .eq("id", bookingRow.id)
    .maybeSingle();
  if (bookingDates?.travel_date) {
    await supabaseAdmin
      .from("deal_blocked_dates")
      .insert({
        deal_id: bookingRow.deal_id,
        date: bookingDates.travel_date,
        source: "travidz_booking",
        booking_id: bookingRow.id,
        summary: "Travidz booking",
      })
      .select("id")
      .maybeSingle();
  }

  const email = (bookingRow.customer_email as string | null) ?? null;
  if (email) {
    await sendConfirmationEmail({
      to: email,
      customerName: (bookingRow.customer_name as string | null) ?? null,
      dealTitle: (deal?.title as string) ?? "Your booking",
      totalCents: bookingRow.total_cents as number,
      currency: bookingRow.currency as string,
      guests: bookingRow.guests as number,
      bookingId: bookingRow.id as string,
    });
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object);
      break;
    case "checkout.session.expired": {
      const bookingId = (event.data.object as any).metadata?.bookingId;
      if (bookingId) {
        await supabaseAdmin
          .from("bookings")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("id", bookingId)
          .eq("status", "pending");
      }
      break;
    }
    case "account.updated": {
      const acct = event.data.object as any;
      await refreshConnectAccountById(acct.id, env).catch((e) =>
        console.error("[webhook] account.updated refresh failed", e),
      );
      break;
    }
    case "payout.created":
    case "payout.updated":
    case "payout.paid":
    case "payout.failed":
    case "payout.canceled": {
      await recordConnectPayout(event.data.object, env);
      break;
    }
    default:
      console.log("[webhook] unhandled event", event.type);
  }
}

async function recordConnectPayout(payout: any, _env: StripeEnv) {
  // Connect events carry the connected account id on event.account, but the
  // payout object also includes destination/account when sent via Connect.
  const accountId =
    (payout?.metadata?.connect_account_id as string | undefined) ||
    (payout?.account as string | undefined) ||
    null;
  if (!accountId) {
    console.log("[webhook] payout event without account id");
    return;
  }
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_connect_account_id", accountId)
    .maybeSingle();
  if (!profile?.id) {
    console.log("[webhook] payout for unknown connect account", accountId);
    return;
  }
  await supabaseAdmin
    .from("connect_payouts")
    .upsert(
      {
        business_id: profile.id,
        stripe_payout_id: payout.id,
        stripe_account_id: accountId,
        amount_cents: payout.amount ?? 0,
        currency: (payout.currency ?? "gbp").toUpperCase(),
        status: payout.status ?? "unknown",
        arrival_date: payout.arrival_date
          ? new Date(payout.arrival_date * 1000).toISOString()
          : null,
        failure_message: payout.failure_message ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_payout_id" },
    );
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("[webhook] invalid env query param:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[webhook] error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});