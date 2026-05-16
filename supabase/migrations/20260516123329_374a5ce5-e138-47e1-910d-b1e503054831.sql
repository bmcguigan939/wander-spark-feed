
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

UPDATE public.videos
  SET published_at = COALESCE(published_at, created_at)
  WHERE status = 'ready' AND is_draft = false AND scheduled_at IS NULL;

DROP POLICY IF EXISTS "videos public read ready" ON public.videos;

CREATE POLICY "videos public read ready"
ON public.videos
FOR SELECT
USING (
  (
    status = 'ready'
    AND is_hidden = false
    AND is_draft = false
    AND (scheduled_at IS NULL OR scheduled_at <= now())
  )
  OR creator_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE INDEX IF NOT EXISTS videos_creator_status_idx
  ON public.videos (creator_id, status, is_draft, scheduled_at DESC);
