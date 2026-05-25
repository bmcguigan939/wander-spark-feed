-- Strip PII columns from authenticated SELECT grants.
-- Server functions use supabaseAdmin (service role) and remain unaffected.
REVOKE SELECT (customer_name, customer_email, notes) ON public.bookings FROM authenticated;
REVOKE SELECT (contact_phone) ON public.business_invites FROM authenticated;
REVOKE SELECT (ip, user_agent) ON public.business_agreement_acceptances FROM authenticated;