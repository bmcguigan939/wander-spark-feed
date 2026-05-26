
-- Allow deal-level price-match codes (not tied to a legacy affiliate link).
ALTER TABLE public.price_match_codes
  ALTER COLUMN link_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_price_match_deal_time
  ON public.price_match_codes (deal_id, issued_at DESC)
  WHERE deal_id IS NOT NULL;

-- Public read for issued codes attached to a deal so the deal page can show
-- the active match code without auth.
CREATE POLICY "price_match_codes public read deal"
  ON public.price_match_codes
  FOR SELECT
  USING (
    deal_id IS NOT NULL
    AND status = 'issued'
    AND expires_at > now()
  );
