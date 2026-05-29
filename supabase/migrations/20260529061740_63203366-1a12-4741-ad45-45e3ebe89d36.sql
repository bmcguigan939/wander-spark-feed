ALTER TABLE public.deals DROP CONSTRAINT deals_status_check;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_status_check
  CHECK (status = ANY (ARRAY['draft'::text,'pending_review'::text,'approved'::text,'rejected'::text,'expired'::text]));