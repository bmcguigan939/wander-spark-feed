
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS source_platform text NOT NULL DEFAULT 'travidz',
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_video_id text,
  ADD COLUMN IF NOT EXISTS embed_mode text NOT NULL DEFAULT 'mirror';

ALTER TABLE public.videos
  ADD CONSTRAINT videos_source_platform_chk
  CHECK (source_platform IN ('travidz','youtube','tiktok','instagram','x'));

ALTER TABLE public.videos
  ADD CONSTRAINT videos_embed_mode_chk
  CHECK (embed_mode IN ('mirror','link_card'));

CREATE INDEX IF NOT EXISTS idx_videos_source ON public.videos(source_platform, source_video_id);

-- Update the public read policy so link_card videos with no Mux asset are still viewable
DROP POLICY IF EXISTS "videos public read ready" ON public.videos;
CREATE POLICY "videos public read ready" ON public.videos
FOR SELECT USING (
  (
    (status = 'ready' OR embed_mode = 'link_card')
    AND is_hidden = false
    AND is_draft = false
    AND (scheduled_at IS NULL OR scheduled_at <= now())
  )
  OR creator_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE TABLE public.profile_socials (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  youtube_handle text,
  youtube_channel_id text,
  tiktok_handle text,
  instagram_handle text,
  x_handle text,
  website_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_socials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_socials public read"
  ON public.profile_socials FOR SELECT USING (true);

CREATE POLICY "profile_socials self insert"
  ON public.profile_socials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_socials self update"
  ON public.profile_socials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "profile_socials self delete"
  ON public.profile_socials FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER profile_socials_touch BEFORE UPDATE ON public.profile_socials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
