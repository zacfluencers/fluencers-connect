-- Stripe Connect escrow.
-- Creators receive payouts via an Express connected account; brands pay into
-- escrow on the platform balance at request time, released or refunded later.

alter table public.creator_profiles
  add column stripe_account_id text,
  add column payouts_enabled    boolean not null default false;

alter table public.bookings
  add column payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'held', 'released', 'refunded')),
  add column stripe_payment_intent_id    text,
  add column stripe_checkout_session_id  text,
  add column stripe_transfer_id          text,
  add column stripe_refund_id            text;

-- A checkout session maps to exactly one booking (idempotent creation).
create unique index bookings_checkout_session_unique
  on public.bookings (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
