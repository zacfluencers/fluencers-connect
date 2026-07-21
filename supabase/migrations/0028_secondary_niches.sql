-- Secondary niches for creators.
--
-- Most creators don't fit one box: a fitness creator is usually also health,
-- often food. Forcing a single choice meant they were invisible to a brand
-- filtering for their second-best category, which is the main thing brands
-- actually do on the marketplace.
--
-- The primary niche keeps its existing meaning and stays the one shown on
-- cards. Secondary niches are for MATCHING, not display - a creator surfaces
-- in those searches without their card turning into a wall of tags.
--
-- Table-level grants already exist on this table (unlike public.users, which
-- is column-locked), so the new column inherits them and needs no GRANT.

alter table public.creator_profiles
  add column if not exists secondary_niches text[] not null default '{}';

-- Filtering uses the array-overlap operator (&&), which needs GIN to avoid a
-- sequential scan once the directory grows.
create index if not exists creator_profiles_secondary_niches_idx
  on public.creator_profiles using gin (secondary_niches);

comment on column public.creator_profiles.secondary_niches is
  'Additional niches this creator matches in marketplace search. Not shown individually on cards - summarised as "+N more". Excludes the primary niche.';
