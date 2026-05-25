-- Drop the over-broad creator SELECT policy.
-- Creator-facing earnings/attribution data is served by server functions
-- using the service role with explicit safe-column projections.
DROP POLICY IF EXISTS "bookings creator read" ON public.bookings;