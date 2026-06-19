-- Booking briefs: the detailed campaign brief a brand fills in after booking,
-- plus any reference assets they upload. One brief per booking (1:1).

-- ---------------------------------------------------------------------------
-- The brief itself — all fields optional so a brand can fill it in over time.
-- ---------------------------------------------------------------------------
create table public.booking_briefs (
  booking_id        uuid primary key references public.bookings (id) on delete cascade,

  -- Campaign details
  campaign_name     text,
  objective         text,
  target_audience   text,

  -- Content
  platform          text,
  deliverables      text,
  creative_brief    text,
  talking_points    text,
  cta               text,

  -- Requirements
  must_include      text,
  avoid             text,
  deadline          date,

  -- Commercial
  payment           text,
  usage_rights      text,

  -- Product logistics: either the brand ships it, or the creator orders it.
  product_mode      text not null default 'none'
                      check (product_mode in ('none', 'ship', 'order')),
  shipping_tracking text,   -- when product_mode = 'ship'
  product_link      text,   -- when product_mode = 'order'
  discount_code     text,   -- when product_mode = 'order' (e.g. 100% off)

  updated_at        timestamptz not null default now()
);

alter table public.booking_briefs enable row level security;

-- Either party on the booking can read the brief.
create policy "briefs_select_party" on public.booking_briefs
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.brand_id = auth.uid() or b.creator_id = auth.uid())
    )
  );

-- Only the brand on the booking can create/update the brief.
create policy "briefs_insert_brand" on public.booking_briefs
  for insert with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.brand_id = auth.uid()
    )
  );

create policy "briefs_update_brand" on public.booking_briefs
  for update using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.brand_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Reference assets attached to a brief (images, decks, example clips, etc.).
-- ---------------------------------------------------------------------------
create table public.booking_assets (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings (id) on delete cascade,
  url          text not null,
  storage_path text,
  name         text,
  size         bigint,
  created_at   timestamptz not null default now()
);

create index booking_assets_booking_idx
  on public.booking_assets (booking_id, created_at);

alter table public.booking_assets enable row level security;

-- Either party can see the assets.
create policy "booking_assets_select_party" on public.booking_assets
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.brand_id = auth.uid() or b.creator_id = auth.uid())
    )
  );

-- Only the brand can attach or remove assets.
create policy "booking_assets_insert_brand" on public.booking_assets
  for insert with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.brand_id = auth.uid()
    )
  );

create policy "booking_assets_delete_brand" on public.booking_assets
  for delete using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.brand_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage bucket for brief assets. Public-read (served via public URL); writes
-- are scoped to the uploader's own folder. No select policy on purpose — a
-- public bucket serves files by URL without one, and adding a broad select
-- policy trips the "bucket allows listing" advisor (see migration 0014).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('briefs', 'briefs', true, 104857600)  -- 100MB
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

create policy "briefs_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'briefs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "briefs_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'briefs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "briefs_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'briefs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
