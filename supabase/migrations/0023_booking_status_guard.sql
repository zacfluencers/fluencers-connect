-- Booking status-transition guard (defense-in-depth).
--
-- 0019 already locks the money fields (price, payment_status, all stripe_*).
-- This extends the same trigger so a booking PARTY can't jump the status field
-- directly to skip the workflow or force a state like 'completed' without the
-- real (service-role) escrow flow. Only the legal, non-money transitions are
-- allowed for end users; the money moves (approve → completed, decline →
-- declined, refunds) run via the service-role client, which bypasses this
-- trigger entirely (auth.uid() is null → early return).

create or replace function public.enforce_booking_guard()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_rate numeric;
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if (select role from public.users where id = auth.uid()) is distinct from 'brand' then
      raise exception 'Only brands can create bookings.'
        using errcode = 'check_violation';
    end if;

    new.brand_id                   := auth.uid();
    new.status                     := 'requested';
    new.payment_status             := 'unpaid';
    new.revision_count             := 0;
    new.stripe_payment_intent_id   := null;
    new.stripe_checkout_session_id := null;
    new.stripe_transfer_id         := null;
    new.stripe_refund_id           := null;

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

  -- UPDATE: pin the immutable + money fields to their old values.
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

  -- Only the legal non-money status transitions are allowed for end users.
  -- (completed / declined / refunded are reached only via the service role.)
  if new.status is distinct from old.status then
    if not (
      (old.status = 'requested'   and new.status = 'accepted')    or
      (old.status = 'accepted'    and new.status = 'in_progress') or
      (old.status = 'accepted'    and new.status = 'requested')   or
      (old.status = 'in_progress' and new.status = 'in_review')   or
      (old.status = 'in_progress' and new.status = 'accepted')    or
      (old.status = 'in_review'   and new.status = 'in_progress')
    ) then
      raise exception 'Illegal booking status transition: % -> %', old.status, new.status
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$function$;
