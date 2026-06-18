# Influencer Connect

> A two-sided marketplace where brands book influencers for paid content, with money held safely in escrow until the work is delivered.

## Product Definition (fixed)
- **Creators**: create profiles, set a fixed price per job, set availability, show a portfolio, receive booking requests.
- **Brands**: subscribe (£99 / 7-day or £299 / annual), browse creators, request bookings, pay via escrow, receive content.
- **Booking flow**: request → accept → in progress → in review → completed (or refunded). Escrow holds funds until completion. **Max 3 revisions.** Messaging happens per booking.

## Look & Feel (design system)
- **Dark only.** Background `#0B0715`, text `#FBFAFD`, primary accent `#3717B6`, luminous glow `#8469ED`. No other saturated colours.
- **Inter** font, large confident headings (`.h-display` adds tighter tracking).
- Premium texture & motion: a faint grain overlay on every page, a soft animated "aurora" gradient in the hero/auth, glow on primary buttons, and Framer Motion everywhere (page fade+slide, card hover-lift, staggered reveals, scale+fade modals).
- **Reusable UI kit** in `components/ui/`: `Button`/`ButtonLink` (primary/secondary/ghost), `Card`, `Badge`, `Input`/`Textarea`/`Select`/`Field`, `Modal`, `Stepper`, and `motion` helpers (`Reveal`, `RevealOnView`).

## Database (Supabase / Postgres)
Migrations live in `supabase/migrations/`.

**`0001_init.sql`** — the foundation. Three tables:
- **users** — one row per account (id, email, role). `role` is `brand` or `creator`. Linked to Supabase Auth.
- **creator_profiles** — extra info only creators have (name, bio, niche, Instagram, TikTok, availability, price, profile image). One per creator.
- **bookings** — a brand's request to a creator (status, price, revision count, created date). Price is saved at request time so later price changes don't affect existing bookings. Revisions capped at 3.

**`0002_booking_status_declined.sql`** — adds a "declined" status so creators can reject a request without deleting it.

**`0003_auth_user_provisioning.sql`** — when someone signs up, automatically creates their row in `users` with the role they picked. Also lets the two people on a booking see each other's basic account info.

**`0004`–`0008`** — locked down the signup function; added **portfolio** (a `portfolio_items` table + a Supabase Storage bucket for uploaded media — now vertical videos), **favourites** (a `favorites` table), and **follower counts** (Instagram/TikTok numbers on a creator profile).

**`0009_brand_profiles.sql`** — brands get a profile (company name, what they're looking for, budget) and a "Looking for creators" toggle; visible to creators when on.

**`0010_messaging.sql`** — real messaging: `conversations` (between a brand and a creator, optionally tied to a booking) and `messages`. Powers both the booking deal room and direct creator→brand chats.

**`0011_stripe_escrow.sql`** — Stripe Connect escrow: creators get a connected-account id + payout-ready flag; bookings track payment status (`unpaid`/`held`/`released`/`refunded`) and the Stripe payment/transfer/refund ids.

**`0012_creator_attributes_and_rates.sql`** — richer creators + transparent per-service pricing. Replaces the single price with three rates — **UGC**, **Event Day**, **B-Roll** (any a creator doesn't offer is left blank) — and adds **gender**, **age**, and **country** for filtering. Bookings now record which **service** was booked. (The old single price was carried over into the UGC rate, and is kept in sync with the lowest set rate behind the scenes.)

## Payments & escrow (Stripe Connect)
- A brand **pays at request time** via Stripe Checkout; the money is **held in escrow** on the platform balance and the booking is created (paid) once Stripe confirms.
- **Approve & complete** → funds are **transferred** to the creator's connected account. **Decline** or a brand **refund/dispute** → funds are **returned** to the brand.
- Creators set up **payouts** (Stripe Express) from their dashboard; they must finish setup before funds can be released.
- A Stripe **webhook** (`/api/stripe/webhook`) is the source of truth for paid bookings and payout-readiness.
- **Setup needed** (env vars in `.env.local` + Vercel): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (see `.env.local.example`). Subscriptions are still not built (Stage 2).

Notes:
- Every table has Row Level Security on. People only see their own data; creator profiles are public so brands can browse; the two parties on a booking can see each other.
- Not built yet: payments/escrow ledger, per-booking messaging, brand subscriptions, portfolio media.

## Landing Page (`/`)
A high-impact homepage: hero with the statement "Book creators instantly. No negotiation. No friction.", subtext, two CTAs (Browse Creators / Become a Brand), a soft animated gradient, a featured-creator grid pulled live from the database, a social-proof stats + logos band, and a minimal footer.

## Accounts & Login
People sign up as either a **brand** (books creators) or a **creator** (gets booked), using email + password (Supabase Auth). A signed-in person sees their email and role in the top navigation, with a Sign out button. Brands land on the marketplace; creators land on their dashboard.

## Pages
- **Browse Creators** (`/marketplace`) — lists every creator with a rich filter bar: **Industry** (multi-select of niches), **Gender**, **Country**, **Available only**, plus a "More filters" panel with sliders for **Age**, **Rate** (budget range), and **minimum Instagram / TikTok followers**. Every filter lives in the web address, so a filtered view can be shared or bookmarked. Each creator card shows their transparent per-service prices, clickable Instagram/TikTok follower counts, an **Auto book** button, and a **Chat** button.
- **Creator Profile** (`/creator/[id]`) — one creator's page: photo, bio, niche, gender/age/country, clickable social handles with follower counts, availability, a 9:16 video portfolio, and a **transparent pricing panel** with a separate **Request & pay** button for each service they offer (UGC / Event Day / B-Roll). Brands can also start a **chat**. Signed-out visitors are prompted to sign in; creators can't book.
- **Sign in / Join** (`/login`, `/signup`) — account creation and login. Signup includes the brand/creator choice.
- **Creator Dashboard** (`/dashboard/creator`) — creators edit their marketplace profile: niche dropdown, **gender / age / country**, Instagram/TikTok handles + follower counts, and their **three service rates** (UGC, Event Day, B-Roll — set at least one). They also **upload portfolio videos**, see **incoming booking requests**, and **accept or decline** them. Also lists active and past bookings.
- **Favourites** (`/favorites`) — creators a signed-in user has saved (via the heart on any creator card or profile) so they can come back to them.
- **Brand Dashboard** (`/dashboard/brand`) — a brand's home: summary stats (active bookings, value in escrow, completed), and active + past bookings as cards with a mini progress bar. Brands land here after login.
- **Booking Detail / "Deal Room"** (`/bookings/[id]`) — the centrepiece. A full status **stepper**, a participants panel (creator + brand), the agreed price, a **revision counter** (out of 3), a **content delivery** area (file preview/empty states by stage), a clean **message thread**, and the action buttons (approve, request revision, and — for brands — dispute/refund via a modal). Designed to feel like a deal room, not a chat app.

> UI-only for now (no backend yet, per brief): the message thread (composing is local — needs a `messages` table to persist), the content-delivery file area, and the dispute modal. The approve / request-revision / accept / decline actions are fully wired to the real booking flow.
- **My Bookings** (`/bookings`) — every booking you're part of, with its current status. Click one for the full detail.
- **Booking Detail** (`/bookings/[id]`) — shows the status, a progress bar through the flow, both the creator and brand, the agreed price, revisions used (out of 3), and the buttons for your next step.

## How a booking moves
`requested → accepted → in_progress → in_review → completed`. A creator can **decline** a request (→ declined). While a booking is in review, the brand can **request a revision** (sends it back to in progress), up to **3 times**. Each button only appears for the person allowed to press it. **No payments yet** — "completed" just marks the work done; escrow/Stripe comes later.

## Components
- **Nav** — top navigation; shows who's signed in and the right links for their role.
- **CreatorCard** — the marketplace card: photo, name, niche, clickable IG/TikTok follower counts, transparent per-service prices, an **Auto book** button, and a **Chat** button.
- **MarketplaceFilters** — the full filter bar (industry multi-select, gender, country, availability + a sliders panel for age, rate, and follower minimums). Writes everything to the URL.
- **RangeSlider** (`DualRange` / `MinSlider`) — the two-handle range and single "minimum" sliders used in the filters.
- **AutoBookButton** — "Auto book": a fast, pre-filled booking request; the brand picks a service and pays into escrow in one step (the creator still approves).
- **MessageCreatorButton** — starts (or reopens) a brand→creator direct chat.
- **ServiceBooking** — the transparent pricing panel on a creator profile, one **Request & pay** button per service.
- **SocialIcons** — the Instagram and TikTok glyphs.
- **AuthForm** — the sign in / sign up form.
- **CreatorProfileForm** — where a creator fills in their bookable profile.
- **RequestBookingButton** — the "Request Booking" action on a creator's page.
- **BookingActions** — the accept/decline/advance buttons on a booking, shown only to whoever can act.
- **StatusBadge** — the little coloured status label used across booking pages.

## Connecting the database
The site reads creators from Supabase. To switch it on, copy `.env.local.example` to `.env.local` and paste in your Supabase URL and anon key (from the Supabase dashboard → Project Settings → API). Until then, the marketplace shows a friendly "connect your database" message instead of erroring.

## Recent Changes
- 2026-06-17: Created the initial database schema (users, creator_profiles, bookings).
- 2026-06-17: Built the creator marketplace — `/marketplace` listing with niche + availability filters, and `/creator/[id]` profile pages. Reads live from Supabase. No booking or payment logic yet.
- 2026-06-17: Added email/password accounts (Supabase Auth) with brand/creator roles, and the full booking flow — request, accept/decline, the requested→accepted→in_progress→in_review→completed status journey, revision requests (max 3), a creator dashboard, and booking pages. Still no payments or subscriptions.
- 2026-06-17: Added **portfolio image uploads** (stored in Supabase Storage), a **niche dropdown** of popular creator niches (replacing free text), **favourites** (save creators with a heart), and **follower counts** on profiles/cards.
- 2026-06-17: **Full visual redesign** to a dark-first, premium SaaS look on the strict brand palette — new landing page, reusable `components/ui/` design system, Framer Motion throughout (grain + glow + animated gradient), a brand dashboard, and a "deal room" booking detail page (stepper, message thread, content delivery, revision counter, dispute modal).
- 2026-06-17: Restyled toward a clean dark-mode-Airbnb feel (borderless photo cards, calmer buttons, more whitespace, responsive type scale, save icon).
- 2026-06-17: **Portfolios are now 9:16 vertical videos**; **creators can no longer see/favourite other creators** (they browse the new **Brands** directory instead); added **brand profiles** with a "Looking for creators" toggle; and shipped **real persisted messaging** (powers both the brands outreach and the booking deal room).
- 2026-06-18: **Transparent per-service pricing + richer creator profiles + powerful search.** Creators now set three rates (**UGC / Event Day / B-Roll**) and capture **gender, age, country**. Creator cards show every rate, clickable **Instagram/TikTok follower counts**, an **Auto book** button (fast pre-filled booking request), and a **Chat** button. The marketplace gained a full filter bar — **industry (multi-select), gender, country, availability**, plus sliders for **age, rate, and minimum IG/TikTok followers**. Bookings record which service was booked.

## Two-sided access (who sees what)
- **Brands** browse the **creator** marketplace, favourite creators, and book them.
- **Creators** don't see or favourite other creators — instead they browse the **Brands** directory (`/brands`) of brands that are "looking for creators" and can **message** them directly.
- **Portfolios are vertical videos** (9:16). Creators upload MP4/MOV on their dashboard; they play in a locked 9:16 frame on their profile.

## Messaging (`/messages`, `/messages/[id]`)
Real, saved conversations. Started two ways: a creator messaging a brand from the Brands directory, or the per-booking thread inside the deal room. Each conversation is private to its two people.

## Live follower sync — not connected yet
Follower counts are entered manually by creators for now. True live sync from Instagram/TikTok needs external developer-app approvals (Meta + TikTok) or a paid creator-data provider (e.g. Modash/Phyllo) plus API keys you'd provide. The database columns and an integration seam (`lib/social/sync.ts`) are ready so it can be plugged in later without rework.

## How to Customize
- **To add to the database**: create a new numbered file in `supabase/migrations/` (e.g. `0002_messaging.sql`). Never edit an already-applied migration.
