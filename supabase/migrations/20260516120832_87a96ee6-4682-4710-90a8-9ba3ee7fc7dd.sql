create table public.destination_summaries (
  id uuid primary key default gen_random_uuid(),
  country text not null,
  city text not null,
  summary text not null,
  highlights jsonb not null default '[]'::jsonb,
  best_time text,
  generated_at timestamptz not null default now(),
  unique (country, city)
);
create index idx_destination_summaries_country_city on public.destination_summaries (lower(country), lower(city));
alter table public.destination_summaries enable row level security;
create policy "destination_summaries public read"
  on public.destination_summaries for select using (true);