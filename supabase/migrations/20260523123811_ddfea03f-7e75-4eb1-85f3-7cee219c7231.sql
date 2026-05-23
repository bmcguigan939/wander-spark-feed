CREATE TABLE public.business_agreement_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  invite_id uuid REFERENCES public.business_invites(id) ON DELETE SET NULL,
  agreement_version text NOT NULL DEFAULT 'v1',
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text
);

CREATE INDEX idx_baa_user ON public.business_agreement_acceptances(user_id);
CREATE INDEX idx_baa_invite ON public.business_agreement_acceptances(invite_id);

ALTER TABLE public.business_agreement_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own acceptances"
ON public.business_agreement_acceptances
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "admin read all acceptances"
ON public.business_agreement_acceptances
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));