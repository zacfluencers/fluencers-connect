-- One-off recovery: re-send confirmation emails to people stranded by the
-- 21 Jul incidents.
--
-- Two faults overlapped during the invite wave. Resend hit its sending quota,
-- so confirmation emails arrived late or not at all (links expire, hence the
-- otp_expired seen in a session replay). Separately, signUp() never set
-- emailRedirectTo, so the links that did arrive dropped people on the home
-- page signed out (fixed alongside this migration).
--
-- Both are fixed, but 29 accounts were left unconfirmed and will never be
-- emailed again on their own - Supabase only sends that mail once.
--
-- Kept OFF public.users deliberately: that table's UPDATE grants are locked to
-- two columns (migration 0025), so bookkeeping lives in its own table. Same
-- reasoning as profile_nudges in 0026.

create table if not exists public.signup_confirmation_resends (
  user_id uuid primary key,
  sent_at timestamptz not null default now()
);

-- RLS on with zero policies = service-role only, invisible to the browser key.
alter table public.signup_confirmation_resends enable row level security;
revoke all on public.signup_confirmation_resends from anon, authenticated;

-- auth.users is unreachable over the API, so the rules live here where they
-- can read it. One resend per person, ever - the absence of a row IS the
-- eligibility check, so a second run can't email anyone twice.
create or replace function public.unconfirmed_signups(
  max_age_hours int default 336
)
returns table (user_id uuid, email text, role public.user_role)
language sql
stable
security definer
set search_path = public, auth
as $$
  select au.id, au.email, coalesce(u.role, 'creator'::public.user_role)
  from auth.users au
    left join public.users u on u.id = au.id
    left join public.signup_confirmation_resends r on r.user_id = au.id
    left join public.admin_users a on a.user_id = au.id
  where au.email_confirmed_at is null
    and r.user_id is null
    and a.user_id is null
    and (u.id is null or u.deleted_at is null)
    and au.created_at > now() - make_interval(hours => max_age_hours)
  order by au.created_at;
$$;

revoke all on function public.unconfirmed_signups(int)
  from public, anon, authenticated;
