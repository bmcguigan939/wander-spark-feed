-- Tighten the deal validation trigger: Stripe Connect is the only way to be bookable.
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
        AND stripe_connect_payouts_enabled = true
        AND stripe_connect_charges_enabled = true
    ) THEN
      RAISE EXCEPTION 'business must complete Stripe Connect onboarding (charges + payouts enabled) before listing bookable deals';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;

-- Migrate existing rows: unpublish any bookable deal whose owner is not Stripe Connect ready.
UPDATE public.deals d
SET bookable = false, is_active = false
WHERE d.bookable = true
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = d.business_id
      AND p.stripe_connect_payouts_enabled = true
      AND p.stripe_connect_charges_enabled = true
  );