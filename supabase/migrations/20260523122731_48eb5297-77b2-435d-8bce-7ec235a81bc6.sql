-- Add iCal token to deals
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS ical_token text;

CREATE UNIQUE INDEX IF NOT EXISTS deals_ical_token_idx
  ON public.deals (ical_token) WHERE ical_token IS NOT NULL;

-- External calendar feeds (others -> Travidz)
CREATE TABLE IF NOT EXISTS public.deal_external_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  name text NOT NULL,
  ics_url text NOT NULL,
  last_synced_at timestamptz,
  last_status text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deal_external_calendars_deal_idx
  ON public.deal_external_calendars (deal_id);

ALTER TABLE public.deal_external_calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "external_cals admin all"
  ON public.deal_external_calendars FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "external_cals owner read"
  ON public.deal_external_calendars FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_external_calendars.deal_id
      AND d.business_id = auth.uid()
  ));

CREATE POLICY "external_cals owner insert"
  ON public.deal_external_calendars FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_external_calendars.deal_id
      AND d.business_id = auth.uid()
  ));

CREATE POLICY "external_cals owner update"
  ON public.deal_external_calendars FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_external_calendars.deal_id
      AND d.business_id = auth.uid()
  ));

CREATE POLICY "external_cals owner delete"
  ON public.deal_external_calendars FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_external_calendars.deal_id
      AND d.business_id = auth.uid()
  ));

-- Blocked dates (the merged availability ledger)
CREATE TABLE IF NOT EXISTS public.deal_blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  date date NOT NULL,
  source text NOT NULL CHECK (source IN ('external_ical','travidz_booking','manual')),
  external_calendar_id uuid REFERENCES public.deal_external_calendars(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Dedupe per (deal, date, source, external feed). Two distinct external feeds
-- blocking the same day each get their own row so we can clean up per-source.
CREATE UNIQUE INDEX IF NOT EXISTS deal_blocked_dates_unique_idx
  ON public.deal_blocked_dates (
    deal_id, date, source,
    COALESCE(external_calendar_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(booking_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE INDEX IF NOT EXISTS deal_blocked_dates_deal_date_idx
  ON public.deal_blocked_dates (deal_id, date);

ALTER TABLE public.deal_blocked_dates ENABLE ROW LEVEL SECURITY;

-- Anyone can read blocked dates for active/approved deals (booking UI needs this)
CREATE POLICY "blocked_dates public read active"
  ON public.deal_blocked_dates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_blocked_dates.deal_id
      AND d.is_active
      AND d.status = 'approved'
  ));

CREATE POLICY "blocked_dates owner read"
  ON public.deal_blocked_dates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_blocked_dates.deal_id
      AND d.business_id = auth.uid()
  ));

CREATE POLICY "blocked_dates owner manage manual"
  ON public.deal_blocked_dates FOR ALL
  USING (
    source = 'manual'
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_blocked_dates.deal_id
        AND d.business_id = auth.uid()
    )
  )
  WITH CHECK (
    source = 'manual'
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_blocked_dates.deal_id
        AND d.business_id = auth.uid()
    )
  );

CREATE POLICY "blocked_dates admin all"
  ON public.deal_blocked_dates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));