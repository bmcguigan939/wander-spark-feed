-- Moderation flags
alter table public.videos
  add column if not exists is_hidden boolean not null default false,
  add column if not exists is_featured boolean not null default false,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid;

-- Public-read policy now hides moderated videos
drop policy if exists "videos public read ready" on public.videos;
create policy "videos public read ready"
  on public.videos for select
  using (
    (status = 'ready' and is_hidden = false)
    or creator_id = auth.uid()
    or public.has_role(auth.uid(), 'admin')
  );

-- Admin escalation on videos
create policy "admins update any video" on public.videos
  for update using (public.has_role(auth.uid(), 'admin'));
create policy "admins delete any video" on public.videos
  for delete using (public.has_role(auth.uid(), 'admin'));

-- Admin escalation on deals
create policy "admins read all deals" on public.deals
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "admins update any deal" on public.deals
  for update using (public.has_role(auth.uid(), 'admin'));
create policy "admins delete any deal" on public.deals
  for delete using (public.has_role(auth.uid(), 'admin'));

-- Admin reads applications
create policy "admins read all applications" on public.deal_applications
  for select using (public.has_role(auth.uid(), 'admin'));

-- Admin manages roles
create policy "admins insert roles" on public.user_roles
  for insert with check (public.has_role(auth.uid(), 'admin'));
create policy "admins delete roles" on public.user_roles
  for delete using (public.has_role(auth.uid(), 'admin'));

-- Audit log
create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_admin_actions_created_at on public.admin_actions (created_at desc);
alter table public.admin_actions enable row level security;
create policy "admins read actions" on public.admin_actions
  for select using (public.has_role(auth.uid(), 'admin'));

-- One-off helper (commented out — run manually with your email):
-- insert into public.user_roles (user_id, role)
-- select id, 'admin' from auth.users where email = 'you@example.com'
-- on conflict do nothing;