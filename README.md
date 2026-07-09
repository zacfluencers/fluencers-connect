# Static Marketing Site Starter

Build marketing sites with Claude Code. No coding required.

## What is this?

A Next.js template designed specifically for building marketing websites with Claude Code inside Ship Studio. Just describe what you want to build, and Claude handles all the code.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm run dev
   ```

3. **Open Claude Code and start building**

   Just describe what you want:
   - "Create a landing page for my coffee shop"
   - "I need a portfolio site with a contact form"
   - "Build a pricing page with three tiers"

## Available Commands

| Command | Description |
|---------|-------------|
| `/onboarding` | Set up a new project. Claude asks about your business and creates a personalized build plan. |
| `/page-remake` | Rebuild from an example. Share a URL you like, and Claude creates something similar. |
| `/sanity-cms` | Add editable content. When you want to update text yourself without touching code. |

## How It Works

1. **Start a conversation** - Just type what you want to build
2. **Claude builds it** - All the code is handled for you
3. **Refine together** - Ask for changes until it's perfect

## Project Structure

```
app/
├── layout.tsx       # Page wrapper (fonts, metadata)
├── page.tsx         # Homepage
├── globals.css      # Global styles
└── [folders]/       # Other pages (about/, contact/, etc.)
components/          # Reusable pieces
public/              # Images and files
```

## Design Philosophy

This starter follows **Human-First Design Principles**:

- **Intentional** - Every design choice has a reason
- **Distinctive** - Not a copy of common patterns
- **Memorable** - Something visitors remember
- **Human** - Warm and approachable

## Documentation

- **CLAUDE.md** - Instructions for Claude Code (how to build your site)
- **SITE.md** - Your project documentation (created during onboarding)

## Tech Stack

- [Next.js 14+](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Google Fonts](https://fonts.google.com/) - Typography

## Environment variables

Copy `.env.example` to `.env.local` for local development, and set the **same
keys in Vercel** (Project → Settings → Environment Variables) for **Production**
and **Preview**.

| Variable | Where it runs | Purpose |
|----------|---------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only (secret)** | Escrow + Stripe webhook writes (bypasses RLS) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Browser | Stripe publishable key (safe to expose) |
| `STRIPE_SECRET_KEY` | **Server only (secret)** | All Stripe API calls |
| `STRIPE_WEBHOOK_SECRET` | **Server only (secret)** | Verifies Stripe webhook signatures |
| `PLATFORM_FEE_BPS` | Server | Optional platform fee, basis points (1000 = 10%, default 0) |
| `STRIPE_PRICE_BRAND_WEEKLY_LOOKUP_KEY` | Server | Lookup key (or `price_…` id) of the weekly brand plan |
| `STRIPE_PRICE_BRAND_ANNUAL_LOOKUP_KEY` | Server | Lookup key (or `price_…` id) of the annual brand plan |
| `NEXT_PUBLIC_SITE_URL` | Browser + server | Canonical URL for Stripe redirect/return links |

Rules of thumb:

- **Only** `NEXT_PUBLIC_*` variables reach the browser. `STRIPE_SECRET_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, and `STRIPE_WEBHOOK_SECRET` must **never** be
  prefixed with `NEXT_PUBLIC_`.
- Real values live only in `.env.local` (git-ignored) and in Vercel — never in
  the repo. `.env.example` holds placeholders only.
- After changing env vars in Vercel, **redeploy** for them to take effect.

## Going live (production checklist)

The app runs in **test mode** today (test Stripe keys, no real money). Work top to
bottom before inviting real users — each group says **what**, **why**, and **where**.
After any Vercel env-var change, **redeploy** so it takes effect.

### 1. Email — connect a real provider ✅ DONE (2026-07-09)

- [x] Connected **Resend** in **Supabase → Authentication → SMTP**, sending from
      `no-reply@fluencersgroup.com` (domain verified via DNS; delivers to inbox, not spam).
      Supabase email rate limit raised to 100/hour.
- **Why it mattered:** Supabase's built-in mailer only sends a few emails per hour. Without
  a real provider, sign-up confirmations and password-reset emails **silently fail** once a
  handful of people use the site in the same hour.

### 2. Stripe — switch from test to live

- [ ] **Activate** your Stripe account (business + bank details) so live mode and payouts work.
- [ ] **Enable Stripe Connect** in live mode (Connect → Settings) — creator payouts need it.
- [ ] Swap to **live** API keys in Vercel: `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- [ ] Recreate the two subscription prices **in live mode**, then point
      `STRIPE_PRICE_BRAND_WEEKLY_LOOKUP_KEY` and `STRIPE_PRICE_BRAND_ANNUAL_LOOKUP_KEY`
      at them (lookup key or `price_…` id). *(Test-mode prices don't exist in live mode.)*
- [ ] Create a **live webhook** at `https://<your-domain>/api/stripe/webhook`, subscribe to:
      `checkout.session.completed`, `account.updated`, `payment_intent.payment_failed`,
      `charge.refunded`, `customer.subscription.created/updated/deleted` — then put its
      signing secret in `STRIPE_WEBHOOK_SECRET`.
- [ ] Confirm `PLATFORM_FEE_BPS` is your intended cut (e.g. `1000` = 10%; default `0`).

### 3. Supabase — auth settings

- [ ] Set **Site URL** and **Redirect URLs** (Authentication → URL Configuration) to your
      live domain, or password-reset / confirmation links will point at the wrong place.
- [ ] Turn on **leaked-password protection** (Authentication → Policies) — the one open
      security advisory.

### 4. Domain + canonical URL

- [ ] Add your **custom domain** in Vercel (Project → Domains).
- [ ] Set `NEXT_PUBLIC_SITE_URL` to your real `https://` domain — Stripe redirect/return
      links use it, so a wrong value sends paying users to the wrong place.

### 5. Env-var sanity check (Vercel → Settings → Environment Variables)

- [ ] Every variable is set for **Production** (not just Preview).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set — the escrow + webhook writes need it.
- [ ] **No secret** is prefixed with `NEXT_PUBLIC_` (only the Supabase URL/anon key and the
      Stripe *publishable* key are browser-safe).

### 6. Final smoke test on the live site

- [ ] Run the automated flows against production (see `e2e/README.md`):
      gating + booking should pass.
- [ ] By hand, with a **real card and a small amount**: sign up → subscribe → book a
      creator → deliver → approve → confirm the payout, then **refund** it. This exercises
      the whole money path (escrow in, escrow out, refund) in live mode once.

---

## Deploy

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Or deploy manually:
```bash
npm run build
npm start
```

---

Built for use with [Claude Code](https://claude.com/claude-code)
