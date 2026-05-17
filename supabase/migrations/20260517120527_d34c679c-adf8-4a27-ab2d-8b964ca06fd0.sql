-- =====================================================
-- 1. Commission defaults: 8% (4% / 4%)
-- =====================================================
ALTER TABLE public.business_invites
  ALTER COLUMN commission_pct SET DEFAULT 8.00,
  ALTER COLUMN creator_share_pct SET DEFAULT 4.00,
  ALTER COLUMN platform_share_pct SET DEFAULT 4.00;

-- Force re-acceptance of updated agreements
UPDATE public.profiles SET business_agreement_accepted_at = NULL WHERE business_agreement_accepted_at IS NOT NULL;
UPDATE public.profiles SET creator_agreement_accepted_at = NULL WHERE creator_agreement_accepted_at IS NOT NULL;

-- =====================================================
-- 2. Extend affiliate_links with link kind + supplier identity
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.affiliate_link_kind AS ENUM ('creator_affiliate', 'ota_affiliate', 'direct_business');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.supplier_type AS ENUM ('hotel', 'activity', 'flight', 'transfer', 'esim', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.affiliate_links
  ADD COLUMN IF NOT EXISTS link_kind public.affiliate_link_kind NOT NULL DEFAULT 'creator_affiliate',
  ADD COLUMN IF NOT EXISTS business_id uuid,
  ADD COLUMN IF NOT EXISTS supplier_type public.supplier_type,
  ADD COLUMN IF NOT EXISTS supplier_ref text,
  ADD COLUMN IF NOT EXISTS canonical_key text,
  ADD COLUMN IF NOT EXISTS parity_exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parity_exempt_reason text;

CREATE INDEX IF NOT EXISTS idx_affiliate_links_business ON public.affiliate_links(business_id) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_affiliate_links_canonical ON public.affiliate_links(canonical_key) WHERE canonical_key IS NOT NULL;

-- =====================================================
-- 3. price_quotes — competitor price cache
-- =====================================================
CREATE TABLE IF NOT EXISTS public.price_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL,
  network text NOT NULL,
  url text NOT NULL,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  check_in date,
  check_out date,
  pax integer,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  ttl_seconds integer NOT NULL DEFAULT 900,
  evidence_url text,
  evidence_hash text,
  source text NOT NULL DEFAULT 'api'
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_price_quotes_link_network_window
  ON public.price_quotes(link_id, network, COALESCE(check_in, '1970-01-01'::date), COALESCE(check_out, '1970-01-01'::date), COALESCE(pax, 0));
CREATE INDEX IF NOT EXISTS idx_price_quotes_link ON public.price_quotes(link_id);

ALTER TABLE public.price_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_quotes business read"
  ON public.price_quotes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.affiliate_links l
    WHERE l.id = price_quotes.link_id AND l.business_id = auth.uid()
  ));

CREATE POLICY "price_quotes admin all"
  ON public.price_quotes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 4. parity_checks — append-only audit of every check
-- =====================================================
CREATE TABLE IF NOT EXISTS public.parity_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL,
  ran_at timestamptz NOT NULL DEFAULT now(),
  providers_checked text[] NOT NULL DEFAULT '{}',
  cheapest_network text,
  cheapest_price_cents integer,
  direct_price_cents integer,
  action text NOT NULL CHECK (action IN ('no_breach','match_issued','exempt','no_data','error'))
);
CREATE INDEX IF NOT EXISTS idx_parity_checks_link_time ON public.parity_checks(link_id, ran_at DESC);

ALTER TABLE public.parity_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parity_checks business read"
  ON public.parity_checks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.affiliate_links l
    WHERE l.id = parity_checks.link_id AND l.business_id = auth.uid()
  ));

CREATE POLICY "parity_checks admin all"
  ON public.parity_checks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- (No INSERT/UPDATE/DELETE policy for businesses — service role only via server functions)

-- =====================================================
-- 5. price_match_codes — issued match codes + evidence
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.price_match_status AS ENUM ('issued','redeemed','expired','disputed','dispute_rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.price_match_codes (
  code text PRIMARY KEY,
  link_id uuid NOT NULL,
  business_id uuid,
  traveller_user_id uuid,
  original_price_cents integer NOT NULL,
  matched_price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  competitor_network text NOT NULL,
  competitor_url text NOT NULL,
  evidence_url text,
  evidence_hash text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status public.price_match_status NOT NULL DEFAULT 'issued',
  dispute_reason text,
  dispute_evidence_url text,
  dispute_resolved_by uuid,
  dispute_resolved_at timestamptz,
  redeemed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_price_match_business_time ON public.price_match_codes(business_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_match_link_time ON public.price_match_codes(link_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_match_traveller ON public.price_match_codes(traveller_user_id) WHERE traveller_user_id IS NOT NULL;

ALTER TABLE public.price_match_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_match_codes business read"
  ON public.price_match_codes FOR SELECT
  USING (auth.uid() = business_id);

CREATE POLICY "price_match_codes traveller read"
  ON public.price_match_codes FOR SELECT
  USING (auth.uid() = traveller_user_id);

CREATE POLICY "price_match_codes business dispute"
  ON public.price_match_codes FOR UPDATE
  USING (auth.uid() = business_id AND status IN ('issued','redeemed'))
  WITH CHECK (auth.uid() = business_id);

CREATE POLICY "price_match_codes admin all"
  ON public.price_match_codes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 6. Link redemptions to match codes
-- =====================================================
ALTER TABLE public.deal_redemptions
  ADD COLUMN IF NOT EXISTS match_code text,
  ADD COLUMN IF NOT EXISTS matched_from_price_cents integer;

-- =====================================================
-- 7. Evidence storage bucket (private)
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('price-evidence', 'price-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Only admins (service role bypasses RLS anyway) and the owning business can read their own evidence.
CREATE POLICY "price-evidence business read own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'price-evidence'
    AND EXISTS (
      SELECT 1 FROM public.affiliate_links l
      WHERE l.id::text = split_part(name, '/', 1)
        AND l.business_id = auth.uid()
    )
  );

CREATE POLICY "price-evidence admin read all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'price-evidence' AND has_role(auth.uid(), 'admin'::app_role));