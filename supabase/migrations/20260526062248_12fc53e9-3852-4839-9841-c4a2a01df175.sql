
-- Defaults
CREATE TABLE public.business_collab_defaults (
  business_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  default_deliverables jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_comp_room_id uuid REFERENCES public.deal_rooms(id) ON DELETE SET NULL,
  default_nights integer,
  default_usage_rights_days integer NOT NULL DEFAULT 90,
  default_commission_pct numeric(5,2) NOT NULL DEFAULT 10,
  brand_dos text,
  brand_donts text,
  required_hashtags text[] NOT NULL DEFAULT '{}'::text[],
  required_mentions text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_collab_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business reads own collab defaults" ON public.business_collab_defaults
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "business writes own collab defaults" ON public.business_collab_defaults
  FOR ALL USING (auth.uid() = business_id) WITH CHECK (auth.uid() = business_id);
CREATE TRIGGER touch_business_collab_defaults BEFORE UPDATE ON public.business_collab_defaults
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Rules
CREATE TABLE public.business_collab_rules (
  business_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  auto_accept_enabled boolean NOT NULL DEFAULT false,
  min_followers integer NOT NULL DEFAULT 0,
  min_rolling_gbv_cents integer NOT NULL DEFAULT 0,
  require_power_tier boolean NOT NULL DEFAULT false,
  require_verified boolean NOT NULL DEFAULT false,
  max_accepts_per_month integer,
  max_concurrent_active integer,
  manual_review_above_followers integer,
  blackout_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_collab_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business reads own collab rules" ON public.business_collab_rules
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "business writes own collab rules" ON public.business_collab_rules
  FOR ALL USING (auth.uid() = business_id) WITH CHECK (auth.uid() = business_id);
CREATE TRIGGER touch_business_collab_rules BEFORE UPDATE ON public.business_collab_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-decision tracking
ALTER TABLE public.deal_applications
  ADD COLUMN auto_decided boolean NOT NULL DEFAULT false,
  ADD COLUMN auto_decision_reason text;
CREATE INDEX deal_applications_business_auto_idx
  ON public.deal_applications(business_id, auto_decided, created_at DESC);
