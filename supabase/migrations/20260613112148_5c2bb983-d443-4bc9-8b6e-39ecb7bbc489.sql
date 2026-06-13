ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS channel_manager_provider text,
  ADD COLUMN IF NOT EXISTS channel_manager_provider_other text,
  ADD COLUMN IF NOT EXISTS channel_manager_connect_skipped_at timestamptz;

CREATE TABLE IF NOT EXISTS public.business_channel_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text,
  feed_url text NOT NULL CHECK (char_length(feed_url) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, feed_url)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_channel_feeds TO authenticated;
GRANT ALL ON public.business_channel_feeds TO service_role;

ALTER TABLE public.business_channel_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their own feeds"
  ON public.business_channel_feeds
  FOR ALL
  TO authenticated
  USING (business_id = auth.uid())
  WITH CHECK (business_id = auth.uid());

CREATE POLICY "Admins can read all feeds"
  ON public.business_channel_feeds
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_business_channel_feeds_updated_at
  BEFORE UPDATE ON public.business_channel_feeds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_business_channel_feeds_business
  ON public.business_channel_feeds (business_id);