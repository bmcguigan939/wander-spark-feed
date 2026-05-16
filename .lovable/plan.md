## K. Admin dashboard (§18)

Adds an admin-only `/admin` route to moderate the platform. Builds on the existing `admin` role in `app_role` (already used by `has_role` and one RLS policy on `user_roles`). No new secrets.

### 1. Database migration

Add moderation columns + the missing admin RLS policies that let admins act across tables.

```sql
-- Moderation flags on videos
alter table public.videos
  add column if not exists is_hidden boolean not null default false,
  add column if not exists is_featured boolean not null default false,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid;

-- Hide videos from public when is_hidden = true (creator can still see own)
drop policy if exists "videos public read ready" on public.videos;
create policy "videos public read ready"
  on public.videos for select
  using (
    (status = 'ready' and is_hidden = false)
    or creator_id = auth.uid()
    or has_role(auth.uid(), 'admin')
  );

-- Admins can update/delete any video, deal, application
create policy "admins update any video" on public.videos
  for update using (has_role(auth.uid(), 'admin'));
create policy "admins delete any video" on public.videos
  for delete using (has_role(auth.uid(), 'admin'));

create policy "admins read all deals" on public.deals
  for select using (has_role(auth.uid(), 'admin'));
create policy "admins update any deal" on public.deals
  for update using (has_role(auth.uid(), 'admin'));
create policy "admins delete any deal" on public.deals
  for delete using (has_role(auth.uid(), 'admin'));

create policy "admins read all applications" on public.deal_applications
  for select using (has_role(auth.uid(), 'admin'));

-- Admin role management
create policy "admins insert roles" on public.user_roles
  for insert with check (has_role(auth.uid(), 'admin'));
create policy "admins delete roles" on public.user_roles
  for delete using (has_role(auth.uid(), 'admin'));

-- Audit log
create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  action text not null,            -- 'hide_video','feature_video','delete_deal','grant_role','revoke_role',...
  target_type text not null,       -- 'video' | 'deal' | 'user'
  target_id uuid not null,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.admin_actions enable row level security;
create policy "admins read actions" on public.admin_actions
  for select using (has_role(auth.uid(), 'admin'));
-- inserts only via service role (server functions)
```

### 2. Server functions — `src/lib/admin.functions.ts`

All `.middleware([requireSupabaseAuth])` + a small `assertAdmin(supabase, userId)` helper that throws if not admin. All writes log to `admin_actions` via `supabaseAdmin`.

- `getAdminStats()` → counts: users, creators, businesses, videos (ready/pending/hidden), deals (active), applications (pending).
- `listAdminVideos({ filter: 'all'|'pending'|'hidden'|'featured', q?, cursor? })` → 30 rows w/ creator profile.
- `listAdminDeals({ filter: 'all'|'active'|'inactive', q? })` → 30 rows w/ business profile.
- `listAdminUsers({ q?, role? })` → profiles + roles[].
- `setVideoModeration({ videoId, hidden?, featured? })` → updates videos, audit log.
- `deleteVideo({ videoId })` → admin delete + audit.
- `setDealActive({ dealId, active })` + `deleteDeal({ dealId })`.
- `grantRole({ userId, role })` / `revokeRole({ userId, role })` — guards: cannot revoke own admin, cannot leave system with zero admins.

### 3. Routes

```text
src/routes/admin.tsx                     # layout: guard + tab strip + <Outlet/>
src/routes/admin.index.tsx               # stats overview
src/routes/admin.videos.tsx              # moderation queue
src/routes/admin.deals.tsx               # deal moderation
src/routes/admin.users.tsx               # users + role management
```

Layout (`admin.tsx`): reads `useAuth()`, checks `isAdmin` (new flag on the auth hook — see step 4). Non-admins → redirect `/`. Renders top tab bar (Overview / Videos / Deals / Users) and `<Outlet />` inside `MobileShell`.

Each list page:
- Filter pills + search input.
- Card rows w/ inline action buttons (Hide/Unhide, Feature/Unfeature, Delete confirm) using `useMutation` + `queryClient.invalidateQueries`.
- For users: chips for current roles, add/remove role buttons (creator / business / admin).

### 4. Auth hook tweak — `src/lib/auth.ts`

Add `isAdmin` alongside existing `isBusiness`. Single extra `.has_role(uid,'admin')` check (or reuse the existing user_roles fetch).

### 5. Navigation surfacing

- `/profile`: if `isAdmin`, show an "Admin" link to `/admin` (avoid touching the 6-slot bottom nav).
- Optional: tiny shield icon next to admin badges in their profile header.

### 6. Bootstrap an admin

`user_roles` does not let normal users self-assign admin (RLS only allows creator self-assign). Plan ships a one-off SQL helper in the migration the user can run from the SQL editor:

```sql
-- Grant admin to a user by email (run manually once)
-- insert into public.user_roles (user_id, role)
-- select id, 'admin' from auth.users where email = 'you@example.com';
```

Leave this commented in the migration so it's documented but doesn't run by accident. The user runs it from the Cloud SQL editor with their own email.

### 7. Test checklist

- Non-admin hits `/admin` → bounced to `/`.
- Admin sees Overview with non-zero counts.
- Hide a video → public feed no longer shows it; creator still sees in profile.
- Feature a video → appears with a featured chip (UI hook only in admin list for v1).
- Toggle deal active → `/deals/:id` reflects new state.
- Grant `business` role to a user → that user can access `/business`.
- Cannot revoke your own admin role.
- All actions create rows in `admin_actions`.

### Out of scope (follow-ups)

- Featured carousel on the feed (separate UI work).
- Bulk actions / CSV export.
- Comment moderation (no public report system yet).
- Email notification to affected creators when content is hidden.

---

Reply **approve** to proceed.
