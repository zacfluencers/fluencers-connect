-- Influencer Connect — core schema
-- Two-sided marketplace: brands book creators via request-based flow with escrow.
-- This migration covers identity + creator profiles + bookings only.
-- (No payments/escrow ledger, messaging, or subscriptions yet — added in later migrations.)

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- A user is either a brand (books creators) or a creator (gets booked).
create type public.user_role as enum ('brand', 'creator');

-- Booking lifecycle. Funds sit in escrow from "accepted" until "completed"
-- (released) or "refunded" (returned to brand).
create type public.booking_status as enum (
  'requested',    -- brand sent a request, creator hasn't responded
  'accepted',     -- creator accepted; escrow funded
  'in_progress',  -- creator is producing the content
  'in_review',    -- content delivered, brand reviewing (revisions happen here)
  'completed',    -- brand approved; escrow released to creator
  'refunded'      -- not as agreed; escrow returned to brand
);

-- ---------------------------------------------------------------------------
-- users
-- One row per account, keyed to Supabase Auth (auth.users).
-- ---------------------------------------------------------------------------

create table public.users (
  id    uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role  public.user_role not null
);

-- ---------------------------------------------------------------------------
-- creator_profiles
-- Extra data only creators have. One profile per creator (1:1 with users).
-- ---------------------------------------------------------------------------

create table public.creator_profiles (
  user_id       uuid primary key references public.users (id) on delete cascade,
  name          text not null,
  bio           text,
  niche         text,
  instagram     text,
  tiktok        text,
  availability  boolean not null default true,
  price         numeric(10, 2) not null check (price >= 0),  -- fixed price per job, in GBP
  profile_image text
);

-- ---------------------------------------------------------------------------
-- bookings
-- A brand's request to book a creator. Price is snapshotted at request time
-- so later profile price changes don't alter an existing booking.
-- ---------------------------------------------------------------------------

create table public.bookings (
  id             uuid primary key default gen_random_uuid(),
  brand_id       uuid not null references public.users (id) on delete restrict,
  creator_id     uuid not null references public.users (id) on delete restrict,
  status         public.booking_status not null default 'requested',
  price          numeric(10, 2) not null check (price >= 0),
  revision_count integer not null default 0 check (revision_count between 0 and 3),  -- max 3 revisions
  created_at     timestamptz not null default now(),

  constraint bookings_brand_is_not_creator check (brand_id <> creator_id)
);

-- Indexes for the common lookups: a brand's bookings, a creator's bookings.
create index bookings_brand_id_idx   on public.bookings (brand_id);
create index bookings_creator_id_idx on public.bookings (creator_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Enabled on every table; policies are intentionally minimal here and will be
-- expanded alongside the auth/UI work.
-- ---------------------------------------------------------------------------

alter table public.users            enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.bookings         enable row level security;

-- Users can read and update their own account row.
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- Creator profiles are publicly readable (brands browse the marketplace).
create policy "creator_profiles_select_all" on public.creator_profiles
  for select using (true);

-- A creator manages only their own profile.
create policy "creator_profiles_insert_own" on public.creator_profiles
  for insert with check (auth.uid() = user_id);

create policy "creator_profiles_update_own" on public.creator_profiles
  for update using (auth.uid() = user_id);

-- Bookings are visible only to the two parties involved.
create policy "bookings_select_party" on public.bookings
  for select using (auth.uid() = brand_id or auth.uid() = creator_id);

-- A brand creates bookings as themselves.
create policy "bookings_insert_brand" on public.bookings
  for insert with check (auth.uid() = brand_id);

-- Either party can update the booking they're part of (status transitions,
-- revision count). Transition rules will be enforced in the app/edge layer.
create policy "bookings_update_party" on public.bookings
  for update using (auth.uid() = brand_id or auth.uid() = creator_id);
