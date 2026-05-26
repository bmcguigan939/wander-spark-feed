-- Activity operator pricing model
DO $$ BEGIN
  CREATE TYPE public.deal_pricing_model AS ENUM ('commission', 'operator_markup');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS pricing_model public.deal_pricing_model NOT NULL DEFAULT 'commission',
  ADD COLUMN IF NOT EXISTS operator_base_price_cents integer,
  ADD COLUMN IF NOT EXISTS operator_site_url text,
  ADD COLUMN IF NOT EXISTS operator_site_host text;

-- Derive normalised host (lower-case, strip leading www.) from operator_site_url
-- and apply the 11% Travidz uplift to operator_markup deals.
CREATE OR REPLACE FUNCTION public.deals_apply_operator_markup()
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

  IF NEW.pricing_model = 'operator_markup' AND NEW.operator_base_price_cents IS NOT NULL THEN
    NEW.price_cents := round(NEW.operator_base_price_cents * 1.11)::int;
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_deals_apply_operator_markup ON public.deals;
CREATE TRIGGER trg_deals_apply_operator_markup
BEFORE INSERT OR UPDATE OF pricing_model, operator_base_price_cents, operator_site_url
ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.deals_apply_operator_markup();

COMMENT ON COLUMN public.deals.pricing_model IS
  'commission = creator/business commission split on price_cents. operator_markup = price_cents auto-derived as round(operator_base_price_cents * 1.11) for activity operators.';
COMMENT ON COLUMN public.deals.operator_site_host IS
  'Normalised host derived from operator_site_url; used to exclude the operator''s own site from third-party reseller price comparisons.';