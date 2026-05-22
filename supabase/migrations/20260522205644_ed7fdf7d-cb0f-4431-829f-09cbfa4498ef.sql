-- 1) Profiles: column-level revokes so SELECT policy still works for safe columns
REVOKE SELECT (
  stripe_connect_account_id,
  stripe_connect_status,
  payout_method,
  payout_bank_details_encrypted,
  address,
  lat,
  lng,
  rolling_12mo_gbv_cents,
  rolling_12mo_gbv_refreshed_at,
  verified_by,
  verification_notes,
  creator_agreement_accepted_at,
  business_agreement_accepted_at
) ON public.profiles FROM anon, authenticated;

-- 2) Avatars storage: allow users to delete files in their own folder
DROP POLICY IF EXISTS "avatars user delete" ON storage.objects;
CREATE POLICY "avatars user delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 3) client_error_logs: allow signed-in users to insert only their own errors
DROP POLICY IF EXISTS "Users can insert own client errors" ON public.client_error_logs;
CREATE POLICY "Users can insert own client errors"
ON public.client_error_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());