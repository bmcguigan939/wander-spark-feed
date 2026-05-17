
-- Ensure helper exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.payout_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  total_cents INTEGER NOT NULL DEFAULT 0,
  redemption_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid','void')),
  external_reference TEXT,
  notes TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  paid_at TIMESTAMPTZ,
  paid_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payout_runs_creator ON public.payout_runs(creator_id, period_start DESC);
CREATE INDEX idx_payout_runs_status ON public.payout_runs(status);

CREATE TABLE public.payout_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_run_id UUID NOT NULL REFERENCES public.payout_runs(id) ON DELETE CASCADE,
  redemption_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  commission_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (redemption_id)
);
CREATE INDEX idx_payout_line_items_run ON public.payout_line_items(payout_run_id);
CREATE INDEX idx_payout_line_items_creator ON public.payout_line_items(creator_id);

ALTER TABLE public.deal_redemptions
  ADD COLUMN payout_run_id UUID REFERENCES public.payout_runs(id) ON DELETE SET NULL;
CREATE INDEX idx_deal_redemptions_payout_run ON public.deal_redemptions(payout_run_id);

CREATE TABLE public.creator_payout_details (
  user_id UUID PRIMARY KEY,
  account_holder_name TEXT,
  bank_name TEXT,
  country TEXT,
  iban TEXT,
  sort_code TEXT,
  account_number TEXT,
  swift_bic TEXT,
  tax_id TEXT,
  payout_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_payout_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payout_runs creator read"
  ON public.payout_runs FOR SELECT
  USING (auth.uid() = creator_id);
CREATE POLICY "payout_runs admin all"
  ON public.payout_runs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "payout_line_items creator read"
  ON public.payout_line_items FOR SELECT
  USING (auth.uid() = creator_id);
CREATE POLICY "payout_line_items admin all"
  ON public.payout_line_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "creator_payout_details self read"
  ON public.creator_payout_details FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "creator_payout_details self insert"
  ON public.creator_payout_details FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "creator_payout_details self update"
  ON public.creator_payout_details FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "creator_payout_details admin read"
  ON public.creator_payout_details FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_payout_runs_updated_at
  BEFORE UPDATE ON public.payout_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_creator_payout_details_updated_at
  BEFORE UPDATE ON public.creator_payout_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.generate_draft_payout_runs(
  _period_start DATE DEFAULT NULL,
  _period_end DATE DEFAULT NULL,
  _min_payout_cents INTEGER DEFAULT 2000
)
RETURNS TABLE (run_id UUID, creator_id UUID, total_cents INTEGER, redemption_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start DATE;
  v_end DATE;
  r RECORD;
  v_run_id UUID;
BEGIN
  v_end := COALESCE(_period_end, (date_trunc('week', now())::date - 1));
  v_start := COALESCE(_period_start, v_end - INTERVAL '6 days');

  FOR r IN
    SELECT
      dr.creator_id AS cid,
      COALESCE(SUM(dr.commission_cents), 0)::int AS tcents,
      COUNT(*)::int AS rcount
    FROM public.deal_redemptions dr
    WHERE dr.status = 'confirmed'
      AND dr.creator_id IS NOT NULL
      AND dr.payout_run_id IS NULL
      AND dr.confirmed_at::date BETWEEN v_start AND v_end
      AND dr.commission_cents IS NOT NULL
    GROUP BY dr.creator_id
    HAVING COALESCE(SUM(dr.commission_cents), 0) >= _min_payout_cents
  LOOP
    INSERT INTO public.payout_runs (creator_id, period_start, period_end, total_cents, redemption_count, status)
    VALUES (r.cid, v_start, v_end, r.tcents, r.rcount, 'draft')
    RETURNING id INTO v_run_id;

    INSERT INTO public.payout_line_items (payout_run_id, redemption_id, creator_id, commission_cents, currency)
    SELECT v_run_id, dr.id, dr.creator_id, dr.commission_cents, dr.currency
    FROM public.deal_redemptions dr
    WHERE dr.status = 'confirmed'
      AND dr.creator_id = r.cid
      AND dr.payout_run_id IS NULL
      AND dr.confirmed_at::date BETWEEN v_start AND v_end
      AND dr.commission_cents IS NOT NULL;

    UPDATE public.deal_redemptions dr
    SET payout_run_id = v_run_id
    WHERE dr.id IN (
      SELECT pli.redemption_id FROM public.payout_line_items pli WHERE pli.payout_run_id = v_run_id
    );

    run_id := v_run_id;
    creator_id := r.cid;
    total_cents := r.tcents;
    redemption_count := r.rcount;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_draft_payout_runs(DATE, DATE, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_draft_payout_runs(DATE, DATE, INTEGER) TO authenticated, service_role;
