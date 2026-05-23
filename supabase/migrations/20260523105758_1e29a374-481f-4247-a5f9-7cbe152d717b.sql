-- Restrict public read access to sensitive profile columns.
-- The "profiles public read" policy permits SELECT to all roles for discovery
-- (username, display_name, avatar_url, bio, etc.). To prevent disclosure of
-- payout, agreement, verification, and precise-location fields, revoke
-- column-level SELECT for anon and authenticated. Trusted server code uses
-- supabaseAdmin (service_role) which is unaffected by these grants.

REVOKE SELECT (
  address,
  lat,
  lng,
  stripe_connect_status,
  payout_method,
  payout_bank_details_encrypted,
  rolling_12mo_gbv_cents,
  rolling_12mo_gbv_refreshed_at,
  creator_agreement_accepted_at,
  business_agreement_accepted_at,
  verified_by,
  verification_notes
) ON public.profiles FROM anon, authenticated;