
-- Application status enum
DO $$ BEGIN
  CREATE TYPE public.deal_application_status AS ENUM ('pending','approved','declined','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend notification type enum if needed
DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'deal_application';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'deal_application_decided';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.deal_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  business_id uuid NOT NULL,
  status public.deal_application_status NOT NULL DEFAULT 'pending',
  pitch text,
  requested_code text,
  approved_code text,
  commission_pct numeric(5,2),
  decided_at timestamptz,
  decided_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, creator_id)
);

CREATE INDEX IF NOT EXISTS deal_applications_creator_idx ON public.deal_applications(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS deal_applications_business_idx ON public.deal_applications(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS deal_applications_deal_idx ON public.deal_applications(deal_id, created_at DESC);

ALTER TABLE public.deal_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator inserts own application" ON public.deal_applications
  FOR INSERT WITH CHECK (auth.uid() = creator_id AND has_role(auth.uid(), 'creator'::app_role));

CREATE POLICY "creator reads own applications" ON public.deal_applications
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "business reads applications for own deals" ON public.deal_applications
  FOR SELECT USING (auth.uid() = business_id);

CREATE POLICY "creator updates own pending application" ON public.deal_applications
  FOR UPDATE USING (auth.uid() = creator_id AND status = 'pending');

CREATE POLICY "business updates applications for own deals" ON public.deal_applications
  FOR UPDATE USING (auth.uid() = business_id);

-- updated_at trigger
CREATE TRIGGER deal_applications_touch
  BEFORE UPDATE ON public.deal_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Notify business when creator applies
CREATE OR REPLACE FUNCTION public.notify_on_deal_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.creator_id = NEW.business_id THEN RETURN NULL; END IF;
  INSERT INTO public.notifications (user_id, actor_id, type, deal_id)
    VALUES (NEW.business_id, NEW.creator_id, 'deal_application', NEW.deal_id);
  RETURN NULL;
END $$;

CREATE TRIGGER deal_applications_notify_create
  AFTER INSERT ON public.deal_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_deal_application();

-- Notify creator when business decides
CREATE OR REPLACE FUNCTION public.notify_on_deal_application_decided()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NULL; END IF;
  IF NEW.status IN ('approved','declined') THEN
    INSERT INTO public.notifications (user_id, actor_id, type, deal_id)
      VALUES (NEW.creator_id, COALESCE(NEW.decided_by, NEW.business_id), 'deal_application_decided', NEW.deal_id);
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER deal_applications_notify_decide
  AFTER UPDATE ON public.deal_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_deal_application_decided();
