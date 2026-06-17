# Influencer Connect — Production Roadmap (staged prompts)

How to use: paste one stage's prompt as a new message when you're ready to build it.
Do them roughly in order — later stages assume earlier ones. Each prompt already
tells the agent to keep the existing stack (Next.js App Router, Supabase + RLS,
strict dark palette, design system) and to update SITE.md.

Stages 1–3 are the critical path (no business without them). 4–6 are pre-launch.
7–14 are hardening/scale and several can run in parallel.

---

## Stage 1 — Payments & escrow (Stripe Connect)
> Add Stripe Connect escrow to the booking flow. Creators onboard as Stripe
> Express connected accounts (payouts). When a brand requests a booking, take
> payment into escrow (manual capture or separate-charge-and-transfer); hold it
> until completion. On "Approve & complete," release funds to the creator; on a
> resolved refund/dispute, return them to the brand. Wire this into the existing
> booking state machine and the deal-room buttons (which are currently UI-only).
> Use Stripe test mode, store keys in Vercel env, and add a webhook handler for
> payment/transfer events. Keep RLS intact and update SITE.md. Don't add
> subscriptions yet. Ask me for the Stripe keys / business details you need.

## Stage 2 — Brand subscriptions + paywall
> Add brand subscriptions via Stripe Billing: £99 for 7 days and £299 annual.
> Gate brand actions (browsing/booking creators) behind an active subscription —
> a brand without one sees a clean upgrade screen. Add a billing page (current
> plan, renew, cancel, invoices via Stripe Customer Portal) and a webhook to keep
> subscription status in sync in Supabase. Enforce entitlement server-side, not
> just in the UI. Keep RLS, reuse the design system, update SITE.md.

## Stage 3 — Real content delivery
> Make the deal-room "content delivery" real. Let the creator upload the finished
> deliverable (video, 9:16) to a booking; store it privately (Supabase Storage
> private bucket or the video provider), and let the brand preview + download it.
> Tie delivery to status: uploading moves the booking to "in_review"; brand
> Approve releases escrow (from Stage 1). Respect the max-3-revisions rule. Add
> RLS so only the two booking parties can access the files. Update SITE.md.

## Stage 4 — Notifications & transactional email
> Add notifications. (1) In-app: a notifications table + a bell in the nav with
> unread state. (2) Email via Resend (or similar): on booking requested/accepted/
> declined/delivered/completed and on new messages. Use React Email templates on
> the brand palette. Make events fire from the existing server actions, keep them
> idempotent, and add user email preferences. Store the API key in Vercel env.
> Update SITE.md.

## Stage 5 — Auth hardening
> Harden auth: add password reset (forgot-password + reset flow), enforce email
> verification before booking/subscribing, and enable Supabase's leaked-password
> protection + sensible password rules. Add a basic account settings page (change
> email/password, sign out everywhere). Keep the existing dark auth styling.
> Update SITE.md.

## Stage 6 — Background jobs (Vercel Cron)
> Add scheduled jobs via Vercel Cron + secured route handlers: (1) auto-release
> escrow to the creator N days after delivery if the brand doesn't act; (2) expire
> booking requests left unanswered for N days; (3) a daily digest email of pending
> actions. Make each job idempotent and safe to re-run, log outcomes, and never
> double-release funds. Update SITE.md.

## Stage 7 — Trust & safety
> Add trust & safety: report/flag buttons on profiles, bookings and messages
> (writing to a reports table for admin review); block-user; a lightweight admin
> view to action reports; and verification badges (manually granted for now).
> Replace self-reported follower counts with a "verified vs self-reported" label.
> Enforce all of it with RLS. Update SITE.md.

## Stage 8 — Video infrastructure
> Move portfolio + deliverable video off raw Supabase Storage onto a video
> provider (Mux or Cloudflare Stream): direct/resumable uploads, transcoding,
> thumbnails/posters, adaptive streaming, and signed playback for private
> deliverables. Add real upload validation (size, type, and reject non-9:16
> sources). Migrate the existing portfolio_items to reference the provider. Keep
> the 9:16 player UI. Update SITE.md.

## Stage 9 — Realtime messaging
> Upgrade messaging to Supabase Realtime: new messages appear instantly without a
> refresh, with read receipts/unread counts and a typing indicator. Keep the
> existing Conversation component and server action for sending; layer realtime on
> top. Ensure RLS still scopes subscriptions to conversation parties. Update
> SITE.md.

## Stage 10 — Search, filtering & pagination
> Make the marketplace scale: server-side pagination/infinite scroll, full-text
> search over creator name/niche/bio, and richer filters (price range, follower
> range, multi-niche), all reflected in the URL. Add DB indexes to back the
> queries. Keep the Airbnb-style card grid. Update SITE.md.

## Stage 11 — Testing & CI
> Add an automated test suite: unit tests for the booking state machine and
> formatting/util code, RLS policy tests (a signed-in user can only see their own
> data), and a couple of Playwright end-to-end flows (signup → book → message).
> Add a GitHub Actions workflow running typecheck, lint, and tests on every PR.
> Don't change app behaviour. Update SITE.md.

## Stage 12 — Monitoring, rate limiting & security
> Add production hardening: Sentry for error tracking (client + server), basic
> analytics, and rate limiting on sensitive server actions (signup, booking
> creation, messaging) using Upstash or Vercel's primitives. Review Vercel
> Firewall/BotID for the public pages. Confirm no secrets leak to the client.
> Update SITE.md.

## Stage 13 — Legal & compliance
> Add the legal layer: Terms of Service, Privacy Policy, and a cookie-consent
> banner; GDPR account deletion + data export; and VAT-compliant invoicing/receipts
> for bookings and subscriptions (lean on Stripe where possible). I'll provide the
> legal copy or you can scaffold placeholders for my lawyer to fill. Update SITE.md.

## Stage 14 — UX gaps, accessibility & SEO
> Close remaining UX gaps and polish: let brands cancel/withdraw a pending request
> and let a brand start a direct message to a creator; add empty-state/onboarding
> nudges (profile completeness). Then do an accessibility pass (focus states,
> labels, keyboard nav, reduced-motion) and an SEO pass (per-page metadata, OG
> images, sitemap, robots). Update SITE.md.

---

### Notes
- You'll need to supply: Stripe keys + business details (1, 2), Resend key (4),
  Mux/Cloudflare account (8), Sentry DSN (12), and legal copy (13).
- Legal (13) can start any time in parallel; it's placed late only because it's
  not a code dependency.
- After each stage, verify locally, then it auto-deploys via the GitHub → Vercel
  connection.
