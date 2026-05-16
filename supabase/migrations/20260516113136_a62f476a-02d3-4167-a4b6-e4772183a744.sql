-- Tracking links table
CREATE TABLE public.deal_redirects (
  code text PRIMARY KEY,
  deal_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX deal_redirects_deal_creator_unique ON public.deal_redirects (deal_id, creator_id);
CREATE INDEX deal_redirects_creator_idx ON public.deal_redirects (creator_id);

ALTER TABLE public.deal_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read redirects"
  ON public.deal_redirects FOR SELECT
  USING (true);

CREATE POLICY "service role manages redirects"
  ON public.deal_redirects FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Attribute clicks to creators when they came via a redirect
ALTER TABLE public.deal_clicks ADD COLUMN creator_id uuid;
CREATE INDEX deal_clicks_creator_idx ON public.deal_clicks (creator_id);

-- Trigger: on approve, ensure a redirect row exists
CREATE OR REPLACE FUNCTION public.sync_deal_redirect()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.approved_code IS NOT NULL AND length(trim(NEW.approved_code)) > 0 THEN
    INSERT INTO public.deal_redirects (code, deal_id, creator_id)
    VALUES (upper(trim(NEW.approved_code)), NEW.deal_id, NEW.creator_id)
    ON CONFLICT (code) DO UPDATE
      SET deal_id = EXCLUDED.deal_id, creator_id = EXCLUDED.creator_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER deal_applications_sync_redirect
AFTER INSERT OR UPDATE OF status, approved_code ON public.deal_applications
FOR EACH ROW EXECUTE FUNCTION public.sync_deal_redirect();