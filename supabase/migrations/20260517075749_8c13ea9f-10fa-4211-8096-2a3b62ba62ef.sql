REVOKE EXECUTE ON FUNCTION public.cron_publish_scheduled_videos() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cron_expire_deals() FROM PUBLIC, anon, authenticated;