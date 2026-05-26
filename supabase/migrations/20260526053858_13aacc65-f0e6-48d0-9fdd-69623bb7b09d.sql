
-- 1) Property/operator photo gallery
CREATE TABLE public.business_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  url text NOT NULL,
  caption text,
  category text NOT NULL DEFAULT 'other',
  sort_order integer NOT NULL DEFAULT 0,
  is_cover boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_business_photos_business ON public.business_photos(business_id, sort_order);
ALTER TABLE public.business_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_photos public read"
  ON public.business_photos FOR SELECT
  USING (true);

CREATE POLICY "business_photos owner manage"
  ON public.business_photos FOR ALL
  USING (auth.uid() = business_id)
  WITH CHECK (auth.uid() = business_id);

CREATE POLICY "business_photos admin all"
  ON public.business_photos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_business_photos_updated_at
  BEFORE UPDATE ON public.business_photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Storage bucket for business photos (property + per-item)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('business-photos', 'business-photos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "business-photos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-photos');

CREATE POLICY "business-photos owner insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'business-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "business-photos owner update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'business-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "business-photos owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'business-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3) deal_rooms → generic bookable item (works for activity options too)
ALTER TABLE public.deal_rooms
  ADD COLUMN IF NOT EXISTS item_kind text NOT NULL DEFAULT 'room',
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS meeting_point text,
  ADD COLUMN IF NOT EXISTS languages text[],
  ADD COLUMN IF NOT EXISTS includes text[],
  ADD COLUMN IF NOT EXISTS excludes text[];

ALTER TABLE public.deal_rooms
  DROP CONSTRAINT IF EXISTS deal_rooms_item_kind_check;
ALTER TABLE public.deal_rooms
  ADD CONSTRAINT deal_rooms_item_kind_check
  CHECK (item_kind IN ('room','activity_option'));

-- 4) Native time-slot scheduling for activities
CREATE TABLE public.deal_time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  room_id uuid,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  capacity integer NOT NULL DEFAULT 1,
  booked integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deal_time_slots_deal_start ON public.deal_time_slots(deal_id, starts_at);
ALTER TABLE public.deal_time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_time_slots public read active"
  ON public.deal_time_slots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id = deal_time_slots.deal_id
      AND d.is_active = true AND d.status = 'approved'
  ));

CREATE POLICY "deal_time_slots owner manage"
  ON public.deal_time_slots FOR ALL
  USING (EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id = deal_time_slots.deal_id AND d.business_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id = deal_time_slots.deal_id AND d.business_id = auth.uid()
  ));

CREATE POLICY "deal_time_slots admin all"
  ON public.deal_time_slots FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_deal_time_slots_updated_at
  BEFORE UPDATE ON public.deal_time_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) parity_checks extended for deal-level scans (not just affiliate_links)
ALTER TABLE public.parity_checks
  ADD COLUMN IF NOT EXISTS deal_id uuid,
  ADD COLUMN IF NOT EXISTS scanned_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cheapest_competitor_cents integer,
  ADD COLUMN IF NOT EXISTS cheapest_competitor_network text,
  ADD COLUMN IF NOT EXISTS cheapest_competitor_url text,
  ADD COLUMN IF NOT EXISTS check_in date,
  ADD COLUMN IF NOT EXISTS check_out date,
  ADD COLUMN IF NOT EXISTS guests integer;

ALTER TABLE public.parity_checks ALTER COLUMN link_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parity_checks_deal_time
  ON public.parity_checks(deal_id, ran_at DESC);

-- Allow business owner to read parity checks for their own deals
CREATE POLICY "parity_checks deal owner read"
  ON public.parity_checks FOR SELECT
  USING (deal_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM deals d WHERE d.id = parity_checks.deal_id AND d.business_id = auth.uid()
  ));

-- Public read for deal-attached parity checks (so travellers can see the badge)
CREATE POLICY "parity_checks public read deal"
  ON public.parity_checks FOR SELECT
  USING (deal_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id = parity_checks.deal_id
      AND d.is_active = true AND d.status = 'approved'
  ));

-- 6) Commission defaults: 8% → 11%
ALTER TABLE public.bookings ALTER COLUMN commission_pct SET DEFAULT 11.00;
ALTER TABLE public.business_invites ALTER COLUMN commission_pct SET DEFAULT 11.00;
ALTER TABLE public.business_invites ALTER COLUMN creator_share_pct SET DEFAULT 5.50;
ALTER TABLE public.business_invites ALTER COLUMN platform_share_pct SET DEFAULT 5.50;
