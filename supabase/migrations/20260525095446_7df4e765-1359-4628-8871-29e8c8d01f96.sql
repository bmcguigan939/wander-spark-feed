-- Revoke read access on sensitive Stripe/commission columns from anon and authenticated.
-- Admin/server code uses the service role and bypasses column GRANTs.
REVOKE SELECT (
  stripe_payment_intent_id,
  stripe_checkout_session_id,
  stripe_transfer_id,
  commission_pct,
  commission_cents,
  business_payout_cents
) ON public.bookings FROM anon, authenticated;