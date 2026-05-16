CREATE TABLE public.deal_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  referrer_video_id uuid,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_impressions_deal_time ON public.deal_impressions(deal_id, created_at DESC);
CREATE INDEX idx_deal_impressions_video ON public.deal_impressions(referrer_video_id);

ALTER TABLE public.deal_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_impressions anyone insert" ON public.deal_impressions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "deal_impressions owner read" ON public.deal_impressions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_impressions.deal_id AND d.business_id = auth.uid())
  );