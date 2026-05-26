
-- Drop legacy operator-markup triggers + functions that depend on the columns.
DROP TRIGGER IF EXISTS deals_validate_operator_markup_trg ON public.deals;
DROP TRIGGER IF EXISTS deals_validate_operator_markup ON public.deals;
DROP TRIGGER IF EXISTS trg_deals_apply_operator_markup ON public.deals;
DROP FUNCTION IF EXISTS public.deals_validate_operator_markup() CASCADE;
DROP FUNCTION IF EXISTS public.deals_apply_operator_markup() CASCADE;

-- All shops are Travidz-hosted now.
UPDATE public.deals SET bookable = true WHERE bookable = false;
ALTER TABLE public.deals ALTER COLUMN url DROP NOT NULL;
ALTER TABLE public.deals ALTER COLUMN bookable SET DEFAULT true;

-- Drop operator-markup columns from deals (CASCADE removes any remaining dependents).
ALTER TABLE public.deals
  DROP COLUMN IF EXISTS pricing_model CASCADE,
  DROP COLUMN IF EXISTS operator_base_price_cents CASCADE,
  DROP COLUMN IF EXISTS operator_site_url CASCADE,
  DROP COLUMN IF EXISTS operator_site_host CASCADE;

-- Drop the operator-website columns on profiles.
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS operator_site_url CASCADE,
  DROP COLUMN IF EXISTS operator_site_host CASCADE;

-- Drop the now-unused enum.
DROP TYPE IF EXISTS public.deal_pricing_model;
