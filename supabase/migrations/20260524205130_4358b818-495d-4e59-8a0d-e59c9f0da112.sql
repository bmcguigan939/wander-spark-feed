DROP POLICY IF EXISTS "Active signings are viewable by everyone" ON public.creator_business_signings;

CREATE POLICY "Participants can view their signings"
  ON public.creator_business_signings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = business_id);

CREATE POLICY "Admins can view all signings"
  ON public.creator_business_signings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));