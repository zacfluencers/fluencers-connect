-- 0019: lock down the bookings table at the database level.
--
-- Why: the app already enforces the booking state machine and ownership in
-- server actions, but the RLS UPDATE policy (bookings_update_party) has no
-- WITH CHECK. That means either party, using the public API key DIRECTLY
-- (bypassing our UI), could rewrite price, payment_status, the Stripe IDs, or
-- the counterparty on a booking — e.g. a creator marking a booking paid, or a
-- brand inserting a booking that's already "paid" without paying.
--
-- Fix: a trigger that makes the money/identity columns writable only by trusted
-- server code. Trusted code = the service-role client (Stripe webhook + escrow),
-- which runs with no end-user JWT, so auth.uid() is null. End users (auth.uid()
-- present) may only move a booking along its status transitions from their own
-- session; everything financial is pinned server-side.

create or replace function public.enforce_booking_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rate numeric;
begin
  -- Trusted server context (service-role webhook / escrow, migrations, psql):
  -- there is no end-user JWT, so skip all guards and trust the caller.
  if auth.uid() is null then
    return new;
  end if;

  -- ---- INSERT: a booking is always born unpaid, unstarted, priced by the
  --      creator's real rate, and owned by the brand who created it. ----------
  if tg_op = 'INSERT' then
    if (select role from public.users where id = auth.uid()) is distinct from 'brand' then
      raise exception 'Only brands can create bookings.'
        using errcode = 'check_violation';
    end if;

    new.brand_id                   := auth.uid();   -- you can only book as yourself
    new.status                     := 'requested';
    new.payment_status             := 'unpaid';
    new.revision_count             := 0;
    new.stripe_payment_intent_id   := null;
    new.stripe_checkout_session_id := null;
    new.stripe_transfer_id         := null;
    new.stripe_refund_id           := null;

    -- Price must equal the creator's advertised rate for the chosen service —
    -- the client can never set its own amount.
    v_rate := case new.service_type
      when 'ugc'   then (select ugc_rate   from public.creator_profiles where user_id = new.creator_id)
      when 'event' then (select event_rate from public.creator_profiles where user_id = new.creator_id)
      when 'broll' then (select broll_rate from public.creator_profiles where user_id = new.creator_id)
      else null
    end;
    if v_rate is null then
      raise exception 'Invalid booking: creator does not offer service "%".', new.service_type
        using errcode = 'check_violation';
    end if;
    new.price := v_rate;

    return new;
  end if;

  -- ---- UPDATE: end users may only advance the status / revision count.
  --      Every money and identity column is pinned to its stored value. --------
  new.id                         := old.id;
  new.brand_id                   := old.brand_id;
  new.creator_id                 := old.creator_id;
  new.price                      := old.price;
  new.service_type               := old.service_type;
  new.payment_status             := old.payment_status;
  new.stripe_payment_intent_id   := old.stripe_payment_intent_id;
  new.stripe_checkout_session_id := old.stripe_checkout_session_id;
  new.stripe_transfer_id         := old.stripe_transfer_id;
  new.stripe_refund_id           := old.stripe_refund_id;
  new.created_at                 := old.created_at;

  return new;
end;
$$;

drop trigger if exists booking_guard on public.bookings;
create trigger booking_guard
  before insert or update on public.bookings
  for each row execute function public.enforce_booking_guard();
