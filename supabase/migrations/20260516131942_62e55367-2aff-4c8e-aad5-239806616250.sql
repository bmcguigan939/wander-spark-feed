
-- Affiliate / booking links owned by creators
CREATE TABLE public.affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  video_id uuid NULL,
  provider text NOT NULL DEFAULT 'custom',
  label text NOT NULL,
  url text NOT NULL,
  commission_pct numeric NULL,
  is_active boolean NOT NULL DEFAULT true,
  click_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_links_creator ON public.affiliate_links(creator_id);
CREATE INDEX idx_affiliate_links_video ON public.affiliate_links(video_id) WHERE video_id IS NOT NULL;

ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliate_links public read active"
  ON public.affiliate_links FOR SELECT
  USING (is_active = true OR auth.uid() = creator_id OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "affiliate_links owner insert"
  ON public.affiliate_links FOR INSERT
  WITH CHECK (auth.uid() = creator_id AND has_role(auth.uid(),'creator'::app_role));

CREATE POLICY "affiliate_links owner update"
  ON public.affiliate_links FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "affiliate_links owner delete"
  ON public.affiliate_links FOR DELETE
  USING (auth.uid() = creator_id);

CREATE TRIGGER affiliate_links_touch
  BEFORE UPDATE ON public.affiliate_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Affiliate click events
CREATE TABLE public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL,
  user_id uuid NULL,
  referrer_video_id uuid NULL,
  clicked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_clicks_link ON public.affiliate_clicks(link_id);

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliate_clicks anyone insert"
  ON public.affiliate_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "affiliate_clicks owner read"
  ON public.affiliate_clicks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.affiliate_links l
    WHERE l.id = affiliate_clicks.link_id AND l.creator_id = auth.uid()
  ));

-- Bump click_count when a click is logged
CREATE OR REPLACE FUNCTION public.bump_affiliate_click_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.affiliate_links
     SET click_count = click_count + 1
   WHERE id = NEW.link_id;
  RETURN NULL;
END $$;

CREATE TRIGGER affiliate_clicks_bump
  AFTER INSERT ON public.affiliate_clicks
  FOR EACH ROW EXECUTE FUNCTION public.bump_affiliate_click_count();
