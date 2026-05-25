-- Column-level GRANTs to hide sensitive columns from anon/authenticated.
-- Row visibility is still controlled by existing RLS policies; this restricts
-- WHICH columns those roles can SELECT. Owner/admin reads go through
-- supabaseAdmin (service role), which is unaffected.

-- ============== profiles ==============
REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id, username, display_name, bio, avatar_url, created_at,
  is_verified, verified_at,
  creator_agreement_accepted_at, business_agreement_accepted_at,
  place_name, thefork_url, is_restaurant,
  is_founding_creator, founding_creator_number, creator_joined_at,
  business_name, business_website_url, business_logo_url,
  business_city, business_country
) ON public.profiles TO anon, authenticated;

-- ============== deals ==============
-- Grant every column except ical_token. List them explicitly so future
-- new columns require a conscious decision.
REVOKE SELECT ON public.deals FROM anon, authenticated;

DO $$
DECLARE
  col_list text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO col_list
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'deals'
     AND column_name <> 'ical_token';

  EXECUTE format('GRANT SELECT (%s) ON public.deals TO anon, authenticated', col_list);
END $$;

-- ============== affiliate_links ==============
REVOKE SELECT ON public.affiliate_links FROM anon, authenticated;

DO $$
DECLARE
  col_list text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO col_list
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'affiliate_links'
     AND column_name NOT IN ('commission_pct','parity_exempt_reason','supplier_ref','canonical_key');

  EXECUTE format('GRANT SELECT (%s) ON public.affiliate_links TO anon, authenticated', col_list);
END $$;