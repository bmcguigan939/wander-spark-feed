-- 1. Deals: opt-in booking flag + inventory + cancellation policy
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS bookable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inventory_mode text NOT NULL DEFAULT 'unlimited' CHECK (inventory_mode IN ('unlimited','fixed','request')),
  ADD COLUMN IF NOT EXISTS inventory_remaining integer,
  ADD COLUMN IF NOT EXISTS cancellation_policy_code text NOT NULL DEFAULT 'travidz_standard';

-- 2. Profiles: business payout method
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_connect_status text NOT NULL DEFAULT 'none' CHECK (stripe_connect_status IN ('none','pending','active','restricted','rejected')),
  ADD COLUMN IF NOT EXISTS payout_method text NOT NULL DEFAULT 'none' CHECK (payout_method IN ('none','stripe_connect','manual_bank')),
  ADD COLUMN IF NOT EXISTS payout_bank_details_encrypted text;

-- 3. Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE RESTRICT,
  business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  creator_id uuid,
  referrer_video_id uuid,
  travel_date date,
  guests integer NOT NULL DEFAULT 1 CHECK (guests >= 1),
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  tax_cents integer NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  currency text NOT NULL DEFAULT 'GBP',
  commission_pct numeric NOT NULL DEFAULT 8.00,
  commission_cents integer NOT NULL DEFAULT 0,
  business_payout_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','confirmed','rejected','cancelled','refunded','no_show','completed')),
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text UNIQUE,
  stripe_transfer_id text,
  customer_email text,
  customer_name text,
  notes text,
  paid_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_deal ON public.bookings(deal_id);
CREATE INDEX IF NOT EXISTS idx_bookings_business ON public.bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_creator ON public.bookings(creator_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings customer read" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bookings business read" ON public.bookings FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "bookings creator read" ON public.bookings FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "bookings admin all" ON public.bookings FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "bookings business update" ON public.bookings FOR UPDATE USING (auth.uid() = business_id);

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Link deal_redemptions to a booking (optional)
ALTER TABLE public.deal_redemptions
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_deal_redemptions_booking ON public.deal_redemptions(booking_id);

-- 5. Business payouts
CREATE TABLE IF NOT EXISTS public.business_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  gross_cents integer NOT NULL DEFAULT 0,
  commission_cents integer NOT NULL DEFAULT 0,
  net_cents integer NOT NULL DEFAULT 0,
  booking_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','sent','paid','failed')),
  payout_method text,
  stripe_transfer_id text,
  external_reference text,
  notes text,
  approved_by uuid,
  approved_at timestamptz,
  paid_by uuid,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_payouts_business ON public.business_payouts(business_id);

ALTER TABLE public.business_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_payouts owner read" ON public.business_payouts FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "business_payouts admin all" ON public.business_payouts FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_business_payouts_updated_at
  BEFORE UPDATE ON public.business_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.business_payout_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.business_payouts(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  business_id uuid NOT NULL,
  gross_cents integer NOT NULL,
  commission_cents integer NOT NULL,
  net_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_payout_lines_payout ON public.business_payout_lines(payout_id);
CREATE INDEX IF NOT EXISTS idx_business_payout_lines_business ON public.business_payout_lines(business_id);

ALTER TABLE public.business_payout_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_payout_lines owner read" ON public.business_payout_lines FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "business_payout_lines admin all" ON public.business_payout_lines FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 6. Booking refunds
CREATE TABLE IF NOT EXISTS public.booking_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'GBP',
  reason text,
  initiated_by uuid,
  initiated_role text CHECK (initiated_role IN ('customer','business','admin','system')),
  stripe_refund_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_refunds_booking ON public.booking_refunds(booking_id);

ALTER TABLE public.booking_refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_refunds customer read" ON public.booking_refunds FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_refunds.booking_id AND b.user_id = auth.uid())
);
CREATE POLICY "booking_refunds business read" ON public.booking_refunds FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_refunds.booking_id AND b.business_id = auth.uid())
);
CREATE POLICY "booking_refunds admin all" ON public.booking_refunds FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 7. Restrict deal categories: forbid flights
-- (Soft enforcement via trigger so we don't break enum, but block insert/update if category is 'flight'-like)
CREATE OR REPLACE FUNCTION public.deals_forbid_flights()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF lower(coalesce(NEW.title,'')) ~ '\m(flight|flights|airline|airfare)\M'
     OR lower(coalesce(NEW.description,'')) ~ '\mflight\M.*(only|ticket|tickets)'
  THEN
    RAISE EXCEPTION 'Flights and flight-inclusive packages are not allowed on Travidz.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_deals_forbid_flights ON public.deals;
CREATE TRIGGER trg_deals_forbid_flights
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.deals_forbid_flights();