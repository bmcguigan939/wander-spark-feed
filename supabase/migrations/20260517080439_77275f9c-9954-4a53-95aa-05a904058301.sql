
-- Enum for redemption status
DO $$ BEGIN
  CREATE TYPE public.deal_redemption_status AS ENUM ('pending', 'confirmed', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE public.deal_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  code text NOT NULL,
  order_value_cents integer,
  currency text NOT NULL DEFAULT 'GBP',
  commission_rate numeric,
  commission_cents integer,
  status public.deal_redemption_status NOT NULL DEFAULT 'pending',
  confirmed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_redemptions_deal ON public.deal_redemptions(deal_id, created_at DESC);
CREATE INDEX idx_deal_redemptions_creator ON public.deal_redemptions(creator_id, created_at DESC);
CREATE INDEX idx_deal_redemptions_user ON public.deal_redemptions(user_id, created_at DESC);
CREATE INDEX idx_deal_redemptions_status ON public.deal_redemptions(status);
-- Idempotency: same user can't double-claim same code within short window (enforced in app)

ALTER TABLE public.deal_redemptions ENABLE ROW LEVEL SECURITY;

-- Traveller reads own
CREATE POLICY "redemptions traveller read"
  ON public.deal_redemptions FOR SELECT
  USING (auth.uid() = user_id);

-- Creator reads own
CREATE POLICY "redemptions creator read"
  ON public.deal_redemptions FOR SELECT
  USING (auth.uid() = creator_id);

-- Business reads own deals' redemptions
CREATE POLICY "redemptions business read"
  ON public.deal_redemptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_redemptions.deal_id AND d.business_id = auth.uid()
  ));

-- Business updates own deals' redemptions
CREATE POLICY "redemptions business update"
  ON public.deal_redemptions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_redemptions.deal_id AND d.business_id = auth.uid()
  ));

-- Admin all
CREATE POLICY "redemptions admin all"
  ON public.deal_redemptions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Traveller can self-insert a pending redemption
CREATE POLICY "redemptions traveller insert"
  ON public.deal_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- updated_at trigger
CREATE TRIGGER trg_deal_redemptions_touch
  BEFORE UPDATE ON public.deal_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Commission computation trigger
CREATE OR REPLACE FUNCTION public.compute_redemption_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
    NEW.confirmed_at := COALESCE(NEW.confirmed_at, now());
    IF NEW.order_value_cents IS NOT NULL AND NEW.commission_rate IS NOT NULL THEN
      NEW.commission_cents := round(NEW.order_value_cents * NEW.commission_rate / 100.0)::int;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_deal_redemptions_commission
  BEFORE UPDATE ON public.deal_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.compute_redemption_commission();
