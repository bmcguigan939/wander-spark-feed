
-- =========================================================
-- profiles: column-level SELECT grants (hide sensitive cols)
-- =========================================================
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.profiles FROM authenticated;

GRANT SELECT (
  id, username, display_name, bio, avatar_url, created_at,
  is_verified, verified_at, is_founding_creator, founding_creator_number,
  power_tier_locked_at, power_tier_last_qualified_at,
  rolling_12mo_gbv_cents, rolling_12mo_gbv_refreshed_at,
  creator_joined_at, creator_quality_score, creator_quality_refreshed_at,
  creator_rating_avg, creator_rating_count,
  business_name, business_logo_url, business_website_url,
  business_city, business_country,
  business_rating_avg, business_rating_count, business_rating_refreshed_at,
  place_name, lat, lng, neighbourhood_blurb,
  is_restaurant,
  activity_category, activity_format, activity_meeting_point,
  languages_spoken, facilities, breakfast_offered, parking_offered,
  setup_business_type, setup_property_kind, setup_unit_count,
  setup_units_same_address, setup_step_completed, setup_completed_at,
  ota_listings, channel_manager_planned, channel_manager_provider,
  channel_manager_provider_other, channel_manager_connect_skipped_at,
  default_booking_model, pay_at_property_enabled, long_stays_enabled,
  thefork_url,
  is_blocked, blocked_at,
  cookie_consent, cookie_consent_at,
  creator_agreement_accepted_at, business_agreement_accepted_at,
  legal_entity_type,
  stripe_connect_country, stripe_connect_default_currency
) ON public.profiles TO anon, authenticated;

GRANT ALL ON public.profiles TO service_role;

-- =========================================================
-- affiliate_links: drop broad public read
-- =========================================================
DROP POLICY IF EXISTS "affiliate_links public read active" ON public.affiliate_links;

CREATE POLICY "affiliate_links owner or admin read"
  ON public.affiliate_links
  FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id OR has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- deal_redirects: drop public read (server resolves with admin)
-- =========================================================
DROP POLICY IF EXISTS "anyone can read redirects" ON public.deal_redirects;

-- =========================================================
-- price_match_codes: drop public deal-read policy
-- =========================================================
DROP POLICY IF EXISTS "price_match_codes public read deal" ON public.price_match_codes;
