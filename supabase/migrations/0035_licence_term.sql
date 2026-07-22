-- The three-month clock on a Meta Whitelist.
--
-- Whitelisting sells a term, not an object: the brand may run ads from the
-- creator's handle for three months. Nothing recorded when that started or
-- ended, so it was the one part of a booking with no answer when the two sides
-- disagreed - and the only evidence would have been a Stripe receipt.
--
-- The clock starts at approval (see app/actions/bookings.ts): the moment the
-- platform records the work as delivered, which can't happen while a revision
-- is outstanding.

alter table public.bookings
  add column if not exists licence_starts_at timestamptz,
  add column if not exists licence_ends_at   timestamptz,
  -- Reminder bookkeeping. Nullable timestamps rather than booleans so a
  -- re-run of the job is harmless and we can see when each one went out.
  add column if not exists licence_ending_notified_at timestamptz,
  add column if not exists licence_ended_notified_at  timestamptz;

-- The reminder job scans by end date, and only a small minority of bookings
-- ever carry one.
create index if not exists bookings_licence_ends_idx
  on public.bookings (licence_ends_at)
  where licence_ends_at is not null;
