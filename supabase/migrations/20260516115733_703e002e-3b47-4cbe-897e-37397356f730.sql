ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS lat double precision, ADD COLUMN IF NOT EXISTS lng double precision;
ALTER TABLE public.deals  ADD COLUMN IF NOT EXISTS lat double precision, ADD COLUMN IF NOT EXISTS lng double precision;
CREATE INDEX IF NOT EXISTS idx_videos_latlng ON public.videos (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_latlng  ON public.deals  (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;