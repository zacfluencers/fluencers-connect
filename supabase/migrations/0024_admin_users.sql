-- Admins.
--
-- Deliberately NOT a third value on the user_role enum. That enum is load-bearing:
-- the booking guard trigger asserts the booker's role is 'brand', RLS policies
-- branch on brand-vs-creator, and every dashboard redirects on it. An 'admin'
-- role would be neither, so an admin would fail every one of those checks and
-- see an empty site — and widening the enum risks the rules protecting the money.
--
-- So admin is an orthogonal flag: you are still a brand or a creator, and you
-- are additionally an admin. Presence of a row here is the whole test.
create table if not exists public.admin_users (
  user_id    uuid primary key references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS on, and NO policies whatsoever. That is the point, not an oversight:
-- with RLS enabled and no policy, the table is unreadable and unwritable through
-- the anon/authenticated key that browsers hold. It can only be touched by the
-- service-role key, which never leaves the server. So a signed-in user cannot
-- read who the admins are, and — crucially — cannot make themselves one.
alter table public.admin_users enable row level security;
