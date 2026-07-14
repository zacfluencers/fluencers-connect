-- Settings: notification preferences + account deletion.
--
-- And, more importantly, a security fix found while adding them.

-- ---------------------------------------------------------------------------
-- Notification preferences.
--
-- Every notification sent an email, unconditionally, with no way to opt out.
-- Booking updates are worth an email; a ping for every single chat message is
-- not, and there was no way to say so.
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists email_messages boolean not null default true,
  add column if not exists email_bookings boolean not null default true;

-- ---------------------------------------------------------------------------
-- Account deletion.
--
-- Not a real DELETE: bookings reference users with ON DELETE RESTRICT, so the
-- database will refuse to remove anyone who has ever transacted — deliberately,
-- because those are financial records. So "delete my account" means anonymise
-- the profile and lock the login, while the booking history survives. That is
-- also the correct GDPR answer: erasure does not override the duty to keep
-- records of a transaction.
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists deleted_at timestamptz;

-- ---------------------------------------------------------------------------
-- SECURITY FIX: users could rewrite their own role.
--
-- `users_update_own` allows UPDATE where auth.uid() = id, but has no WITH CHECK,
-- and Postgres grants UPDATE on every column by default. So any signed-in user
-- could POST to the REST API and change their own `role` — verified against this
-- database, it succeeded. The sharp edge: an unsubscribed brand could flip to
-- 'creator' and message people for free, because the paywall only ever gates
-- brands.
--
-- RLS can't express "this column may not change" (WITH CHECK only sees the new
-- row). Column privileges can. Nothing in the app writes to public.users from a
-- user's session — signup goes through a SECURITY DEFINER trigger, and the new
-- settings screens write via the service role — so revoking is safe.
-- ---------------------------------------------------------------------------
revoke update on public.users from authenticated, anon;

-- The only two columns a user may now change about themselves. `role`, `email`,
-- `id` and `deleted_at` are no longer writable from the browser at all.
grant update (email_messages, email_bookings) on public.users to authenticated;
