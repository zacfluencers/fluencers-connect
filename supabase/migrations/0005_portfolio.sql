-- Portfolio: real uploaded images for a creator, stored in Supabase Storage.

-- A public bucket for portfolio images. Files live under "{user_id}/..." so each
-- creator can only write to their own folder (enforced by the policies below).
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

-- Anyone can view portfolio images (the marketplace is public).
create policy "portfolio_public_read" on storage.objects
  for select using (bucket_id = 'portfolio');

-- A creator can only add/replace/remove files inside their own folder.
create policy "portfolio_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "portfolio_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "portfolio_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- One row per portfolio image.
create table public.portfolio_items (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references public.users (id) on delete cascade,
  image_url    text not null,       -- public URL for display
  storage_path text,                -- path in the bucket, so we can delete the file
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index portfolio_items_creator_id_idx on public.portfolio_items (creator_id);

alter table public.portfolio_items enable row level security;

-- Public can view; creators manage only their own items.
create policy "portfolio_items_select_all" on public.portfolio_items
  for select using (true);

create policy "portfolio_items_insert_own" on public.portfolio_items
  for insert with check (auth.uid() = creator_id);

create policy "portfolio_items_update_own" on public.portfolio_items
  for update using (auth.uid() = creator_id);

create policy "portfolio_items_delete_own" on public.portfolio_items
  for delete using (auth.uid() = creator_id);
