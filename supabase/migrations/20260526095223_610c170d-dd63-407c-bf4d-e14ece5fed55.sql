ALTER TABLE public.deal_rooms
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS min_group_size  integer,
  ADD COLUMN IF NOT EXISTS max_group_size  integer,
  ADD COLUMN IF NOT EXISTS includes        text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS excludes        text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meeting_point   text;