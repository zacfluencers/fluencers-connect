-- 0021: brand subscriptions (Stripe Billing).
--
-- One row per brand tracking their Stripe customer + subscription status. Like
-- the bookings money columns, this must NOT be writable by the brand directly
-- (otherwise they could self-mark 'active' without paying). So RLS only allows a
-- brand to READ their own row; every write happens server-side via the service
-- role (the Stripe webhook, and the on-return sync). No insert/update policies.

create table public.brand_billing (
  user_id              uuid primary key references public.users (id) on delete cascade,
  stripe_customer_id   text,
  status               text,           -- Stripe subscription status; null = never subscribed
  price_id             text,
  plan                 text,           -- 'weekly' | 'annual'
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at           timestamptz not null default now()
);

create index brand_billing_customer_idx on public.brand_billing (stripe_customer_id);

alter table public.brand_billing enable row level security;

-- A brand may read only their own billing row. Writes are service-role only.
create policy "brand_billing_select_own" on public.brand_billing
  for select using (auth.uid() = user_id);
