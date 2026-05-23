-- Extend profiles with business info fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS business_website_url text,
  ADD COLUMN IF NOT EXISTS business_logo_url text,
  ADD COLUMN IF NOT EXISTS business_city text,
  ADD COLUMN IF NOT EXISTS business_country text;

-- creator_business_signings: creator <-> business agreement
CREATE TABLE IF NOT EXISTS public.creator_business_signings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  business_id uuid NOT NULL,
  commission_pct numeric(5,2) NOT NULL DEFAULT 11.00,
  creator_share_pct numeric(5,2) NOT NULL DEFAULT 5.50,
  platform_share_pct numeric(5,2) NOT NULL DEFAULT 5.50,
  agreement_version text NOT NULL DEFAULT 'v1',
  accepted_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','terminated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_cbs_creator ON public.creator_business_signings(creator_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_cbs_business ON public.creator_business_signings(business_id) WHERE status = 'active';

ALTER TABLE public.creator_business_signings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active signings are viewable by everyone"
  ON public.creator_business_signings FOR SELECT
  USING (status = 'active');

CREATE POLICY "Creators can insert their own signings"
  ON public.creator_business_signings FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own signings"
  ON public.creator_business_signings FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Businesses can update their own signings"
  ON public.creator_business_signings FOR UPDATE
  USING (auth.uid() = business_id);

CREATE POLICY "Creators can delete their own signings"
  ON public.creator_business_signings FOR DELETE
  USING (auth.uid() = creator_id);

CREATE TRIGGER cbs_touch_updated_at
  BEFORE UPDATE ON public.creator_business_signings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- business_clicks: traveller taps "Book with {business}" on a video
CREATE TABLE IF NOT EXISTS public.business_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  creator_id uuid,
  referrer_video_id uuid,
  user_id uuid,
  user_agent text,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bc_business ON public.business_clicks(business_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_bc_creator ON public.business_clicks(creator_id, clicked_at DESC);

ALTER TABLE public.business_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a click"
  ON public.business_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Business can view their clicks"
  ON public.business_clicks FOR SELECT
  USING (auth.uid() = business_id);

CREATE POLICY "Creator can view their attributed clicks"
  ON public.business_clicks FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Admins can view all clicks"
  ON public.business_clicks FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
