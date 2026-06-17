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

**`0004`–`0008`** — locked down the signup function; added **portfolio** (a `portfolio_items` table + a Supabase Storage bucket for uploaded images), **favourites** (a `favorites` table), and **follower counts** (Instagram/TikTok numbers on a creator profile).

Notes:
- Every table has Row Level Security on. People only see their own data; creator profiles are public so brands can browse; the two parties on a booking can see each other.
- Not built yet: payments/escrow ledger, per-booking messaging, brand subscriptions, portfolio media.

## Landing Page (`/`)
A high-impact homepage: hero with the statement "Book creators instantly. No negotiation. No friction.", subtext, two CTAs (Browse Creators / Become a Brand), a soft animated gradient, a featured-creator grid pulled live from the database, a social-proof stats + logos band, and a minimal footer.

## Accounts & Login
People sign up as either a **brand** (books creators) or a **creator** (gets booked), using email + password (Supabase Auth). A signed-in person sees their email and role in the top navigation, with a Sign out button. Brands land on the marketplace; creators land on their dashboard.

## Pages
- **Browse Creators** (`/marketplace`) — lists every creator from the database. Filter by niche (dropdown) and by availability (toggle). Filters live in the web address, so a filtered view can be shared or bookmarked.
- **Creator Profile** (`/creator/[id]`) — one creator's page: photo, bio, niche, social handles, availability, fixed price, a 3-item portfolio area, and a **Request Booking** button. Signed-out visitors are prompted to sign in; brands create a real booking request; creators can't book.
- **Sign in / Join** (`/login`, `/signup`) — account creation and login. Signup includes the brand/creator choice.
- **Creator Dashboard** (`/dashboard/creator`) — creators edit their marketplace profile (now with a **niche dropdown** and Instagram/TikTok follower counts), **upload portfolio images**, see **incoming booking requests**, and **accept or decline** them. Also lists active and past bookings.
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
- **CreatorCard** — the card shown in the marketplace grid (photo, name, price, niche, availability badge).
- **MarketplaceFilters** — the niche dropdown + availability toggle at the top of the marketplace.
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

## Live follower sync — not connected yet
Follower counts are entered manually by creators for now. True live sync from Instagram/TikTok needs external developer-app approvals (Meta + TikTok) or a paid creator-data provider (e.g. Modash/Phyllo) plus API keys you'd provide. The database columns and an integration seam (`lib/social/sync.ts`) are ready so it can be plugged in later without rework.

## How to Customize
- **To add to the database**: create a new numbered file in `supabase/migrations/` (e.g. `0002_messaging.sql`). Never edit an already-applied migration.
