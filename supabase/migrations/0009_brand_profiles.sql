-- Brand profiles: lets a brand describe itself and signal it's looking for
-- creators, so creators can browse and reach out.

create table public.brand_profiles (
  user_id              uuid primary key references public.users (id) on delete cascade,
  company_name         text not null,
  about                text,
  budget_min           integer check (budget_min >= 0),
  budget_max           integer check (budget_max >= 0),
  looking_for_creators boolean not null default false,
  created_at           timestamptz not null default now()
);

alter table public.brand_profiles enable row level security;

-- Browsable when actively looking; a brand can always read its own row.
create policy "brand_profiles_select" on public.brand_profiles
  for select using (looking_for_creators = true or auth.uid() = user_id);

create policy "brand_profiles_insert_own" on public.brand_profiles
  for insert with check (auth.uid() = user_id);

create policy "brand_profiles_update_own" on public.brand_profiles
  for update using (auth.uid() = user_id);
