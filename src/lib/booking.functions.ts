import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";

const inputSchema = z.object({
  dealId: z.string().uuid(),
  ratePlanId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  guests: z.number().int().min(1).max(20).default(1),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
  returnUrl: z.string().url(),
  environment: z.enum(["sandbox", "live"]),
  // Video the booking click came from. Used to attribute commission
  // to that video's creator, but ONLY if the creator has an approved
  // deal_applications contract for this deal.
  referrerVideoId: z.string().uuid().optional(),
});

const COMMISSION_PCT = 11;

const ALLOWED_RETURN_HOSTS = new Set([
  "travidz.com",
  "www.travidz.com",
  "wander-spark-feed.lovable.app",
]);

function assertSafeReturnUrl(returnUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(returnUrl);
  } catch {
    throw new Error("Invalid return URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Invalid return URL protocol");
  }
  const host = parsed.hostname.toLowerCase();
  if (ALLOWED_RETURN_HOSTS.has(host)) return;
  // Allow Lovable preview subdomains (e.g. id-preview--*.lovable.app, *--*.lovable.app)
  if (host.endsWith(".lovable.app")) return;
  // Dev only
  if (process.env.NODE_ENV !== "production" && (host === "localhost" || host === "127.0.0.1")) {
    return;
  }
  throw new Error("Return URL host is not allowed");
}

export const createBookingCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    assertSafeReturnUrl(data.returnUrl);

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
    if (!deal.business_id) throw new Error("This deal has no business owner");

    // Load business Connect account for the split.
    const { data: dealMeta } = await supabaseAdmin
      .from("deals")
      .select("connect_account_id")
      .eq("id", deal.id)
      .maybeSingle();
    const { data: bizProfile } = await supabaseAdmin
      .from("profiles")
      .select(
        "stripe_connect_account_id,stripe_connect_payouts_enabled,payout_method",
      )
      .eq("id", deal.business_id)
      .maybeSingle();
    const connectAccountId =
      (dealMeta as any)?.connect_account_id ||
      (bizProfile as any)?.stripe_connect_account_id ||
      null;
    const connectActive = !!(bizProfile as any)?.stripe_connect_payouts_enabled;

    // Resolve rate plan — either explicit, or fall back to the cheapest active one for back-compat
    let ratePlan: {
      id: string;
      price_cents: number;
      currency: string;
      cancellation_policy_code: string;
      payment_timing: string;
      deposit_pct: number | null;
      is_active: boolean;
    } | null = null;
    if (data.ratePlanId) {
      const { data: rp } = await supabaseAdmin
        .from("deal_rate_plans")
        .select(
          "id,deal_id,price_cents,currency,cancellation_policy_code,payment_timing,deposit_pct,is_active",
        )
        .eq("id", data.ratePlanId)
        .eq("deal_id", deal.id)
        .maybeSingle();
      if (!rp || !rp.is_active) throw new Error("Selected rate is no longer available");
      ratePlan = rp as any;
    } else {
      const { data: rp } = await supabaseAdmin
        .from("deal_rate_plans")
        .select(
          "id,deal_id,price_cents,currency,cancellation_policy_code,payment_timing,deposit_pct,is_active",
        )
        .eq("deal_id", deal.id)
        .eq("is_active", true)
        .order("price_cents", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (rp) ratePlan = rp as any;
    }

    const unitPrice = ratePlan?.price_cents ?? deal.price_cents ?? 0;
    if (!unitPrice || unitPrice <= 0) throw new Error("Deal has no price set");
    const paymentTiming = (ratePlan?.payment_timing ?? "pay_online") as
      | "pay_online"
      | "pay_at_property"
      | "deposit_online_rest_at_property";

    if (deal.inventory_mode === "fixed") {
      if ((deal.inventory_remaining ?? 0) < data.guests) {
        throw new Error("Not enough availability");
      }
    }

    // Calendar-sync guard: if a travel date was supplied, refuse if it's
    // blocked by an external feed, a prior Travidz booking, or a manual hold.
    if (data.travelDate) {
      const { data: block } = await supabaseAdmin
        .from("deal_blocked_dates")
        .select("id")
        .eq("deal_id", deal.id)
        .eq("date", data.travelDate)
        .limit(1)
        .maybeSingle();
      if (block) {
        throw new Error("That date is no longer available — please pick another.");
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

    const subtotal = unitPrice * data.guests;
    const commission = Math.round((subtotal * COMMISSION_PCT) / 100);
    const businessPayout = subtotal - commission;
    const currency = (ratePlan?.currency || deal.currency || "GBP").toLowerCase();

    // For deposit flow, only charge the deposit portion online
    const depositPct = paymentTiming === "deposit_online_rest_at_property" ? ratePlan?.deposit_pct ?? 25 : null;
    const chargeNow =
      paymentTiming === "pay_at_property"
        ? 0
        : paymentTiming === "deposit_online_rest_at_property"
          ? Math.round((subtotal * (depositPct ?? 25)) / 100)
          : subtotal;
    const balanceDueAtProperty = subtotal - chargeNow;

    // Resolve referring creator, gated by contract.
    let referrerVideoId: string | null = null;
    let creatorId: string | null = null;
    if (data.referrerVideoId) {
      const { data: refVideo } = await supabaseAdmin
        .from("videos")
        .select("id,creator_id")
        .eq("id", data.referrerVideoId)
        .maybeSingle();
      if (refVideo?.creator_id) {
        const { data: app } = await supabaseAdmin
          .from("deal_applications")
          .select("id")
          .eq("creator_id", refVideo.creator_id)
          .eq("deal_id", deal.id)
          .eq("status", "approved")
          .maybeSingle();
        if (app) {
          referrerVideoId = refVideo.id;
          creatorId = refVideo.creator_id;
        }
      }
    }

    // Insert a pending booking up front so the webhook can match by session id.
    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .insert({
        deal_id: deal.id,
        business_id: deal.business_id,
        user_id: userId,
        creator_id: creatorId,
        referrer_video_id: referrerVideoId,
        guests: data.guests,
        travel_date: data.travelDate ?? null,
        subtotal_cents: subtotal,
        total_cents: subtotal,
        commission_pct: COMMISSION_PCT,
        commission_cents: commission,
        business_payout_cents: businessPayout,
        currency: currency.toUpperCase(),
        status: paymentTiming === "pay_at_property" ? "confirmed" : "pending",
        customer_email: customerEmail ?? undefined,
        customer_name: customer?.display_name ?? customer?.username ?? undefined,
        notes: data.notes ?? undefined,
        rate_plan_id: ratePlan?.id ?? null,
        room_id: data.roomId ?? null,
        payment_timing: paymentTiming,
        balance_due_at_property_cents: balanceDueAtProperty,
      })
      .select("id")
      .single();
    if (bErr) throw new Error(bErr.message);

    // Pay-at-property: skip Stripe entirely, booking is already confirmed.
    if (paymentTiming === "pay_at_property") {
      return { clientSecret: null, bookingId: booking.id, payAtProperty: true };
    }

    const stripe = createStripeClient(data.environment as StripeEnv);
    const productName = `${deal.title}${data.guests > 1 ? ` × ${data.guests}` : ""}`;
    const lineDescription =
      paymentTiming === "deposit_online_rest_at_property"
        ? `${productName} — ${depositPct}% deposit (balance at property)`
        : productName;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: lineDescription,
              ...(deal.image_url ? { images: [deal.image_url] } : {}),
            },
            unit_amount:
              paymentTiming === "deposit_online_rest_at_property"
                ? Math.round((unitPrice * (depositPct ?? 25)) / 100)
                : unitPrice,
          },
          quantity: data.guests,
        },
      ],
      ...(customerEmail && { customer_email: customerEmail }),
      payment_intent_data: {
        description: productName,
        // Split the charge: business gets paid automatically into their
        // Stripe Connect bank, Travidz keeps the application fee.
        ...(connectActive && connectAccountId
          ? {
              application_fee_amount: computeApplicationFee({
                chargeNow,
                guests: data.guests,
                commissionPct: COMMISSION_PCT,
              }),
              transfer_data: { destination: connectAccountId },
            }
          : {}),
      },
      metadata: {
        bookingId: booking.id,
        dealId: deal.id,
        userId,
        businessId: deal.business_id ?? "",
        ratePlanId: ratePlan?.id ?? "",
        paymentTiming,
        connectAccountId: connectAccountId ?? "",
      },
    });

    // Snapshot the Connect account on the booking + deal for reconciliation.
    if (connectAccountId) {
      await supabaseAdmin
        .from("deals")
        .update({ connect_account_id: connectAccountId })
        .eq("id", deal.id)
        .is("connect_account_id", null);
    }

    // Save the session id on the booking so the webhook can resolve it.
    await supabaseAdmin
      .from("bookings")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", booking.id);

    if (!session.client_secret) throw new Error("Stripe did not return a client secret");
    return { clientSecret: session.client_secret, bookingId: booking.id };
  });

/**
 * Application fee = the slice Travidz keeps from the charge.
 * - commission model: COMMISSION_PCT of the amount charged now.
 * - operator_markup model: the uplift (price − operator base) × guests,
 *   clamped to the amount charged now.
 */
function computeApplicationFee(opts: {
  chargeNow: number;
  guests: number;
  commissionPct: number;
}): number {
  return Math.round((opts.chargeNow * opts.commissionPct) / 100);
}

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