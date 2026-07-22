-- Stop a creator's unfinished paperwork from blocking the brand.
--
-- Until now, approving work called releaseEscrow(), which refused outright if
-- the creator hadn't completed Stripe onboarding. The action returned early on
-- that error, so the booking status never moved: the brand saw a message about
-- someone else's admin, the job stayed stuck in review, and nothing told the
-- creator to do anything. Nothing retried it either - the account.updated
-- webhook only flipped a flag.
--
-- `pending_payout` splits the two halves. The brand's approval always
-- completes. The money - already captured and sitting on the platform balance,
-- so never at risk - is marked as owed, and moves the moment Stripe confirms
-- the creator can receive it.

alter table public.bookings drop constraint if exists bookings_payment_status_check;
alter table public.bookings add constraint bookings_payment_status_check
  check (payment_status in ('unpaid', 'held', 'released', 'refunded', 'pending_payout'));

-- Every lookup for this is "what does this creator still have owed", so index
-- that pair rather than the status alone.
create index if not exists bookings_pending_payout_idx
  on public.bookings (creator_id)
  where payment_status = 'pending_payout';

comment on column public.bookings.payment_status is
  'unpaid | held (escrow) | pending_payout (approved, creator not yet able to receive) | released | refunded';

-- Brief attachments were still capped at 100MB while portfolio and deliverables
-- moved to 500MB on 21 Jul. Brief attachments include example clips, so there
-- was no reason for the one describing the work to be stricter than the work.
update storage.buckets set file_size_limit = 524288000 where id = 'briefs';
