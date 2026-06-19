-- Deliverables: the actual content files a creator uploads to a booking for
-- the brand to review and download. Mirrors booking_assets, but creator-owned.

create table public.booking_deliverables (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings (id) on delete cascade,
  url          text not null,
  storage_path text,
  name         text,
  size         bigint,
  created_at   timestamptz not null default now()
);

create index booking_deliverables_booking_idx
  on public.booking_deliverables (booking_id, created_at);

alter table public.booking_deliverables enable row level security;

-- Either party on the booking can see the delivered files.
create policy "deliverables_select_party" on public.booking_deliverables
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.brand_id = auth.uid() or b.creator_id = auth.uid())
    )
  );

-- Only the creator on the booking can add or remove deliverables.
create policy "deliverables_insert_creator" on public.booking_deliverables
  for insert with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.creator_id = auth.uid()
    )
  );

create policy "deliverables_delete_creator" on public.booking_deliverables
  for delete using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.creator_id = auth.uid()
    )
  );

-- Storage bucket for delivered files (videos/images). Public-read via URL;
-- writes scoped to the uploader's own folder. No select policy (see 0014/0017).
insert into storage.buckets (id, name, public, file_size_limit)
values ('deliverables', 'deliverables', true, 157286400)  -- 150MB
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

create policy "deliverables_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'deliverables'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "deliverables_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'deliverables'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "deliverables_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'deliverables'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
