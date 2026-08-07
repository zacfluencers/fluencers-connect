-- Nudge everyone with an unfinished profile, confirmed email or not.
--
-- The original function (0026) skipped accounts whose email was never
-- confirmed, on the logic that "they never clicked the link, so emailing again
-- is noise". That logic belonged to a world with an email-confirmation step.
-- We turned confirmation OFF on 6 Aug 2026, so there is no link to click and
-- new signups are confirmed automatically - the filter now protects nobody and
-- would only ever silently drop someone if confirmation were switched back on.
--
-- Address quality is guarded at signup instead (format + real-provider check,
-- see lib/email-validation.ts / lib/email-domain.ts), so we no longer lean on
-- a confirmation click to decide who is safe to email.
--
-- Only change from 0026: the `au.email_confirmed_at is not null` line is gone.
-- Same signature, so this is a clean replace; existing grants are preserved.

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
    and au.created_at < now() - make_interval(hours => min_age_hours)
    and coalesce(n.sent_count, 0) < max_nudges
    and (
      n.last_sent_at is null
      or n.last_sent_at < now() - make_interval(hours => repeat_after_hours)
    )
  order by au.created_at;
$$;
