-- Creator social enrichment (ScrapeCreators).
--
-- `creator_social_accounts` is the source of truth for imported public profile
-- data (one row per creator+platform). The heavy/raw data lives here; a few
-- display fields are ALSO denormalised onto creator_profiles so the existing
-- card/marketplace selects (CREATOR_PROFILE_COLUMNS) show them with no joins.
--
-- Writes only ever come from trusted server code (the enrichment route + cron,
-- via the service-role admin client), so there are no client write policies.
-- Reads are owner-only — cards read the denormalised creator_profiles columns,
-- not this table, and raw_api_response is never exposed publicly.

create table if not exists public.creator_social_accounts (
  id                uuid primary key default gen_random_uuid(),
  creator_id        uuid not null references public.users (id) on delete cascade,
  platform          text not null check (platform in ('instagram', 'tiktok')),
  handle            text not null,
  profile_url       text,
  display_name      text,
  bio               text,
  avatar_url        text,
  follower_count    integer check (follower_count  >= 0),
  following_count   integer check (following_count >= 0),
  post_count        integer check (post_count      >= 0),
  average_likes     numeric(14, 2) check (average_likes >= 0),
  average_views     numeric(14, 2) check (average_views >= 0),
  engagement_rate   numeric(6, 3)  check (engagement_rate >= 0),  -- percentage, e.g. 3.421
  last_synced_at    timestamptz not null default now(),
  raw_api_response  jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- One row per creator per platform → upserts, never duplicates.
  unique (creator_id, platform)
);

create index if not exists creator_social_accounts_creator_idx
  on public.creator_social_accounts (creator_id);

alter table public.creator_social_accounts enable row level security;

-- Owner-only read. All writes are server-side (service role bypasses RLS), so
-- no insert/update policies are granted to end users.
create policy creator_social_accounts_select_own
  on public.creator_social_accounts
  for select
  using (auth.uid() = creator_id);

-- Denormalised display fields for the marketplace cards (kept in sync by the
-- enrichment code). Follower counts + followers_synced_at already exist (0007).
alter table public.creator_profiles
  add column if not exists instagram_avatar text,
  add column if not exists tiktok_avatar    text,
  add column if not exists engagement_rate  numeric(6, 3) check (engagement_rate >= 0);
