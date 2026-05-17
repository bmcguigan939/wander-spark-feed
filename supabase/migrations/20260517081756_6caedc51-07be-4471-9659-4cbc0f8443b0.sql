
-- 1. New notification type enum values
DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'redemption_confirmed';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'redemption_rejected';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'deal_expiring_soon';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. redemption_id column on notifications for deep-linking
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS redemption_id uuid;

-- 3. Trigger: redemption status transitions -> notifications
CREATE OR REPLACE FUNCTION public.notify_on_redemption_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz_id uuid;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NULL; END IF;

  SELECT business_id INTO biz_id FROM public.deals WHERE id = NEW.deal_id;

  IF NEW.status = 'confirmed' THEN
    -- creator
    IF NEW.creator_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, actor_id, type, deal_id, redemption_id)
      VALUES (NEW.creator_id, COALESCE(NEW.confirmed_by, biz_id, NEW.creator_id), 'redemption_confirmed', NEW.deal_id, NEW.id);
    END IF;
    -- traveller
    IF NEW.user_id IS NOT NULL AND NEW.user_id <> COALESCE(NEW.creator_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications (user_id, actor_id, type, deal_id, redemption_id)
      VALUES (NEW.user_id, COALESCE(NEW.confirmed_by, biz_id, NEW.user_id), 'redemption_confirmed', NEW.deal_id, NEW.id);
    END IF;
  ELSIF NEW.status = 'rejected' THEN
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, actor_id, type, deal_id, redemption_id)
      VALUES (NEW.user_id, COALESCE(NEW.confirmed_by, biz_id, NEW.user_id), 'redemption_rejected', NEW.deal_id, NEW.id);
    END IF;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_notify_on_redemption_status ON public.deal_redemptions;
CREATE TRIGGER trg_notify_on_redemption_status
  AFTER UPDATE ON public.deal_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_redemption_status();

-- 4. Expiring-deals notification function (to be called by cron)
CREATE OR REPLACE FUNCTION public.notify_expiring_deals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  WITH candidates AS (
    SELECT d.id AS deal_id, d.business_id
    FROM public.deals d
    WHERE d.is_active = true
      AND d.business_id IS NOT NULL
      AND d.ends_at IS NOT NULL
      AND d.ends_at > now()
      AND d.ends_at <= now() + interval '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.deal_id = d.id
          AND n.type = 'deal_expiring_soon'
          AND n.created_at > now() - interval '7 days'
      )
  ), ins AS (
    INSERT INTO public.notifications (user_id, actor_id, type, deal_id)
    SELECT business_id, business_id, 'deal_expiring_soon', deal_id FROM candidates
    RETURNING 1
  )
  SELECT count(*) INTO inserted_count FROM ins;
  RETURN inserted_count;
END $$;

-- 5. Email preferences
CREATE TABLE IF NOT EXISTS public.email_preferences (
  user_id uuid PRIMARY KEY,
  notify_redemption boolean NOT NULL DEFAULT true,
  notify_expiry boolean NOT NULL DEFAULT true,
  notify_social boolean NOT NULL DEFAULT true,
  notify_applications boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_prefs self read" ON public.email_preferences;
CREATE POLICY "email_prefs self read" ON public.email_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "email_prefs self upsert" ON public.email_preferences;
CREATE POLICY "email_prefs self upsert" ON public.email_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "email_prefs self update" ON public.email_preferences;
CREATE POLICY "email_prefs self update" ON public.email_preferences
  FOR UPDATE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_email_prefs_touch ON public.email_preferences;
CREATE TRIGGER trg_email_prefs_touch
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6. Creator earnings monthly view (security_invoker = RLS on deal_redemptions applies)
CREATE OR REPLACE VIEW public.creator_earnings_monthly
WITH (security_invoker = true)
AS
SELECT
  r.creator_id,
  date_trunc('month', COALESCE(r.confirmed_at, r.created_at))::date AS month,
  count(*)                                                AS redemption_count,
  COALESCE(sum(r.order_value_cents) FILTER (WHERE r.status = 'confirmed'), 0)::bigint AS gross_order_cents,
  COALESCE(sum(r.commission_cents)  FILTER (WHERE r.status = 'confirmed'), 0)::bigint AS commission_cents_total,
  COALESCE(sum(r.commission_cents)
    FILTER (WHERE r.status = 'confirmed' AND r.confirmed_at IS NOT NULL AND r.confirmed_at < now() - interval '14 days'), 0)::bigint AS payable_cents,
  COALESCE(sum(r.commission_cents)
    FILTER (WHERE r.status = 'confirmed' AND (r.confirmed_at IS NULL OR r.confirmed_at >= now() - interval '14 days')), 0)::bigint AS pending_cents
FROM public.deal_redemptions r
WHERE r.creator_id IS NOT NULL
GROUP BY r.creator_id, date_trunc('month', COALESCE(r.confirmed_at, r.created_at));

GRANT SELECT ON public.creator_earnings_monthly TO authenticated;
