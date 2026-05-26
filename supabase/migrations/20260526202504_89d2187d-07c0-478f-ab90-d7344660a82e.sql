
-- 1. Profile block fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_by uuid,
  ADD COLUMN IF NOT EXISTS block_reason text,
  ADD COLUMN IF NOT EXISTS pending_admin_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_reason text,
  ADD COLUMN IF NOT EXISTS review_match_details jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON public.profiles(is_blocked) WHERE is_blocked = true;
CREATE INDEX IF NOT EXISTS idx_profiles_pending_review ON public.profiles(pending_admin_review) WHERE pending_admin_review = true;

-- 2. Blocked identity fingerprints
CREATE TABLE IF NOT EXISTS public.blocked_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('email','phone','bank','stripe_account','ip','device','business_name','website')),
  value_hash text NOT NULL,
  original_user_id uuid,
  reason text,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  blocked_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_blocked_identity ON public.blocked_identities(kind, value_hash);
CREATE INDEX IF NOT EXISTS idx_blocked_identities_user ON public.blocked_identities(original_user_id);

GRANT ALL ON public.blocked_identities TO service_role;
ALTER TABLE public.blocked_identities ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated access; admin code uses service role via supabaseAdmin.

-- 3. User signals (IP / device history)
CREATE TABLE IF NOT EXISTS public.user_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('ip','device','signup_ip')),
  value_hash text NOT NULL,
  raw_value text,
  seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_signals_user ON public.user_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_signals_hash ON public.user_signals(kind, value_hash);

GRANT ALL ON public.user_signals TO service_role;
ALTER TABLE public.user_signals ENABLE ROW LEVEL SECURITY;
-- service role only
