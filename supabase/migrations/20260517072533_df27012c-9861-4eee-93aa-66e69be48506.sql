
-- Phase 0: add missing foreign keys so PostgREST embedded selects work.
-- All wrapped in DO blocks so the migration is idempotent.

DO $$ BEGIN
  -- video_deals (currently breaking studio)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_deals_video_id_fkey') THEN
    ALTER TABLE public.video_deals
      ADD CONSTRAINT video_deals_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_deals_deal_id_fkey') THEN
    ALTER TABLE public.video_deals
      ADD CONSTRAINT video_deals_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_deals_attached_by_fkey') THEN
    ALTER TABLE public.video_deals
      ADD CONSTRAINT video_deals_attached_by_fkey FOREIGN KEY (attached_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- video_deal_suggestions
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_deal_suggestions_video_id_fkey') THEN
    ALTER TABLE public.video_deal_suggestions
      ADD CONSTRAINT video_deal_suggestions_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_deal_suggestions_deal_id_fkey') THEN
    ALTER TABLE public.video_deal_suggestions
      ADD CONSTRAINT video_deal_suggestions_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;
  END IF;

  -- video_business_suggestions
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_business_suggestions_video_id_fkey') THEN
    ALTER TABLE public.video_business_suggestions
      ADD CONSTRAINT video_business_suggestions_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_business_suggestions_converted_invite_id_fkey') THEN
    ALTER TABLE public.video_business_suggestions
      ADD CONSTRAINT video_business_suggestions_converted_invite_id_fkey FOREIGN KEY (converted_invite_id) REFERENCES public.business_invites(id) ON DELETE SET NULL;
  END IF;

  -- comments
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_video_id_fkey') THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_user_id_fkey') THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- notifications
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey') THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_actor_id_fkey') THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_video_id_fkey') THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_comment_id_fkey') THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_deal_id_fkey') THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;
  END IF;

  -- business_invites
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_invites_creator_id_fkey') THEN
    ALTER TABLE public.business_invites
      ADD CONSTRAINT business_invites_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- deal_applications
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_applications_creator_id_fkey') THEN
    ALTER TABLE public.deal_applications
      ADD CONSTRAINT deal_applications_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_applications_business_id_fkey') THEN
    ALTER TABLE public.deal_applications
      ADD CONSTRAINT deal_applications_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_applications_decided_by_fkey') THEN
    ALTER TABLE public.deal_applications
      ADD CONSTRAINT deal_applications_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- affiliate_links
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_links_creator_id_fkey') THEN
    ALTER TABLE public.affiliate_links
      ADD CONSTRAINT affiliate_links_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_links_video_id_fkey') THEN
    ALTER TABLE public.affiliate_links
      ADD CONSTRAINT affiliate_links_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE SET NULL;
  END IF;

  -- affiliate_clicks
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_clicks_link_id_fkey') THEN
    ALTER TABLE public.affiliate_clicks
      ADD CONSTRAINT affiliate_clicks_link_id_fkey FOREIGN KEY (link_id) REFERENCES public.affiliate_links(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_clicks_referrer_video_id_fkey') THEN
    ALTER TABLE public.affiliate_clicks
      ADD CONSTRAINT affiliate_clicks_referrer_video_id_fkey FOREIGN KEY (referrer_video_id) REFERENCES public.videos(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_clicks_user_id_fkey') THEN
    ALTER TABLE public.affiliate_clicks
      ADD CONSTRAINT affiliate_clicks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- deal_clicks
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_clicks_creator_id_fkey') THEN
    ALTER TABLE public.deal_clicks
      ADD CONSTRAINT deal_clicks_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_clicks_user_id_fkey') THEN
    ALTER TABLE public.deal_clicks
      ADD CONSTRAINT deal_clicks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_clicks_referrer_video_id_fkey') THEN
    ALTER TABLE public.deal_clicks
      ADD CONSTRAINT deal_clicks_referrer_video_id_fkey FOREIGN KEY (referrer_video_id) REFERENCES public.videos(id) ON DELETE SET NULL;
  END IF;

  -- deal_impressions (no FKs at all today)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_impressions_deal_id_fkey') THEN
    ALTER TABLE public.deal_impressions
      ADD CONSTRAINT deal_impressions_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_impressions_user_id_fkey') THEN
    ALTER TABLE public.deal_impressions
      ADD CONSTRAINT deal_impressions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_impressions_referrer_video_id_fkey') THEN
    ALTER TABLE public.deal_impressions
      ADD CONSTRAINT deal_impressions_referrer_video_id_fkey FOREIGN KEY (referrer_video_id) REFERENCES public.videos(id) ON DELETE SET NULL;
  END IF;

  -- deal_redirects
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_redirects_deal_id_fkey') THEN
    ALTER TABLE public.deal_redirects
      ADD CONSTRAINT deal_redirects_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_redirects_creator_id_fkey') THEN
    ALTER TABLE public.deal_redirects
      ADD CONSTRAINT deal_redirects_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- moderation_flags
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'moderation_flags_resolved_by_fkey') THEN
    ALTER TABLE public.moderation_flags
      ADD CONSTRAINT moderation_flags_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- itineraries
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'itineraries_user_id_fkey') THEN
    ALTER TABLE public.itineraries
      ADD CONSTRAINT itineraries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- admin_actions
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_actions_admin_id_fkey') THEN
    ALTER TABLE public.admin_actions
      ADD CONSTRAINT admin_actions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Make sure PostgREST reloads its schema cache
NOTIFY pgrst, 'reload schema';
