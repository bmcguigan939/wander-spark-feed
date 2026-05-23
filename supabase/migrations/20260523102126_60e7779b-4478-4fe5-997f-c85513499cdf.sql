ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS bumped_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_videos_bumped_at ON public.videos (bumped_at DESC NULLS LAST);