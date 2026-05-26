-- A. Operator site embed: add columns + host-normalisation trigger on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS operator_site_url text,
  ADD COLUMN IF NOT EXISTS operator_site_host text;

CREATE OR REPLACE FUNCTION public.profiles_normalise_operator_host()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
DECLARE
  v_host text;
BEGIN
  IF NEW.operator_site_url IS NOT NULL AND length(trim(NEW.operator_site_url)) > 0 THEN
    v_host := lower(regexp_replace(NEW.operator_site_url, '^https?://([^/]+).*$', '\1'));
    v_host := regexp_replace(v_host, '^www\.', '');
    NEW.operator_site_host := v_host;
  ELSE
    NEW.operator_site_host := NULL;
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_profiles_normalise_operator_host ON public.profiles;
CREATE TRIGGER trg_profiles_normalise_operator_host
BEFORE INSERT OR UPDATE OF operator_site_url
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profiles_normalise_operator_host();

-- B. Validation trigger for operator_markup deals
CREATE OR REPLACE FUNCTION public.deals_validate_operator_markup()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF NEW.pricing_model = 'operator_markup' THEN
    IF NEW.operator_base_price_cents IS NULL OR NEW.operator_base_price_cents <= 0 THEN
      RAISE EXCEPTION 'operator_markup deals require operator_base_price_cents > 0';
    END IF;
    IF NEW.bookable IS NOT TRUE THEN
      RAISE EXCEPTION 'operator_markup deals must be bookable through Travidz so the 11%% booking fee can be collected';
    END IF;
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_deals_validate_operator_markup ON public.deals;
CREATE TRIGGER trg_deals_validate_operator_markup
BEFORE INSERT OR UPDATE OF pricing_model, operator_base_price_cents, bookable
ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.deals_validate_operator_markup();