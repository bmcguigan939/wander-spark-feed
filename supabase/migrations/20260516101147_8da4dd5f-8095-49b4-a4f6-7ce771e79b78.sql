create policy "users can self-assign creator role"
  on public.user_roles for insert to authenticated
  with check (auth.uid() = user_id and role = 'creator');