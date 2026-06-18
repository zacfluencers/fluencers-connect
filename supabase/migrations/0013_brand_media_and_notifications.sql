-- Brand media + links, larger uploads, and a notifications system.

-- ---------------------------------------------------------------------------
-- Brand profiles gain a logo + website/socials so creators can check them out.
-- ---------------------------------------------------------------------------
alter table public.brand_profiles
  add column logo_url  text,
  add column website   text,
  add column instagram text,
  add column tiktok    text;

-- ---------------------------------------------------------------------------
-- Storage: allow larger portfolio videos (150MB) and add an avatars bucket
-- for brand logos (and profile images).
-- ---------------------------------------------------------------------------
update storage.buckets set file_size_limit = 157286400 where id = 'portfolio';

insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 10485760)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Notifications: one row per alert delivered to a recipient.
-- ---------------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,  -- recipient
  type       text not null,   -- 'message' | 'booking_request' | 'booking_update' ...
  title      text not null,
  body       text,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx
  on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;

-- Recipients read / manage their own notifications.
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);

create policy "notifications_delete_own" on public.notifications
  for delete using (auth.uid() = user_id);

-- A user can create a notification only for someone they share a booking or
-- conversation with (so booking actions and messages can alert the other party).
create policy "notifications_insert_related" on public.notifications
  for insert with check (
    auth.uid() <> user_id
    and (
      exists (
        select 1 from public.bookings b
        where (b.brand_id = auth.uid() and b.creator_id = user_id)
           or (b.creator_id = auth.uid() and b.brand_id = user_id)
      )
      or exists (
        select 1 from public.conversations c
        where (c.brand_id = auth.uid() and c.creator_id = user_id)
           or (c.creator_id = auth.uid() and c.brand_id = user_id)
      )
    )
  );
