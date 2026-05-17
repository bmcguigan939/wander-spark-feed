
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS thefork_url text,
  ADD COLUMN IF NOT EXISTS is_restaurant boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.partner_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  partner text NOT NULL,
  business_id uuid,
  deal_id uuid,
  city text,
  click_ref text NOT NULL UNIQUE,
  destination_url text NOT NULL
);

CREATE INDEX IF NOT EXISTS partner_clicks_partner_created_idx
  ON public.partner_clicks (partner, created_at DESC);
CREATE INDEX IF NOT EXISTS partner_clicks_business_idx
  ON public.partner_clicks (business_id) WHERE business_id IS NOT NULL;

ALTER TABLE public.partner_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_clicks anon insert"
  ON public.partner_clicks
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "partner_clicks admin read"
  ON public.partner_clicks
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
