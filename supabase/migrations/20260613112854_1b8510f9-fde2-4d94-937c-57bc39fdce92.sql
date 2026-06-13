
ALTER TABLE public.business_channel_feeds
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_status text,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS last_blocked_count integer;

ALTER TABLE public.deal_external_calendars
  ADD COLUMN IF NOT EXISTS business_feed_id uuid
    REFERENCES public.business_channel_feeds(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_deal_external_calendars_business_feed
  ON public.deal_external_calendars(business_feed_id)
  WHERE business_feed_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_deal_external_calendars_deal_feed
  ON public.deal_external_calendars(deal_id, business_feed_id)
  WHERE business_feed_id IS NOT NULL;
