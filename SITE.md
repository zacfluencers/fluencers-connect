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

**`0013_brand_media_and_notifications.sql`** + **`0014`** — brands get a **logo, website, Instagram, and TikTok**; a new **`avatars`** storage bucket holds uploaded logos; the **portfolio** bucket's per-file limit was raised to **150MB**; and a **`notifications`** table was added (one row per alert, with read/unread state) so both sides get notified about messages and booking activity. RLS lets people read/clear only their own notifications and create one only for someone they share a booking or conversation with.

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
A high-impact homepage that adapts to who's viewing. **Brands / signed-out visitors** see "Book creators instantly", Browse Creators / Become a Brand CTAs, and a **featured-creator grid**. **Signed-in creators** see a creator-facing hero ("Get booked by brands", Browse Brands / Your dashboard CTAs) and a **grid of brands looking for creators** instead — so the page feels complete from either side. Both grids show a clean **single row** (up to 4) so nothing overflows messily. The hero ends with a **"Trusted by modern brands" endless logo marquee** (seamless loop, soft fades at both edges, pauses on hover). Lower down, a **stats band framed with gridlines** (live creator count, Rapid · Content delivery, &lt; 48h · Avg. turnaround, Endless · Content opportunities), then a minimal footer. The first stat ("Vetted creators") is the **live count of creator profiles** from the database; the others are Rapid · Content delivery, &lt; 48h · Avg. turnaround, and Endless · Content.

## Accounts & Login
People sign up as either a **brand** (books creators) or a **creator** (gets booked), using email + password (Supabase Auth). A signed-in person sees their email and role in the top navigation, with a Sign out button. **First-time brands** land on a focused **`/welcome`** step to fill in their brand profile (with a "skip for now" link), then land on the **marketplace**; returning brands go straight to the marketplace. Creators land on their dashboard.

## Pages
- **Browse Creators** (`/marketplace`) — lists every creator with a rich filter bar: **Industry** (multi-select of niches), **Gender**, **Country**, **Available only**, plus a "More filters" panel with sliders for **Age**, **Rate** (budget range), and **minimum Instagram / TikTok followers**. Every filter lives in the web address, so a filtered view can be shared or bookmarked. Each creator card shows their transparent per-service prices, clickable Instagram/TikTok follower counts, an **Auto book** button, and a **Chat** button.
- **Creator Profile** (`/creator/[id]`) — one creator's page: photo, bio, niche, gender/age/country, clickable social handles with follower counts, availability, a 9:16 video portfolio, and a **transparent pricing panel** with a separate **Request & pay** button for each service they offer (UGC / Event Day / B-Roll). Brands can also start a **chat**. Signed-out visitors are prompted to sign in; creators can't book.
- **Sign in / Join** (`/login`, `/signup`) — account creation and login. Signup includes the brand/creator choice.
- **Creator Dashboard** (`/dashboard/creator`) — a **modular two-column layout**. The **left rail** shows a live preview of the creator's **card exactly as brands see it** (plus a link to their public profile) and their **payout setup**. The **right side** is a set of panels: quick stats (new requests / active / completed), **booking requests** (accept/decline), **active bookings**, a **Messages** panel (recent conversations → inbox), the **profile editor** (a **profile photo upload**, niche, gender/age/country, socials + follower counts, and the three service rates — UGC / Event Day / B-Roll), the **portfolio** uploader (9:16 videos), and past bookings.
- **Favourites** (`/favorites`) — role-aware. **Brands** see the **creators** they've saved (via the bookmark on a creator card/profile); **creators** see the **brands** they've saved (via the bookmark on a brand card/profile). Creators never see a save button on creator cards — favouriting creators is a brand-only action.
- **Brand Dashboard** (`/dashboard/brand`) — the same **modular two-column layout** as the creator dashboard. The **left rail** shows a live preview of the brand's **card as creators see it** in the directory (with a "Visible / Hidden" status) plus quick links (browse, saved creators, messages, all bookings). The **right side** has panels for quick stats (active / in escrow / completed), **active bookings** (cards with a mini progress bar), a **Messages** panel, the **brand profile** editor (now with a **logo upload**, **website**, and **Instagram/TikTok**), and history. (Brands now land on the **marketplace** after sign-in/up; the dashboard is one click away in the nav.)
- **Booking Detail / "Deal Room"** (`/bookings/[id]`) — the centrepiece. A full status **stepper**, a participants panel (creator + brand), the agreed price, a **revision counter** (out of 3), a **content delivery** area (file preview/empty states by stage), a clean **message thread**, and the action buttons (approve, request revision, and — for brands — dispute/refund via a modal). Designed to feel like a deal room, not a chat app.

> UI-only for now (no backend yet, per brief): the message thread (composing is local — needs a `messages` table to persist), the content-delivery file area, and the dispute modal. The approve / request-revision / accept / decline actions are fully wired to the real booking flow.
- **My Bookings** (`/bookings`) — every booking you're part of, with its current status. Click one for the full detail.
- **Booking Detail** (`/bookings/[id]`) — shows the status, a progress bar through the flow, both the creator and brand, the agreed price, revisions used (out of 3), and the buttons for your next step.

## How a booking moves
`requested → accepted → in_progress → in_review → completed`. A creator can **decline** a request (→ declined). While a booking is in review, the brand can **request a revision** (sends it back to in progress), up to **3 times**. Each button only appears for the person allowed to press it. **No payments yet** — "completed" just marks the work done; escrow/Stripe comes later.

## Components
- **Nav** — top navigation; shows who's signed in and the right links for their role. On mobile it collapses to a **hamburger** that opens a full-screen, animated menu (`MobileNav`).
- **MobileNav** — the mobile-only full-screen menu (staggered links, sign-in/out, scroll-lock, Escape-to-close).
- **Avatar** — round profile image (or gradient initial) used across messaging.
- **CreatorCard** — the marketplace card: photo, name, niche, clickable IG/TikTok follower counts, transparent per-service prices, an **Auto book** button, and a **Chat** button.
- **MarketplaceFilters** — the full filter bar (industry multi-select, gender, country, availability + a sliders panel for age, rate, and follower minimums). Writes everything to the URL.
- **RangeSlider** (`DualRange` / `MinSlider`) — the two-handle range and single "minimum" sliders used in the filters.
- **AutoBookButton** — "Auto book": a fast, pre-filled booking request; the brand picks a service and pays into escrow in one step (the creator still approves).
- **MessageCreatorButton** — starts (or reopens) a brand→creator direct chat.
- **ServiceBooking** — the transparent pricing panel on a creator profile, one **Request & pay** button per service.
- **SocialIcons** — the Instagram and TikTok glyphs.
- **DashboardPanel** (`Panel` / `Stat`) — the shared modular card + stat tile used by both the creator and brand dashboards, so they stay visually in sync.
- **DealRoomLink** — the single, clearly-labelled **"Open deal room"** button used on every booking surface (lists, cards, dashboards) so the way into a booking is obvious and consistent.
- **NotificationBell** — the bell + unread badge + dropdown in the top nav; lists recent alerts, marks them read, and links through to the relevant page.
- **ImageUpload** — a reusable single-image uploader (used for brand logos) that stores to the `avatars` bucket and submits the URL with its form.
- **BrandCard** — now shows the brand's uploaded logo (or initial), the "Looking for creators" badge on its own row, and clickable website / Instagram / TikTok links.

## Notifications
Both brands and creators get notifications (a **bell** in the top nav with an unread count). They're created for: a **new message**, a **new booking request** (creator), and every **booking update** — accepted, declined, started, submitted for review, revision requested, approved/completed, or cancelled/refunded. Opening one marks it read and jumps to the booking or conversation. (Counts refresh when you move around the site — there's no live push yet.)
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
- 2026-06-18: **Modular dashboards** for both creators and brands (card-as-clients-see-it on the left, modular panels on the right), and the **Become a creator/brand** links now pre-select the right role on signup.
- 2026-06-18: **Notifications for both sides** (a bell in the nav, with messages + every booking update), **brand logo upload + website/socials** (logo falls back to the company initial; "Looking for creators" badge moved to its own row), larger **150MB** portfolio video uploads, and cleaner Instagram/TikTok icons.
- 2026-06-18: Portfolio videos now show their **first frame as a thumbnail** (no more black boxes), and every booking has a clear **"Open deal room"** button across lists, cards, and dashboards.
- 2026-06-18: **Messages upgrades** — conversations are labelled **deal room (+ live status)** vs **direct message**; inside a conversation you can **view the other party's profile**, **open the deal room**, or **Book now** (brand → creator, when there's no active booking). Added a **brand profile page** (`/brand/[id]`).
- 2026-06-18: Creator profile image is now an **upload** (not a URL). The favourite button no longer shows to creators on creator cards/profiles, and **creators can now favourite brands** (bookmark on brand cards/profiles); the **Favourites** page is role-aware (brands→creators, creators→brands).
- 2026-06-18: Portfolio video uploads now show a **live progress bar** (with a per-file counter) instead of a silent "Uploading…", via a direct browser→storage upload that reports progress.
- 2026-06-18: **Fixed** creator-profile fields (niche, etc.) sometimes needing to be saved twice — the form fields are now **controlled**, so React 19's automatic post-save form reset can't blank them.
- 2026-06-18: **Typography + spacing tidy-up** — refined the fluid type scale (more balanced heading line-heights and a cleaner lead size) and unified every content page onto one responsive vertical rhythm (`py-14 sm:py-20`) so whitespace feels consistent across all pages and screen sizes.
- 2026-06-18: Fixed the **dashboards cropping on mobile** — the two-column grid now uses shrinkable tracks (`minmax(0,1fr)` + `min-w-0`) so wide content (long emails, escrow totals) wraps/truncates instead of forcing horizontal overflow; stat tiles are more compact on small screens.
- 2026-06-18: **Mobile pass** — a smooth full-screen **hamburger menu**, the hero eyebrow now scales to stay on one line with a **gently pulsing dot**, and the hero headline/spacing scale down cleanly on small phones. The mobile menu and **modals render through a portal** to the page body so they always cover the real viewport (the page-transition wrapper's CSS transform was trapping `position: fixed` overlays — this also fixed the deal-room dispute modal). Notification dropdown width is now responsive.
- 2026-06-18: Social-handle fields now show a fixed **`@`** prefix and website fields a fixed **`https://`** prefix (you type just the handle/domain), so links and handles are always saved in the right format.
- 2026-06-18: **Signed-out visitors see teaser cards** — name, photo, niche, and follower counts, but **pricing and booking are hidden** behind a "Sign up to see pricing & book" button (on browse, the homepage, and creator profiles). Signed-in brands still get full pricing, auto-book, chat, and favourites.
- 2026-06-18: First-time **brands** get a focused **`/welcome`** profile-setup step (then land on the marketplace). Homepage "Vetted creators" stat shows the live creator count with a trailing **+**; second/fourth stats reworded.
- 2026-06-18: **Auto-fill follower counts** — a button on the creator form scrapes Instagram/TikTok follower counts from the entered @handles (unofficial, best-effort, demo-only; falls back to manual entry).

## Two-sided access (who sees what)
- **Brands** browse the **creator** marketplace, favourite creators, and book them.
- **Creators** don't see or favourite other creators — instead they browse the **Brands** directory (`/brands`) of brands that are "looking for creators" and can **message** them directly.
- **Portfolios are vertical videos** (9:16). Creators upload MP4/MOV on their dashboard; they play in a locked 9:16 frame on their profile.

## Messaging (`/messages`, `/messages/[id]`)
Real, saved conversations. Started two ways: a creator messaging a brand from the Brands directory, or the per-booking thread inside the deal room. Each conversation is private to its two people.

- **Avatars:** the inbox, the conversation header, and the dashboard message panels show the other person's **profile photo** (creator photo or brand logo, with a gradient-initial fallback) so you can see at a glance who's messaging.
- **Inbox labels:** every conversation shows whether it's a **deal room** (with the booking's live **status** badge) or a **direct message**.
- **Inside a conversation:** the header has the counterpart's name linking to their profile, a **View profile** button, and either **Open deal room** (for booking conversations) or, for a brand messaging a creator with no active booking, a **Book now** button.
- **Brand profile page** (`/brand/[id]`) — a brand's public page (logo, about, budget, website/socials). Creators can reach it from messages, the Brands directory, or the deal room; a relationship-based RLS rule lets a creator view a brand they share a conversation or booking with even if the brand has paused "looking for creators".

## Follower counts — auto-fill (best-effort) + manual
Follower counts are entered **manually**, with an optional **"Auto-fill from handles"** button on the creator profile form that tries to read the public follower count for the entered Instagram/TikTok @handles and fill the numbers in (still editable). This uses an **unofficial best-effort scraper** (`lib/social/scrape.ts` + the `fetchFollowers` action): Instagram via its public web-profile JSON endpoint, TikTok via the follower count embedded in the profile page. It's intended for **demos** — it can be rate-limited, blocked, or broken by site changes (especially from cloud/datacenter IPs like Vercel's), in which case it returns nothing and the creator enters the number manually. **Instagram in particular rate-limits an IP after repeated hits** (returns 401), so the save only re-fetches a platform when the handle is new/changed or no count exists yet — it won't re-hit on every save. TikTok is far more lenient. ⚠️ Scraping is against the platforms' terms of service; the supported production path is a paid creator-data provider (Modash/Phyllo) or the official APIs — the seam for that is `lib/social/sync.ts`, and the DB columns (instagram_followers, tiktok_followers, followers_synced_at) are ready.

## How to Customize
- **To add to the database**: create a new numbered file in `supabase/migrations/` (e.g. `0002_messaging.sql`). Never edit an already-applied migration.
