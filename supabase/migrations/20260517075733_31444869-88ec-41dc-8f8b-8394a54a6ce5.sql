-- Cron jobs: publish scheduled videos, expire deals
-- Runs as SQL-only pg_cron tasks (no HTTP needed).

-- 1. Publish scheduled videos when their time arrives.
CREATE OR REPLACE FUNCTION public.cron_publish_scheduled_videos()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.videos
     SET status = 'ready',
         published_at = COALESCE(published_at, now()),
         is_draft = false,
         scheduled_at = NULL
   WHERE scheduled_at IS NOT NULL
     AND scheduled_at <= now()
     AND status IN ('scheduled', 'pending')
     AND mux_playback_id IS NOT NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- 2. Expire deals past their ends_at.
CREATE OR REPLACE FUNCTION public.cron_expire_deals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.deals
     SET is_active = false,
         updated_at = now()
   WHERE is_active = true
     AND ends_at IS NOT NULL
     AND ends_at < now();
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Schedule them (idempotent: unschedule if exists, then re-schedule).
DO $$
BEGIN
  PERFORM cron.unschedule('publish-scheduled-videos') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'publish-scheduled-videos');
  PERFORM cron.unschedule('expire-deals') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-deals');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'publish-scheduled-videos',
  '*/5 * * * *',  -- every 5 minutes
  $$SELECT public.cron_publish_scheduled_videos();$$
);

SELECT cron.schedule(
  'expire-deals',
  '*/15 * * * *', -- every 15 minutes
  $$SELECT public.cron_expire_deals();$$
);