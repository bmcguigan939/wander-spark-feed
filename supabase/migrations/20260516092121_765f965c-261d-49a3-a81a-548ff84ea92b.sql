
-- Comments table
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) > 0 AND length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_video_created ON public.comments(video_id, created_at DESC);
CREATE INDEX idx_comments_parent ON public.comments(parent_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments public read" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments auth insert" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments owner update" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "comments owner delete" ON public.comments FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER comments_touch_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Denormalized counter on videos
ALTER TABLE public.videos ADD COLUMN comment_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.bump_video_comment_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET comment_count = comment_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.video_id;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER comments_bump_count
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.bump_video_comment_count();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
