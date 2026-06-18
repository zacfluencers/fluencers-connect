-- Brand favourites: a creator saves brands (that are looking for creators) to
-- come back to. Mirrors the creator-favourites table, in the other direction.

create table public.brand_favorites (
  user_id    uuid not null references public.users (id) on delete cascade,  -- the creator
  brand_id   uuid not null references public.users (id) on delete cascade,  -- the saved brand
  created_at timestamptz not null default now(),
  primary key (user_id, brand_id)
);

create index brand_favorites_user_idx on public.brand_favorites (user_id);

alter table public.brand_favorites enable row level security;

-- You only ever see and manage your own brand favourites.
create policy "brand_favorites_select_own" on public.brand_favorites
  for select using (auth.uid() = user_id);

create policy "brand_favorites_insert_own" on public.brand_favorites
  for insert with check (auth.uid() = user_id);

create policy "brand_favorites_delete_own" on public.brand_favorites
  for delete using (auth.uid() = user_id);

-- Always let a creator read a brand they've favourited (so the favourites list
-- still works if the brand later pauses "looking for creators").
create policy "brand_profiles_select_favorited" on public.brand_profiles
  for select using (
    exists (
      select 1 from public.brand_favorites f
      where f.brand_id = brand_profiles.user_id and f.user_id = auth.uid()
    )
  );
