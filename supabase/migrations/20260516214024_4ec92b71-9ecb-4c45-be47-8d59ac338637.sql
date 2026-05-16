
CREATE TABLE public.business_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  business_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  city TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  existing_business_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  creator_share_pct NUMERIC(5,2) NOT NULL DEFAULT 2.50,
  platform_share_pct NUMERIC(5,2) NOT NULL DEFAULT 2.50,
  accepted_business_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  decline_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_invites_video ON public.business_invites(video_id);
CREATE INDEX idx_business_invites_creator ON public.business_invites(creator_id);
CREATE INDEX idx_business_invites_token ON public.business_invites(token);
CREATE INDEX idx_business_invites_status ON public.business_invites(status);

ALTER TABLE public.business_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator manages own invites"
  ON public.business_invites
  FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "accepted business reads own invite"
  ON public.business_invites
  FOR SELECT
  USING (auth.uid() = accepted_business_id);

CREATE POLICY "admins read all invites"
  ON public.business_invites
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Public token-based read happens via server function using supabaseAdmin,
-- so no anon RLS policy is needed (and we avoid leaking all invites).

CREATE TRIGGER business_invites_touch_updated_at
  BEFORE UPDATE ON public.business_invites
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
