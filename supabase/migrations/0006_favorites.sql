-- Favourites: a user saves creators to come back to. One row per (user, creator).

create table public.favorites (
  user_id    uuid not null references public.users (id) on delete cascade,
  creator_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, creator_id)
);

create index favorites_user_id_idx on public.favorites (user_id);

alter table public.favorites enable row level security;

-- You only ever see and manage your own favourites.
create policy "favorites_select_own" on public.favorites
  for select using (auth.uid() = user_id);

create policy "favorites_insert_own" on public.favorites
  for insert with check (auth.uid() = user_id);

create policy "favorites_delete_own" on public.favorites
  for delete using (auth.uid() = user_id);
