
-- Verification + agreement timestamps on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS creator_agreement_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS business_agreement_accepted_at timestamptz;

-- Tighten profiles update policy so verification fields are admin-only,
-- but users can still update their own bio/avatar/agreement timestamps.
DROP POLICY IF EXISTS "profiles self update" ON public.profiles;
CREATE POLICY "profiles self update"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND is_verified = (SELECT p.is_verified FROM public.profiles p WHERE p.id = profiles.id)
  AND COALESCE(verified_at,'epoch') = COALESCE((SELECT p.verified_at FROM public.profiles p WHERE p.id = profiles.id),'epoch')
  AND COALESCE(verified_by,'00000000-0000-0000-0000-000000000000'::uuid)
      = COALESCE((SELECT p.verified_by FROM public.profiles p WHERE p.id = profiles.id),'00000000-0000-0000-0000-000000000000'::uuid)
);

CREATE POLICY "profiles admin update"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Rate limit ledger
CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action      text NOT NULL,
  actor_key   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limit_hits_lookup_idx
  ON public.rate_limit_hits (action, actor_key, created_at DESC);

ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
-- No client policies: only the service role / SECURITY DEFINER fns may touch it.

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _action text,
  _actor_key text,
  _max_per_window integer,
  _window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.rate_limit_hits
  WHERE action = _action
    AND actor_key = _actor_key
    AND created_at > now() - make_interval(secs => _window_seconds);

  IF v_count >= _max_per_window THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limit_hits (action, actor_key) VALUES (_action, _actor_key);

  -- Opportunistic GC: drop rows older than 1 day for this action/key
  DELETE FROM public.rate_limit_hits
   WHERE action = _action AND actor_key = _actor_key
     AND created_at < now() - interval '1 day';

  RETURN true;
END;
$$;

-- Allow the auth role to call it (server fns run authenticated; admin client runs as service)
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text,text,integer,integer) TO authenticated, service_role;
