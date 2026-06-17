-- Follower counts on a creator profile.
-- Entered manually for now; a future social-sync job can overwrite these and
-- stamp followers_synced_at. See lib/social/sync.ts for the integration seam.

alter table public.creator_profiles
  add column instagram_followers integer check (instagram_followers >= 0),
  add column tiktok_followers    integer check (tiktok_followers >= 0),
  add column followers_synced_at timestamptz;
