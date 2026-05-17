
-- 1. Drop open insert policies; inserts happen via service-role server fns only
DROP POLICY IF EXISTS "deal_clicks anyone insert" ON public.deal_clicks;
DROP POLICY IF EXISTS "deal_impressions anyone insert" ON public.deal_impressions;
DROP POLICY IF EXISTS "affiliate_clicks anyone insert" ON public.affiliate_clicks;
DROP POLICY IF EXISTS "anyone inserts own view" ON public.video_views;

-- 2. Enable realtime for notifications
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
