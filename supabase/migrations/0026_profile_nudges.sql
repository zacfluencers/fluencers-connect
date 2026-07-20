-- "Finish your profile" nudge emails.
--
-- Someone can sign up, never save a profile, and sit invisible to the other
-- side of the marketplace forever. This tracks who we've reminded, so the job
-- can nudge them without ever nagging.
--
-- Kept in its own table rather than as a column on public.users on purpose:
-- that table's UPDATE privileges are deliberately locked down to two columns
-- (see 0025), and this is bookkeeping the user should never be able to touch.

create table if not exists public.profile_nudges (
  user_id       uuid primary key references public.users(id) on delete cascade,
  sent_count    int not null default 0,
  first_sent_at timestamptz,
  last_sent_at  timestamptz
);

-- Service-role only, the same lockdown as admin_users: RLS on with zero
-- policies means nothing reachable from the browser can read or write it.
alter table public.profile_nudges enable row level security;

revoke all on public.profile_nudges from anon, authenticated;

/**
 * Who signed up, never finished a profile, and is due a nudge.
 *
 * SECURITY DEFINER because it reads auth.users for the signup date — that
 * schema isn't reachable through the API, and public.users has no created_at.
 *
 * Excludes: closed accounts, unconfirmed emails (they never clicked the
 * confirmation link, so emailing again is noise), admins, anyone who already
 * has a profile, anyone already nudged `max_nudges` times, and anyone nudged
 * within the last `repeat_after_hours`.
 */
create or replace function public.stalled_profile_signups(
  min_age_hours      int default 48,
  max_nudges         int default 2,
  repeat_after_hours int default 120
)
returns table (
  user_id    uuid,
  email      text,
  role       public.user_role,
  sent_count int
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id, u.email, u.role, coalesce(n.sent_count, 0)
  from public.users u
    join auth.users au on au.id = u.id
    left join public.creator_profiles cp on cp.user_id = u.id
    left join public.brand_profiles    bp on bp.user_id = u.id
    left join public.profile_nudges     n on n.user_id  = u.id
    left join public.admin_users        a on a.user_id  = u.id
  where u.deleted_at is null
    and a.user_id is null
    and cp.user_id is null
    and bp.user_id is null
    and au.email_confirmed_at is not null
    and au.created_at < now() - make_interval(hours => min_age_hours)
    and coalesce(n.sent_count, 0) < max_nudges
    and (
      n.last_sent_at is null
      or n.last_sent_at < now() - make_interval(hours => repeat_after_hours)
    )
  order by au.created_at;
$$;

-- Callable only by the service role (the cron job), never from the browser.
revoke all on function public.stalled_profile_signups(int, int, int)
  from public, anon, authenticated;
