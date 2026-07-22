-- Two more bookable services: Meta whitelisting and a profile post.
--
-- These are different products from the existing three. UGC, Event Day and
-- B-Roll all sell the creator's TIME and hand the footage over. These two sell
-- their AUDIENCE and their AD ACCOUNT:
--   * META Whitelist - the brand may run ads from the creator's handle for
--     three months, which is a licence with an expiry rather than a delivery.
--   * Influencer Post - the creator publishes to their own profile, so the
--     brand is buying reach with that creator's followers.
--
-- The second half of this migration is the part that would otherwise bite:
-- bookings.service_type carries a CHECK constraint listing the valid services.
-- Adding rate columns alone would let a creator advertise a price that no
-- brand could ever book - the insert would be refused by the database at the
-- moment of payment, which is the worst possible place to discover it.

alter table public.creator_profiles
  add column if not exists whitelist_rate numeric(10, 2),
  add column if not exists post_rate numeric(10, 2);

comment on column public.creator_profiles.whitelist_rate is
  'Meta whitelisting: brand may run ads from the creator''s handle for 3 months.';
comment on column public.creator_profiles.post_rate is
  'Influencer post: creator publishes to their own profile.';

alter table public.bookings drop constraint if exists bookings_service_type_check;
alter table public.bookings add constraint bookings_service_type_check
  check (service_type = any (array['ugc', 'event', 'broll', 'whitelist', 'post']));
