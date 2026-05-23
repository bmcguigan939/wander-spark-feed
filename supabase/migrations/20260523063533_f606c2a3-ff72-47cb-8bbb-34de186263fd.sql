DROP TRIGGER IF EXISTS trg_likes_bump ON public.likes;
DROP TRIGGER IF EXISTS trg_saves_bump ON public.saves;
DROP TRIGGER IF EXISTS trg_comments_bump ON public.comments;
DROP TRIGGER IF EXISTS trg_notify_on_like ON public.likes;
DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.comments;
DROP TRIGGER IF EXISTS trg_comments_touch_updated_at ON public.comments;