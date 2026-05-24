
-- ============================================================
-- Rooms + Rate Plans for deals
-- ============================================================

-- 1. deal_rooms
CREATE TABLE public.deal_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  bed_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  room_size_sqm NUMERIC,
  max_guests INTEGER NOT NULL DEFAULT 2,
  inventory_total INTEGER,
  inventory_remaining INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_rooms_deal_id ON public.deal_rooms(deal_id);

ALTER TABLE public.deal_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_rooms admin all" ON public.deal_rooms
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "deal_rooms owner manage" ON public.deal_rooms
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_rooms.deal_id AND d.business_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_rooms.deal_id AND d.business_id = auth.uid()
  ));

CREATE POLICY "deal_rooms public read active" ON public.deal_rooms
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_rooms.deal_id
      AND d.is_active = true
      AND d.status = 'approved'
  ));

CREATE TRIGGER trg_deal_rooms_updated_at
  BEFORE UPDATE ON public.deal_rooms
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. deal_rate_plans
CREATE TABLE public.deal_rate_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  compare_at_price_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'GBP',
  cancellation_policy_code TEXT NOT NULL DEFAULT 'travidz_standard',
  payment_timing TEXT NOT NULL DEFAULT 'pay_online'
    CHECK (payment_timing IN ('pay_online','pay_at_property','deposit_online_rest_at_property')),
  deposit_pct NUMERIC,
  breakfast TEXT NOT NULL DEFAULT 'none'
    CHECK (breakfast IN ('included','available_paid','none')),
  guests_included INTEGER NOT NULL DEFAULT 1,
  perks JSONB NOT NULL DEFAULT '[]'::jsonb,
  discount_label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_rate_plans_deal_id ON public.deal_rate_plans(deal_id);
CREATE INDEX idx_deal_rate_plans_room_id ON public.deal_rate_plans(room_id);

ALTER TABLE public.deal_rate_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_rate_plans admin all" ON public.deal_rate_plans
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "deal_rate_plans owner manage" ON public.deal_rate_plans
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_rate_plans.deal_id AND d.business_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_rate_plans.deal_id AND d.business_id = auth.uid()
  ));

CREATE POLICY "deal_rate_plans public read active" ON public.deal_rate_plans
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_rate_plans.deal_id
      AND d.is_active = true
      AND d.status = 'approved'
  ));

CREATE TRIGGER trg_deal_rate_plans_updated_at
  BEFORE UPDATE ON public.deal_rate_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Backfill: one default rate plan per existing deal
INSERT INTO public.deal_rate_plans (
  deal_id, name, price_cents, currency, cancellation_policy_code,
  payment_timing, breakfast, guests_included, sort_order, is_active
)
SELECT
  d.id,
  'Standard rate',
  COALESCE(d.price_cents, 0),
  COALESCE(d.currency, 'GBP'),
  COALESCE(d.cancellation_policy_code, 'travidz_standard'),
  'pay_online',
  'none',
  1,
  0,
  true
FROM public.deals d
WHERE NOT EXISTS (
  SELECT 1 FROM public.deal_rate_plans rp WHERE rp.deal_id = d.id
);

-- 4. Trigger: recompute deals.price_cents = MIN(active rate plan prices)
CREATE OR REPLACE FUNCTION public.recompute_deal_from_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_deal_id UUID;
  min_price INTEGER;
BEGIN
  target_deal_id := COALESCE(NEW.deal_id, OLD.deal_id);
  SELECT MIN(price_cents) INTO min_price
  FROM public.deal_rate_plans
  WHERE deal_id = target_deal_id AND is_active = true;

  IF min_price IS NOT NULL THEN
    UPDATE public.deals SET price_cents = min_price, updated_at = now()
    WHERE id = target_deal_id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_rate_plans_recompute_from_price
  AFTER INSERT OR UPDATE OR DELETE ON public.deal_rate_plans
  FOR EACH ROW EXECUTE FUNCTION public.recompute_deal_from_price();

-- 5. Bookings: add columns for rate plan + payment timing
ALTER TABLE public.bookings
  ADD COLUMN rate_plan_id UUID REFERENCES public.deal_rate_plans(id),
  ADD COLUMN room_id UUID REFERENCES public.deal_rooms(id),
  ADD COLUMN payment_timing TEXT NOT NULL DEFAULT 'pay_online'
    CHECK (payment_timing IN ('pay_online','pay_at_property','deposit_online_rest_at_property')),
  ADD COLUMN balance_due_at_property_cents INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_bookings_rate_plan_id ON public.bookings(rate_plan_id);
CREATE INDEX idx_bookings_room_id ON public.bookings(room_id);
