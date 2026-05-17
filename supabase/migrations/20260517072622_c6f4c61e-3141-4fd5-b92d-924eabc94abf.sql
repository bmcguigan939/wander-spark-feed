
-- Attach all the trigger functions that were defined but never wired up.

-- updated_at refresh on tables with that column
DO $$ DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
     WHERE table_schema='public' AND column_name='updated_at'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_touch_updated_at ON public.%1$I;
       CREATE TRIGGER trg_%1$s_touch_updated_at BEFORE UPDATE ON public.%1$I
       FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();', t);
  END LOOP;
END $$;

-- Counters
DROP TRIGGER IF EXISTS trg_likes_bump ON public.likes;
CREATE TRIGGER trg_likes_bump AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.bump_video_like_count();

DROP TRIGGER IF EXISTS trg_saves_bump ON public.saves;
CREATE TRIGGER trg_saves_bump AFTER INSERT OR DELETE ON public.saves
FOR EACH ROW EXECUTE FUNCTION public.bump_video_save_count();

DROP TRIGGER IF EXISTS trg_comments_bump ON public.comments;
CREATE TRIGGER trg_comments_bump AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.bump_video_comment_count();

DROP TRIGGER IF EXISTS trg_deal_clicks_bump ON public.deal_clicks;
CREATE TRIGGER trg_deal_clicks_bump AFTER INSERT ON public.deal_clicks
FOR EACH ROW EXECUTE FUNCTION public.bump_deal_click_count();

DROP TRIGGER IF EXISTS trg_affiliate_clicks_bump ON public.affiliate_clicks;
CREATE TRIGGER trg_affiliate_clicks_bump AFTER INSERT ON public.affiliate_clicks
FOR EACH ROW EXECUTE FUNCTION public.bump_affiliate_click_count();

-- Search index
DROP TRIGGER IF EXISTS trg_videos_search_tsv ON public.videos;
CREATE TRIGGER trg_videos_search_tsv BEFORE INSERT OR UPDATE OF title, description, destination, country, city, activity_tags, transcript
ON public.videos FOR EACH ROW EXECUTE FUNCTION public.videos_update_search_tsv();

-- Backfill existing rows' search_tsv now that the trigger exists
UPDATE public.videos SET title = title WHERE search_tsv IS NULL;

-- Notifications
DROP TRIGGER IF EXISTS trg_notify_on_like ON public.likes;
CREATE TRIGGER trg_notify_on_like AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.comments;
CREATE TRIGGER trg_notify_on_comment AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.follows;
CREATE TRIGGER trg_notify_on_follow AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

DROP TRIGGER IF EXISTS trg_notify_on_deal_application ON public.deal_applications;
CREATE TRIGGER trg_notify_on_deal_application AFTER INSERT ON public.deal_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_on_deal_application();

DROP TRIGGER IF EXISTS trg_notify_on_deal_application_decided ON public.deal_applications;
CREATE TRIGGER trg_notify_on_deal_application_decided AFTER UPDATE OF status ON public.deal_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_on_deal_application_decided();

-- Approved deal_application -> deal_redirect sync
DROP TRIGGER IF EXISTS trg_sync_deal_redirect ON public.deal_applications;
CREATE TRIGGER trg_sync_deal_redirect AFTER INSERT OR UPDATE OF status, approved_code ON public.deal_applications
FOR EACH ROW EXECUTE FUNCTION public.sync_deal_redirect();

-- handle_new_user on auth.users (creates profile + assigns traveller role)
DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
CREATE TRIGGER trg_handle_new_user AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add `business_invite_received` notification type if missing, and trigger for new invites
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type' AND e.enumlabel = 'business_invite_received'
  ) THEN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'business_invite_received';
  END IF;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
