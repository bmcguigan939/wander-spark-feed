
CREATE TABLE IF NOT EXISTS public.client_error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  route TEXT,
  message TEXT NOT NULL,
  stack TEXT,
  source TEXT,
  user_agent TEXT,
  severity TEXT NOT NULL DEFAULT 'error',
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_error_logs_created_at
  ON public.client_error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_error_logs_user_id
  ON public.client_error_logs (user_id);

ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all client errors"
  ON public.client_error_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete client errors"
  ON public.client_error_logs
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
