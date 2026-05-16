ALTER TABLE public.deals
  ADD CONSTRAINT deals_business_id_fkey
  FOREIGN KEY (business_id) REFERENCES public.profiles(id) ON DELETE CASCADE;