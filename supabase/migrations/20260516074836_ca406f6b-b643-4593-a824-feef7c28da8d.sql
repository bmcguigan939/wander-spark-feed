-- Captions
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS captions_ready boolean NOT NULL DEFAULT false;

-- Business role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'business';

-- Deals
CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  destination text,
  country text,
  city text,
  discount_label text,
  price_cents integer,
  currency text DEFAULT 'USD',
  url text NOT NULL,
  image_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  click_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deals_country_city ON public.deals (country, city) WHERE is_active;
CREATE INDEX idx_deals_business ON public.deals (business_id);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deals public read active"
  ON public.deals FOR SELECT USING (
    is_active
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY "deals owner read"
  ON public.deals FOR SELECT USING (auth.uid() = business_id);

CREATE POLICY "deals owner insert"
  ON public.deals FOR INSERT WITH CHECK (
    auth.uid() = business_id AND public.has_role(auth.uid(), 'business')
  );

CREATE POLICY "deals owner update"
  ON public.deals FOR UPDATE USING (auth.uid() = business_id);

CREATE POLICY "deals owner delete"
  ON public.deals FOR DELETE USING (auth.uid() = business_id);

-- Deal clicks
CREATE TABLE public.deal_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id uuid,
  referrer_video_id uuid,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_clicks_deal_time ON public.deal_clicks (deal_id, clicked_at DESC);

ALTER TABLE public.deal_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_clicks anyone insert"
  ON public.deal_clicks FOR INSERT WITH CHECK (true);

CREATE POLICY "deal_clicks owner read"
  ON public.deal_clicks FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_clicks.deal_id AND d.business_id = auth.uid())
  );

-- Bump deal click count
CREATE OR REPLACE FUNCTION public.bump_deal_click_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.deals SET click_count = click_count + 1 WHERE id = NEW.deal_id;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_bump_deal_click_count
AFTER INSERT ON public.deal_clicks
FOR EACH ROW EXECUTE FUNCTION public.bump_deal_click_count();

-- updated_at trigger for deals
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_deals_touch_updated_at
BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage bucket for deal images
INSERT INTO storage.buckets (id, name, public) VALUES ('deal-images', 'deal-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "deal images public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'deal-images');

CREATE POLICY "business uploads own deal image"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'deal-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND public.has_role(auth.uid(), 'business')
  );

CREATE POLICY "business updates own deal image"
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'deal-images' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "business deletes own deal image"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'deal-images' AND auth.uid()::text = (storage.foldername(name))[1]
  );