
-- ============ deals: extend for AI discovery ============
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS affiliate_network text,
  ADD COLUMN IF NOT EXISTS original_url text,
  ADD COLUMN IF NOT EXISTS ai_confidence numeric,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS discovered_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

ALTER TABLE public.deals
  ADD CONSTRAINT deals_source_check
  CHECK (source IN ('manual','ai_discovered','affiliate_import'));

ALTER TABLE public.deals
  ADD CONSTRAINT deals_status_check
  CHECK (status IN ('pending_review','approved','rejected','expired'));

ALTER TABLE public.deals ALTER COLUMN business_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS deals_status_active_idx
  ON public.deals (status, is_active);
CREATE INDEX IF NOT EXISTS deals_country_city_idx
  ON public.deals (country, city);
CREATE INDEX IF NOT EXISTS deals_original_url_idx
  ON public.deals (original_url);

-- Update public-read policy so AI-discovered rows require approved status.
DROP POLICY IF EXISTS "deals public read active" ON public.deals;
CREATE POLICY "deals public read active" ON public.deals
  FOR SELECT
  USING (
    is_active
    AND status = 'approved'
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

-- Service role inserts (AI cron + serverFns) handled implicitly by service_role.
-- Existing "deals owner insert" still allows business-owned manual deals.

-- ============ video_deals ============
CREATE TABLE IF NOT EXISTS public.video_deals (
  video_id uuid NOT NULL,
  deal_id uuid NOT NULL,
  position int NOT NULL DEFAULT 0,
  attached_at timestamptz NOT NULL DEFAULT now(),
  attached_by uuid NOT NULL,
  PRIMARY KEY (video_id, deal_id)
);

CREATE INDEX IF NOT EXISTS video_deals_video_idx ON public.video_deals (video_id, position);
CREATE INDEX IF NOT EXISTS video_deals_deal_idx ON public.video_deals (deal_id);

ALTER TABLE public.video_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_deals public read" ON public.video_deals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_deals.video_id
        AND (
          (v.status = 'ready' OR v.embed_mode = 'link_card')
          AND v.is_hidden = false
          AND v.is_draft = false
          AND (v.scheduled_at IS NULL OR v.scheduled_at <= now())
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_deals.video_id
        AND v.creator_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "video_deals creator insert" ON public.video_deals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_deals.video_id
        AND v.creator_id = auth.uid()
    )
    AND attached_by = auth.uid()
  );

CREATE POLICY "video_deals creator delete" ON public.video_deals
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_deals.video_id
        AND v.creator_id = auth.uid()
    )
  );

CREATE POLICY "video_deals creator update" ON public.video_deals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_deals.video_id
        AND v.creator_id = auth.uid()
    )
  );

-- ============ video_deal_suggestions ============
CREATE TABLE IF NOT EXISTS public.video_deal_suggestions (
  video_id uuid NOT NULL,
  deal_id uuid NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  suggested_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, deal_id)
);

CREATE INDEX IF NOT EXISTS video_deal_suggestions_video_idx
  ON public.video_deal_suggestions (video_id, score DESC);

ALTER TABLE public.video_deal_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_deal_suggestions creator read" ON public.video_deal_suggestions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_deal_suggestions.video_id
        AND v.creator_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Writes are service-role only (no policy needed; service role bypasses RLS).

-- ============ deal_discovery_runs ============
CREATE TABLE IF NOT EXISTS public.deal_discovery_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  query text,
  candidates_found int NOT NULL DEFAULT 0,
  inserted int NOT NULL DEFAULT 0,
  skipped_duplicate int NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.deal_discovery_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_discovery_runs admin read" ON public.deal_discovery_runs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ affiliate_partners ============
CREATE TABLE IF NOT EXISTS public.affiliate_partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  network text NOT NULL UNIQUE,
  display_name text NOT NULL,
  commission_pct numeric,
  tracking_param text,
  tracking_value text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliate_partners admin all" ON public.affiliate_partners
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER affiliate_partners_touch
  BEFORE UPDATE ON public.affiliate_partners
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
