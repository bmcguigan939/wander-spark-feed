ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS cross_links jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.videos
  DROP CONSTRAINT IF EXISTS videos_cross_links_shape;

ALTER TABLE public.videos
  ADD CONSTRAINT videos_cross_links_shape
  CHECK (
    jsonb_typeof(cross_links) = 'array'
    AND jsonb_array_length(cross_links) <= 5
  );