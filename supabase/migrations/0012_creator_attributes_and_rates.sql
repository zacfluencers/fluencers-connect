-- Richer creator attributes + per-service pricing.
-- Replaces the single `price` with three transparent service rates (UGC,
-- Event Day, B-Roll) and adds filterable attributes (gender, age, country).
-- Bookings now record which service was booked.

alter table public.creator_profiles
  add column ugc_rate    numeric(10, 2) check (ugc_rate   >= 0),  -- per UGC video
  add column event_rate  numeric(10, 2) check (event_rate >= 0),  -- per event day
  add column broll_rate  numeric(10, 2) check (broll_rate >= 0),  -- per B-roll package
  add column gender      text,
  add column age         integer check (age between 13 and 120),
  add column country     text;

-- Carry the old single price over into the UGC rate so nothing is lost.
update public.creator_profiles set ugc_rate = price where ugc_rate is null;

-- `price` is now legacy/derived (the app keeps it in sync with the lowest set
-- rate for backward-compatible booking flows); it no longer has to be present.
alter table public.creator_profiles alter column price drop not null;

-- Which service a booking is for (null for legacy bookings).
alter table public.bookings
  add column service_type text check (service_type in ('ugc', 'event', 'broll'));
