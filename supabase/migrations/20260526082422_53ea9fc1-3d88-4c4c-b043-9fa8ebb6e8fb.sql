
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_requirements jsonb,
  ADD COLUMN IF NOT EXISTS stripe_connect_country text,
  ADD COLUMN IF NOT EXISTS stripe_connect_default_currency text,
  ADD COLUMN IF NOT EXISTS stripe_connect_updated_at timestamptz;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS connect_account_id text;

CREATE TABLE IF NOT EXISTS public.connect_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_payout_id text NOT NULL UNIQUE,
  stripe_account_id text NOT NULL,
  amount_cents bigint NOT NULL,
  currency text NOT NULL,
  status text NOT NULL,
  arrival_date timestamptz,
  failure_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_connect_payouts_business
  ON public.connect_payouts(business_id, created_at DESC);

ALTER TABLE public.connect_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners view own payouts" ON public.connect_payouts;
CREATE POLICY "Business owners view own payouts"
  ON public.connect_payouts FOR SELECT
  USING (business_id = auth.uid());

DROP POLICY IF EXISTS "Admins view all payouts" ON public.connect_payouts;
CREATE POLICY "Admins view all payouts"
  ON public.connect_payouts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.deals_validate_operator_markup()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.pricing_model = 'operator_markup' THEN
    IF NEW.operator_base_price_cents IS NULL OR NEW.operator_base_price_cents <= 0 THEN
      RAISE EXCEPTION 'operator_markup deals require operator_base_price_cents > 0';
    END IF;
    IF NEW.bookable IS NOT TRUE THEN
      RAISE EXCEPTION 'operator_markup deals must be bookable through Travidz so the 11%% booking fee can be collected';
    END IF;
  END IF;
  IF NEW.bookable IS TRUE AND NEW.business_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = NEW.business_id
        AND (stripe_connect_payouts_enabled = true OR payout_method = 'manual_bank')
    ) THEN
      RAISE EXCEPTION 'business must complete Stripe Connect payout setup before listing bookable deals';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;
