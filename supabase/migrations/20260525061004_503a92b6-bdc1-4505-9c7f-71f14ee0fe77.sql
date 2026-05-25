
-- 1. Function search_path hardening
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.videos_update_search_tsv() SET search_path = public, pg_temp;

-- 2. Explicit deny-all on RLS-enabled tables with no policies (server-only via supabaseAdmin)
CREATE POLICY "deny all client access" ON public.rate_limit_hits
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "deny all client access" ON public.video_views
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- 3. Tighten overly permissive INSERT policies on click-tracking tables
DROP POLICY IF EXISTS "Anyone can log a click" ON public.business_clicks;
CREATE POLICY "Anyone can log a click" ON public.business_clicks
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "partner_clicks anon insert" ON public.partner_clicks;
CREATE POLICY "partner_clicks anon insert" ON public.partner_clicks
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND char_length(partner) <= 64
    AND char_length(destination_url) <= 2048
    AND char_length(click_ref) <= 128
  );
