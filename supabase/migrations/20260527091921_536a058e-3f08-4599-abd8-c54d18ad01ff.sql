
-- 1. Phase 2 — pinned per-business OTA listings
CREATE TABLE IF NOT EXISTS public.business_competitor_urls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL,
  network text NOT NULL,
  url text NOT NULL,
  verified_at timestamp with time zone,
  verified_title text,
  last_scraped_at timestamp with time zone,
  last_status text,
  last_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (business_id, network),
  CONSTRAINT business_competitor_urls_network_check CHECK (
    network = ANY (ARRAY[
      'booking.com','expedia','agoda','getyourguide','viator',
      'airbnb','vrbo','tripadvisor','klook','tiqets','musement'
    ])
  ),
  CONSTRAINT business_competitor_urls_status_check CHECK (
    last_status IS NULL OR last_status = ANY (ARRAY['ok','broken','wrong_domain','no_price','error'])
  )
);

CREATE INDEX IF NOT EXISTS idx_business_competitor_urls_business
  ON public.business_competitor_urls (business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_competitor_urls TO authenticated;
GRANT ALL ON public.business_competitor_urls TO service_role;

ALTER TABLE public.business_competitor_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners read own competitor urls"
  ON public.business_competitor_urls FOR SELECT
  TO authenticated
  USING (business_id = auth.uid());

CREATE POLICY "owners insert own competitor urls"
  ON public.business_competitor_urls FOR INSERT
  TO authenticated
  WITH CHECK (business_id = auth.uid());

CREATE POLICY "owners update own competitor urls"
  ON public.business_competitor_urls FOR UPDATE
  TO authenticated
  USING (business_id = auth.uid())
  WITH CHECK (business_id = auth.uid());

CREATE POLICY "owners delete own competitor urls"
  ON public.business_competitor_urls FOR DELETE
  TO authenticated
  USING (business_id = auth.uid());

CREATE POLICY "admins full competitor urls"
  ON public.business_competitor_urls FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_business_competitor_urls_updated_at
  BEFORE UPDATE ON public.business_competitor_urls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Phase 1 — confidence + room scoping on parity_checks
ALTER TABLE public.parity_checks
  ADD COLUMN IF NOT EXISTS room_id uuid,
  ADD COLUMN IF NOT EXISTS match_confidence text,
  ADD COLUMN IF NOT EXISTS match_notes text;

ALTER TABLE public.parity_checks
  DROP CONSTRAINT IF EXISTS parity_checks_match_confidence_check;
ALTER TABLE public.parity_checks
  ADD CONSTRAINT parity_checks_match_confidence_check
  CHECK (match_confidence IS NULL OR match_confidence = ANY (ARRAY['high','medium','low']));

CREATE INDEX IF NOT EXISTS idx_parity_checks_deal_room_time
  ON public.parity_checks (deal_id, room_id, ran_at DESC);
