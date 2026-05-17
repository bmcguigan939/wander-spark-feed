-- B12: parity-exempt on deals (business-editable, mirrors affiliate_links toggle)
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS parity_exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parity_exempt_reason text;

-- B10: partner-specific URL template for return-attribution beacon
ALTER TABLE public.affiliate_partners
  ADD COLUMN IF NOT EXISTS partner_url_template text;

-- B9: tag seeded videos
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- NTH-3: FX rate cache
CREATE TABLE IF NOT EXISTS public.fx_rates (
  base text NOT NULL,
  quote text NOT NULL,
  rate numeric NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (base, quote)
);
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fx_rates public read" ON public.fx_rates FOR SELECT USING (true);

-- NTH-3: normalised competitor price on parity_checks
ALTER TABLE public.parity_checks
  ADD COLUMN IF NOT EXISTS normalised_competitor_price_cents integer,
  ADD COLUMN IF NOT EXISTS fx_rate_used numeric,
  ADD COLUMN IF NOT EXISTS fx_quote_currency text;

-- B9: demo source tag already exists on deals.source; nothing to add.
