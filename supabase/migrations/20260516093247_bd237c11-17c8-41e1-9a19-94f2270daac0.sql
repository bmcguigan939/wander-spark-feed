-- Notification type enum
DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM ('like','comment','follow','reply');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                  -- recipient
  actor_id uuid NOT NULL,                 -- who triggered
  type public.notification_type NOT NULL,
  video_id uuid,
  comment_id uuid,
  deal_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications owner read" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications owner update" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications owner delete" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger fns
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner uuid;
BEGIN
  SELECT creator_id INTO owner FROM public.videos WHERE id = NEW.video_id;
  IF owner IS NULL OR owner = NEW.user_id THEN RETURN NULL; END IF;
  INSERT INTO public.notifications (user_id, actor_id, type, video_id)
    VALUES (owner, NEW.user_id, 'like', NEW.video_id);
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner uuid; parent_owner uuid;
BEGIN
  SELECT creator_id INTO owner FROM public.videos WHERE id = NEW.video_id;
  IF owner IS NOT NULL AND owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, video_id, comment_id)
      VALUES (owner, NEW.user_id, 'comment', NEW.video_id, NEW.id);
  END IF;
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_owner FROM public.comments WHERE id = NEW.parent_id;
    IF parent_owner IS NOT NULL AND parent_owner <> NEW.user_id AND parent_owner <> owner THEN
      INSERT INTO public.notifications (user_id, actor_id, type, video_id, comment_id)
        VALUES (parent_owner, NEW.user_id, 'reply', NEW.video_id, NEW.id);
    END IF;
  END IF;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.creator_id = NEW.follower_id THEN RETURN NULL; END IF;
  INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (NEW.creator_id, NEW.follower_id, 'follow');
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_notify_like ON public.likes;
CREATE TRIGGER trg_notify_like AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

DROP TRIGGER IF EXISTS trg_notify_comment ON public.comments;
CREATE TRIGGER trg_notify_comment AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

DROP TRIGGER IF EXISTS trg_notify_follow ON public.follows;
CREATE TRIGGER trg_notify_follow AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;