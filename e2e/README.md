# End-to-end tests

Playwright tests for the critical, money-adjacent flows. They run against a
live app (local dev by default, or any URL via `PLAYWRIGHT_BASE_URL`).

## What's covered

| File | Flow | Needs sign-in? |
|------|------|----------------|
| `smoke.spec.ts` | Public pages load (home, marketplace, login, signup, 404) | No |
| `auth.spec.ts` | Sign-up submits & responds cleanly; wrong password shows a friendly error | No |
| `gating.spec.ts` | **Unsubscribed brand is browse-only** (no book/message/favourite, directory toggle disabled, trimmed nav) **and subscribed brand keeps full access** | Yes |
| `booking.spec.ts` | Subscribed brand books a creator → Stripe Checkout / deal room | Yes |

Tests that need a signed-in account **skip themselves** when their credentials
aren't set, so `npm run test:e2e` is always green out of the box.

## Running

```bash
# Public flows only (no accounts needed)
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui
```

### The signed-in flows (gating + booking)

These need two seeded brand accounts — one **subscribed**, one **not** — and they
only exercise the gating in an environment where Stripe billing is configured
(i.e. production, not local demo mode). Point them at production:

```bash
TEST_BRAND_EMAIL='e2e-brand-sub@e2e-fluencers.dev' \
TEST_BRAND_PASSWORD='E2e-test-pass-123' \
TEST_UNSUB_BRAND_EMAIL='e2e-brand-free@e2e-fluencers.dev' \
TEST_UNSUB_BRAND_PASSWORD='E2e-test-pass-123' \
PLAYWRIGHT_BASE_URL='https://fluencers-connect.vercel.app' \
npm run test:e2e
```

> **Why production?** Locally the app runs in "demo mode" (no Stripe env vars),
> so gating is intentionally off and every brand can transact. The gating tests
> therefore need an environment where billing is configured.

## Seeding the two test accounts

Run this once in the Supabase SQL editor (or via the MCP tools). It creates two
brand accounts with pre-confirmed emails and a known password. Delete them again
whenever you like — they're only fixtures.

```sql
-- Create the accounts (password: E2e-test-pass-123)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change,
  email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), 'authenticated', 'authenticated', email,
  crypt('E2e-test-pass-123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"role":"brand"}'::jsonb,
  '', '', '', '', '', '', '', ''            -- empty (not NULL) so GoTrue can sign in
from (values ('e2e-brand-sub@e2e-fluencers.dev'), ('e2e-brand-free@e2e-fluencers.dev')) as t(email);

-- Email identities (required for password sign-in on recent GoTrue)
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email in ('e2e-brand-sub@e2e-fluencers.dev','e2e-brand-free@e2e-fluencers.dev');

-- The "-sub" account is subscribed; the "-free" account is left with no billing row.
insert into brand_billing (user_id, stripe_customer_id, status, plan, current_period_end, cancel_at_period_end, updated_at)
select id, 'cus_e2e_test', 'active', 'weekly', now() + interval '7 days', false, now()
from auth.users where email = 'e2e-brand-sub@e2e-fluencers.dev';
```

To remove them afterwards:

```sql
delete from brand_billing where user_id in (
  select id from auth.users where email like 'e2e-brand-%@e2e-fluencers.dev');
delete from auth.users where email like 'e2e-brand-%@e2e-fluencers.dev';
```

## Note on signup + email (production)

Signup uses Supabase's built-in mailer, which is **rate-limited to a few emails
per hour** and rejects reserved domains like `example.com`. That's fine for
testing, but before real launch you'll want to connect a proper email provider
(Resend, SendGrid, etc.) in Supabase → Authentication → SMTP, or new users will
hit "email rate limit exceeded" once a handful sign up in the same hour.
