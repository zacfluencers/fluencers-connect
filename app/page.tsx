import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  CREATOR_PROFILE_COLUMNS,
  getFavoriteIds,
  getFavoriteBrandIds,
  listBrandsLookingForCreators,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { brandCanTransact } from "@/lib/subscription";
import { CreatorCard } from "@/components/CreatorCard";
import { BrandCard } from "@/components/BrandCard";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal, RevealOnView } from "@/components/ui/motion";
import type { CreatorProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Placeholder brand names for the "trusted by" marquee. */
const BRANDS = [
  "Northwind",
  "Lumen",
  "Vertex",
  "Halcyon",
  "Ardent",
  "Monera",
  "Cassio",
  "Verdant",
  "Otto & Co",
];

/** The three-step explainer. */
const STEPS = [
  {
    title: "Discover the right fit",
    body: "Filter vetted creators by niche, audience size, platform, country and price. See exactly who you’re getting before you reach out.",
  },
  {
    title: "Book at a fixed price",
    body: "Every service — UGC, event day, B-roll — has a clear rate. Pick one and book in a couple of clicks. No briefs lost in DMs.",
  },
  {
    title: "Pay safely on delivery",
    body: "Your payment sits in escrow until the content lands and you approve it. Creators get paid on time, brands get peace of mind.",
  },
];

/** Two-sided value props. */
const BRAND_VALUES = [
  {
    title: "Transparent pricing",
    body: "See every rate upfront. No haggling, no surprise quotes — just the price to book.",
  },
  {
    title: "Escrow protection",
    body: "Funds are held safely and only released once you’ve approved the content.",
  },
  {
    title: "Vetted talent only",
    body: "Every creator is reviewed before they appear, so you skip the guesswork.",
  },
  {
    title: "Fast turnaround",
    body: "Most content is delivered in under 48 hours — not weeks of back-and-forth.",
  },
];

const CREATOR_VALUES = [
  {
    title: "Set your own rates",
    body: "You price your UGC, events and B-roll. No undercutting, no awkward negotiation.",
  },
  {
    title: "Paid the day you deliver",
    body: "Escrow releases the moment your work is approved. No chasing invoices.",
  },
  {
    title: "Brands come to you",
    body: "Switch on your availability and let brands book you directly — no cold pitching.",
  },
  {
    title: "Fixed scope, fixed price",
    body: "Every booking has clear terms, so there’s no scope creep once you’ve said yes.",
  },
];

async function getPreviewCreators(): Promise<CreatorProfile[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("creator_profiles")
    .select(CREATOR_PROFILE_COLUMNS)
    .order("instagram_followers", { ascending: false, nullsFirst: false })
    .limit(4);
  return data ?? [];
}

/** Live count of creators on the platform (creator profiles). */
async function getCreatorCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("creator_profiles")
    .select("user_id", { count: "exact", head: true });
  return count ?? 0;
}

export default async function LandingPage() {
  const [creators, favoriteIds, me, creatorCount] = await Promise.all([
    getPreviewCreators(),
    getFavoriteIds(),
    getCurrentUser(),
    getCreatorCount(),
  ]);
  const isCreator = me?.role === "creator";
  const locked = me?.role === "brand" ? !(await brandCanTransact(me.id)) : false;
  const creatorCountLabel = `${new Intl.NumberFormat("en-GB").format(creatorCount)}+`;

  // For signed-in creators, show real brands (looking for creators) on the home
  // page instead of the creator grid.
  const [brands, favoriteBrandIds] = isCreator
    ? await Promise.all([listBrandsLookingForCreators(), getFavoriteBrandIds()])
    : [[], new Set<string>()];

  return (
    <main>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden">
        <div className="aurora" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-20 text-center sm:pb-40 sm:pt-44">
          <Reveal>
            <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[var(--border-strong)] bg-white/5 px-3 py-1.5 text-[clamp(0.56rem,2.7vw,0.78rem)] font-medium uppercase tracking-[0.14em] text-[var(--muted)] sm:px-4 sm:tracking-[0.2em]">
              <span className="pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-2)]" />
              The influencer marketplace, reimagined
            </span>
          </Reveal>

          <Reveal index={1}>
            <h1 className="text-hero h-display mx-auto mt-8 font-bold">
              {isCreator ? (
                <>
                  <span className="block whitespace-nowrap">Get booked by brands.</span>
                  <span className="block whitespace-nowrap text-gradient pb-[0.12em]">
                    No negotiation. No friction.
                  </span>
                </>
              ) : (
                <>
                  <span className="block whitespace-nowrap">Book creators instantly.</span>
                  <span className="block whitespace-nowrap text-gradient pb-[0.12em]">
                    No negotiation. No friction.
                  </span>
                </>
              )}
            </h1>
          </Reveal>

          <Reveal index={2}>
            <p className="text-lead mx-auto mt-8 max-w-2xl text-[var(--muted)]">
              {isCreator
                ? "Set your rates, show your work, and let brands book you at fixed prices — paid safely through escrow, no chasing invoices."
                : "A high-end marketplace where brands book vetted creators at fixed prices. Browse, request, and pay through escrow — content delivered, no chasing."}
            </p>
          </Reveal>

          <Reveal index={3}>
            <div className="mt-11 flex flex-wrap items-center justify-center gap-3">
              {isCreator ? (
                <>
                  <ButtonLink href="/brands" size="lg">
                    Browse Brands
                  </ButtonLink>
                  <ButtonLink href="/dashboard/creator" size="lg" variant="secondary">
                    Your dashboard
                  </ButtonLink>
                </>
              ) : (
                <>
                  <ButtonLink href="/marketplace" size="lg">
                    Browse Creators
                  </ButtonLink>
                  <ButtonLink href="/signup?role=brand" size="lg" variant="secondary">
                    Become a Brand
                  </ButtonLink>
                </>
              )}
            </div>
          </Reveal>

          {/* Trusted by — endless, seamless marquee with edge fades */}
          <Reveal index={4}>
            <div className="mt-14 sm:mt-20">
              <p className="text-xs uppercase tracking-widest text-[var(--muted)]">
                Trusted by modern brands
              </p>
              <div className="marquee-mask mt-6 overflow-hidden">
                <div className="marquee-track">
                  {[...BRANDS, ...BRANDS].map((b, i) => (
                    <span
                      key={`${b}-${i}`}
                      className="whitespace-nowrap pr-12 text-lg font-semibold tracking-tight text-[var(--foreground)]/45"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------- Featured / for-creators */}
      <section className="mx-auto max-w-7xl px-6 pb-28 sm:pb-36">
        <RevealOnView className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-h2 h-display font-semibold">
              {isCreator ? "Brands hiring now" : "Featured creators"}
            </h2>
            <p className="text-lead mt-2 text-[var(--muted)]">
              {isCreator
                ? "Brands actively looking for creators like you."
                : "A glimpse of the talent on the platform."}
            </p>
          </div>
          <Link
            href={isCreator ? "/brands" : "/marketplace"}
            className="hidden text-sm text-[var(--accent-2)] underline-offset-4 hover:underline sm:block"
          >
            View all →
          </Link>
        </RevealOnView>

        {isCreator ? (
          brands.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {brands.slice(0, 4).map((b, i) => (
                <Reveal key={b.user_id} index={i}>
                  <BrandCard
                    brand={b}
                    canMessage
                    canFavorite
                    initialFavorited={favoriteBrandIds.has(b.user_id)}
                  />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center text-[var(--muted)]">
              No brands are looking right now — check back soon.
            </div>
          )
        ) : creators.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {creators.map((c, i) => (
              <Reveal key={c.user_id} index={i}>
                <CreatorCard
                  creator={c}
                  initialFavorited={favoriteIds.has(c.user_id)}
                  canFavorite={!!me}
                  viewerRole={me?.role ?? null}
                  locked={locked}
                />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center text-[var(--muted)]">
            Creators will appear here as they join.
          </div>
        )}
      </section>

      {/* ----------------------------------------------------- How it works */}
      <section className="mx-auto max-w-7xl px-6 pb-28 sm:pb-36">
        <RevealOnView className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow text-[var(--accent-2)]">How it works</p>
          <h2 className="text-h2 h-display mt-3 font-semibold">
            From discovery to delivery in three steps
          </h2>
          <p className="text-lead mt-3 text-[var(--muted)]">
            No briefs lost in inboxes, no negotiating rates over DMs. Just a clear
            path from browsing to booked.
          </p>
        </RevealOnView>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} index={i}>
              <div className="relative h-full rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-7">
                <span className="text-h3 h-display font-bold text-[var(--accent-2)]/40">
                  0{i + 1}
                </span>
                <h3 className="text-h3 h-display mt-3 font-semibold">{step.title}</h3>
                <p className="mt-2 text-[var(--muted)]">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------- Why both sides win */}
      <section className="border-y border-[var(--border)] bg-[var(--surface)]/30">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
          <RevealOnView className="mx-auto max-w-2xl text-center">
            <p className="text-eyebrow text-[var(--accent-2)]">Built for both sides</p>
            <h2 className="text-h2 h-display mt-3 font-semibold">
              One marketplace. Two reasons to love it.
            </h2>
          </RevealOnView>

          <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* For brands */}
            <RevealOnView>
              <div className="h-full rounded-3xl border border-[var(--border)] bg-[var(--background)] p-8 sm:p-10">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
                  For brands
                </span>
                <h3 className="text-h3 h-display mt-5 font-semibold">
                  Book content like you book anything else
                </h3>
                <ul className="mt-6 space-y-5">
                  {BRAND_VALUES.map((v) => (
                    <ValueItem key={v.title} title={v.title} body={v.body} />
                  ))}
                </ul>
                {!isCreator && (
                  <ButtonLink href="/signup?role=brand" className="mt-8">
                    Become a Brand
                  </ButtonLink>
                )}
              </div>
            </RevealOnView>

            {/* For creators */}
            <RevealOnView>
              <div className="h-full rounded-3xl border border-[var(--border)] bg-[var(--background)] p-8 sm:p-10">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
                  For creators
                </span>
                <h3 className="text-h3 h-display mt-5 font-semibold">
                  Get booked on your terms, paid on time
                </h3>
                <ul className="mt-6 space-y-5">
                  {CREATOR_VALUES.map((v) => (
                    <ValueItem key={v.title} title={v.title} body={v.body} />
                  ))}
                </ul>
                <ButtonLink
                  href={isCreator ? "/dashboard/creator" : "/signup?role=creator"}
                  variant="secondary"
                  className="mt-8"
                >
                  {isCreator ? "Your dashboard" : "Become a Creator"}
                </ButtonLink>
              </div>
            </RevealOnView>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Stats (framed) */}
      <section className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
        <RevealOnView>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
            {[
              { value: creatorCountLabel, label: "Vetted creators" },
              { value: "Rapid", label: "Content delivery" },
              { value: "< 48h", label: "Avg. turnaround" },
              { value: "Endless", label: "Content opportunities" },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-[var(--background)] px-6 py-10 text-center sm:py-12"
              >
                <p className="text-h2 h-display font-bold text-[var(--foreground)]">
                  {s.value}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">{s.label}</p>
              </div>
            ))}
          </div>
        </RevealOnView>
      </section>

      {/* ------------------------------------------------------- Final CTA */}
      <section className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
        <RevealOnView>
          <div className="glow relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] px-6 py-16 text-center sm:px-12 sm:py-24">
            <div className="aurora" aria-hidden />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-h1 h-display font-bold">
                One marketplace, zero friction
              </h2>
              <p className="text-lead mx-auto mt-5 max-w-xl text-[var(--muted)]">
                Whether you’re hiring creators or getting booked, it starts the same
                way — a profile, a price, and a click.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                {me ? (
                  <ButtonLink href={isCreator ? "/brands" : "/marketplace"} size="lg">
                    {isCreator ? "Browse Brands" : "Browse Creators"}
                  </ButtonLink>
                ) : (
                  <>
                    <ButtonLink href="/signup?role=brand" size="lg">
                      Become a Brand
                    </ButtonLink>
                    <ButtonLink href="/signup?role=creator" size="lg" variant="secondary">
                      Become a Creator
                    </ButtonLink>
                  </>
                )}
              </div>
            </div>
          </div>
        </RevealOnView>
      </section>

      {/* -------------------------------------------------------------- Footer */}
      <footer className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
          <span className="text-sm text-[var(--muted)]">
            © {new Date().getFullYear()} Influencer Connect
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-[var(--muted)]">
            <Link href="/marketplace" className="hover:text-[var(--foreground)]">
              Browse
            </Link>
            <Link href="/signup?role=brand" className="hover:text-[var(--foreground)]">
              Become a Brand
            </Link>
            <Link href="/signup?role=creator" className="hover:text-[var(--foreground)]">
              Become a Creator
            </Link>
            <Link href="/login" className="hover:text-[var(--foreground)]">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

/** A check-marked value bullet used in the two-sided "why" cards. */
function ValueItem({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex gap-3.5">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--accent)]/15 text-[var(--accent-2)]">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5 10 17.5 19 6.5" />
        </svg>
      </span>
      <span>
        <span className="block font-medium text-[var(--foreground)]">{title}</span>
        <span className="mt-0.5 block text-sm text-[var(--muted)]">{body}</span>
      </span>
    </li>
  );
}
