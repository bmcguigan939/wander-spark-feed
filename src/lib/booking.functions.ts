import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";

const inputSchema = z.object({
  dealId: z.string().uuid(),
  guests: z.number().int().min(1).max(20).default(1),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
  returnUrl: z.string().url(),
  environment: z.enum(["sandbox", "live"]),
});

const COMMISSION_PCT = 8;

export const createBookingCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    // Load deal
    const { data: deal, error: dErr } = await supabaseAdmin
      .from("deals")
      .select(
        "id, business_id, title, image_url, price_cents, currency, bookable, is_active, status, inventory_mode, inventory_remaining, cancellation_policy_code",
      )
      .eq("id", data.dealId)
      .maybeSingle();
    if (dErr) throw new Error(dErr.message);
    if (!deal) throw new Error("Deal not found");
    if (!deal.bookable) throw new Error("This deal is not bookable through Travidz");
    if (!deal.is_active || deal.status !== "approved") throw new Error("Deal is not available");
    if (!deal.price_cents || deal.price_cents <= 0) throw new Error("Deal has no price set");

    if (deal.inventory_mode === "fixed") {
      if ((deal.inventory_remaining ?? 0) < data.guests) {
        throw new Error("Not enough availability");
      }
    }

    // Pull customer profile for email
    const { data: customer } = await supabaseAdmin
      .from("profiles")
      .select("display_name, username")
      .eq("id", userId)
      .maybeSingle();

    const { data: authUser } = await supabase.auth.getUser();
    const customerEmail = authUser?.user?.email ?? undefined;

    const subtotal = deal.price_cents * data.guests;
    const commission = Math.round((subtotal * COMMISSION_PCT) / 100);
    const businessPayout = subtotal - commission;
    const currency = (deal.currency || "GBP").toLowerCase();

    // Insert a pending booking up front so the webhook can match by session id.
    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .insert({
        deal_id: deal.id,
        business_id: deal.business_id,
        user_id: userId,
        guests: data.guests,
        travel_date: data.travelDate ?? null,
        subtotal_cents: subtotal,
        total_cents: subtotal,
        commission_pct: COMMISSION_PCT,
        commission_cents: commission,
        business_payout_cents: businessPayout,
        currency: currency.toUpperCase(),
        status: "pending",
        customer_email: customerEmail ?? undefined,
        customer_name: customer?.display_name ?? customer?.username ?? undefined,
        notes: data.notes ?? undefined,
      })
      .select("id")
      .single();
    if (bErr) throw new Error(bErr.message);

    const stripe = createStripeClient(data.environment as StripeEnv);
    const productName = `${deal.title}${data.guests > 1 ? ` × ${data.guests}` : ""}`;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: productName,
              ...(deal.image_url ? { images: [deal.image_url] } : {}),
            },
            unit_amount: deal.price_cents,
          },
          quantity: data.guests,
        },
      ],
      ...(customerEmail && { customer_email: customerEmail }),
      payment_intent_data: { description: productName },
      metadata: {
        bookingId: booking.id,
        dealId: deal.id,
        userId,
        businessId: deal.business_id ?? "",
      },
    });

    // Save the session id on the booking so the webhook can resolve it.
    await supabaseAdmin
      .from("bookings")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", booking.id);

    if (!session.client_secret) throw new Error("Stripe did not return a client secret");
    return { clientSecret: session.client_secret, bookingId: booking.id };
  });

export const getMyBooking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ sessionId: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, status, total_cents, currency, customer_email, deal_id, deal:deals(id, title, image_url, city, country)",
      )
      .eq("stripe_checkout_session_id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { booking };
  });