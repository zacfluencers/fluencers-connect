import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal, RevealOnView } from "@/components/ui/motion";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Get booked by brands - Fluencers Connect",
  description:
    "Set your own rates, get discovered by brands, and get paid the day you deliver through escrow. Create your free creator profile on Fluencers Connect.",
};

/** Where every primary call to action points. */
const JOIN = "/signup?role=creator";

/** Reasons to join — the core of the pitch, creator-first. */
const REASONS = [
  {
    title: "You set your own rates",
    body: "Price your UGC, event days and B-roll yourself. No undercutting, no awkward back-and-forth over DMs.",
  },
  {
    title: "Paid the day you deliver",
    body: "Escrow releases the moment a brand approves your work. No 30-day invoices, no chasing payments.",
  },
  {
    title: "Brands come to you",
    body: "Switch your availability on and get booked directly. Stop pitching into the void and waiting on replies.",
  },
  {
    title: "Fixed scope, fixed price",
    body: "Every booking has clear terms agreed upfront, so there’s no scope creep after you’ve said yes.",
  },
  {
    title: "You approve every booking",
    body: "Nothing happens without your yes. See who’s booking and what they need before you accept a thing.",
  },
  {
    title: "One profile, one link",
    body: "A clean, professional page that shows your platforms, audience and rates - ready to share anywhere.",
  },
];

/** The three-step explainer, from a creator’s point of view. */
const STEPS = [
  {
    title: "Build your profile",
    body: "Add your platforms, audience and best work, then set a price for each service you offer. It takes a few minutes.",
  },
  {
    title: "Get discovered",
    body: "Brands browse by niche, audience and budget and book you directly. Turn availability on when you want work, off when you don’t.",
  },
  {
    title: "Deliver and get paid",
    body: "Payment is held in escrow before you start. You deliver, the brand approves, and the money is released to you - on time.",
  },
];

/** What creators can list and sell. */
const SERVICES = [
  {
    tag: "UGC",
    title: "User-generated content",
    body: "Authentic photo and video made for a brand to use across their own channels and ads.",
  },
  {
    tag: "Events",
    title: "Event coverage",
    body: "Show up, capture the day, and hand over content that makes a launch or pop-up look unmissable.",
  },
  {
    tag: "B-roll",
    title: "B-roll and clips",
    body: "Ready-to-edit footage brands can drop straight into their campaigns and social posts.",
  },
];

/** Short objection-busters for the mailing audience. */
const FAQS = [
  {
    q: "Who can join?",
    a: "Any creator with an audience on Instagram, TikTok or YouTube. Add your profiles, set your rates, and you’re live once your profile is approved.",
  },
  {
    q: "How much does it cost to set up?",
    a: "Setting up your creator profile is free. You set your own rates, and you get paid when a brand approves your delivered work.",
  },
  {
    q: "How do I actually get paid?",
    a: "Brands pay into escrow before you start. As soon as they approve the content you deliver, the funds are released to you - no chasing invoices.",
  },
  {
    q: "Do I have to accept every booking?",
    a: "No. You choose which requests to take, and you can switch your availability off any time you need a break.",
  },
];

/** Live count of creators already on the platform, for social proof. */
async function getCreatorCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("creator_profiles")
    .select("user_id", { count: "exact", head: true });
  return count ?? 0;
}

export default async function CreatorsLandingPage() {
  const [me, creatorCount] = await Promise.all([
    getCurrentUser(),
    getCreatorCount(),
  ]);
  const isCreator = me?.role === "creator";
  const countLabel = new Intl.NumberFormat("en-GB").format(creatorCount);

  // A signed-in creator lands on the same page from a campaign link — send them
  // to their dashboard instead of asking them to sign up again.
  const primaryHref = isCreator ? "/dashboard/creator" : JOIN;
  const primaryLabel = isCreator
    ? "Go to your dashboard"
    : "Create your creator profile";

  return (
    <main>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden">
        <div className="aurora" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-20 text-center sm:pb-36 sm:pt-40">
          <Reveal>
            <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[var(--border-strong)] bg-white/5 px-3 py-1.5 text-[clamp(0.56rem,2.7vw,0.78rem)] font-medium uppercase tracking-[0.14em] text-[var(--muted)] sm:px-4 sm:tracking-[0.2em]">
              <span className="pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-2)]" />
              For creators
            </span>
          </Reveal>

          <Reveal index={1}>
            <h1 className="text-hero h-display mx-auto mt-8 font-bold">
              <span className="block whitespace-nowrap">Get booked by brands.</span>
              <span className="block whitespace-nowrap text-gradient pb-[0.12em]">
                You set the price.
              </span>
            </h1>
          </Reveal>

          <Reveal index={2}>
            <p className="text-lead mx-auto mt-8 max-w-2xl text-[var(--muted)]">
              List your UGC, event and B-roll rates, switch on your availability,
              and let brands book you at fixed prices - paid safely through escrow
              the moment your work is approved. No cold pitching, no chasing
              invoices.
            </p>
          </Reveal>

          <Reveal index={3}>
            <div className="mt-11 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href={primaryHref} size="lg">
                {primaryLabel}
              </ButtonLink>
              <ButtonLink href="#how" size="lg" variant="secondary">
                See how it works
              </ButtonLink>
            </div>
          </Reveal>

          {creatorCount > 0 && (
            <Reveal index={4}>
              <p className="mt-8 text-sm text-[var(--muted)]">
                Join{" "}
                <span className="font-semibold text-[var(--foreground)]">
                  {countLabel}+
                </span>{" "}
                creators already on Fluencers Connect.
              </p>
            </Reveal>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------- Why join (reasons) */}
      <section className="mx-auto max-w-7xl px-6 pb-28 sm:pb-36">
        <RevealOnView className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow text-[var(--accent-2)]">Why join</p>
          <h2 className="text-h2 h-display mt-3 font-semibold">
            Everything a paid booking should be
          </h2>
          <p className="text-lead mt-3 text-[var(--muted)]">
            Built so the work comes to you, the terms are clear, and the money
            actually shows up.
          </p>
        </RevealOnView>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {REASONS.map((r, i) => (
            <Reveal key={r.title} index={i % 3}>
              <div className="h-full rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-7">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--accent)]/15 text-[var(--accent-2)]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12.5 10 17.5 19 6.5" />
                  </svg>
                </span>
                <h3 className="text-h3 h-display mt-5 font-semibold">{r.title}</h3>
                <p className="mt-2 text-[var(--muted)]">{r.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <RevealOnView className="mt-12 text-center">
          <ButtonLink href={primaryHref} size="lg">
            {isCreator ? "Go to your dashboard" : "Start getting booked"}
          </ButtonLink>
        </RevealOnView>
      </section>

      {/* ----------------------------------------------------- How it works */}
      <section
        id="how"
        className="scroll-mt-24 border-y border-[var(--border)] bg-[var(--surface)]/30"
      >
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
          <RevealOnView className="mx-auto max-w-2xl text-center">
            <p className="text-eyebrow text-[var(--accent-2)]">How it works</p>
            <h2 className="text-h2 h-display mt-3 font-semibold">
              Live in a few minutes, booked from day one
            </h2>
            <p className="text-lead mt-3 text-[var(--muted)]">
              No briefs lost in inboxes, no negotiating rates over DMs. Just a
              clear path from profile to paid.
            </p>
          </RevealOnView>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} index={i}>
                <div className="relative h-full rounded-2xl border border-[var(--border)] bg-[var(--background)] p-7">
                  <span className="text-h3 h-display font-bold text-[var(--accent-2)]/40">
                    0{i + 1}
                  </span>
                  <h3 className="text-h3 h-display mt-3 font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[var(--muted)]">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ What you can offer */}
      <section className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
        <RevealOnView className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow text-[var(--accent-2)]">What you can offer</p>
          <h2 className="text-h2 h-display mt-3 font-semibold">
            Sell the content you already make
          </h2>
          <p className="text-lead mt-3 text-[var(--muted)]">
            List a price for each service. Brands pick one and book - simple as
            that.
          </p>
        </RevealOnView>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {SERVICES.map((s, i) => (
            <Reveal key={s.tag} index={i}>
              <div className="h-full rounded-3xl border border-[var(--border)] bg-[var(--surface)]/40 p-8">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
                  {s.tag}
                </span>
                <h3 className="text-h3 h-display mt-5 font-semibold">{s.title}</h3>
                <p className="mt-2 text-[var(--muted)]">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <RevealOnView className="mt-12 text-center">
          <ButtonLink href={primaryHref} size="lg">
            {isCreator ? "Manage your services" : "List your services - free"}
          </ButtonLink>
        </RevealOnView>
      </section>

      {/* ------------------------------------------------------- Stats (framed) */}
      <section className="mx-auto max-w-7xl px-6 pb-20 sm:pb-28">
        <RevealOnView>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
            {[
              { value: creatorCount > 0 ? `${countLabel}+` : "Growing", label: "Creators on board" },
              { value: "Escrow", label: "Secured payments" },
              { value: "< 48h", label: "Typical turnaround" },
              { value: "Zero", label: "Cold pitches needed" },
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

      {/* ------------------------------------------------------------- FAQ */}
      <section className="mx-auto max-w-3xl px-6 pb-20 sm:pb-28">
        <RevealOnView className="text-center">
          <p className="text-eyebrow text-[var(--accent-2)]">Good to know</p>
          <h2 className="text-h2 h-display mt-3 font-semibold">
            The quick questions, answered
          </h2>
        </RevealOnView>

        <div className="mt-10 space-y-4">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} index={i}>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-6 sm:p-7">
                <h3 className="font-medium text-[var(--foreground)]">{f.q}</h3>
                <p className="mt-2 text-[var(--muted)]">{f.a}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- Final CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-20 sm:pb-28">
        <RevealOnView>
          <div className="glow relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] px-6 py-16 text-center sm:px-12 sm:py-24">
            <div className="aurora" aria-hidden />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-h1 h-display font-bold">
                Your next booking is one profile away
              </h2>
              <p className="text-lead mx-auto mt-5 max-w-xl text-[var(--muted)]">
                Set your rates, show your work, and let the brands come to you. It
                is free to set up and takes minutes.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <ButtonLink href={primaryHref} size="lg">
                  {primaryLabel}
                </ButtonLink>
                {!isCreator && (
                  <ButtonLink href="/login" size="lg" variant="secondary">
                    I already have an account
                  </ButtonLink>
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
            © {new Date().getFullYear()} Fluencers Connect
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-[var(--muted)]">
            <Link href="/marketplace" className="hover:text-[var(--foreground)]">
              Browse
            </Link>
            <Link href={JOIN} className="hover:text-[var(--foreground)]">
              Creator Sign Up
            </Link>
            <Link href="/signup?role=brand" className="hover:text-[var(--foreground)]">
              Brand Sign Up
            </Link>
            <Link href="/login" className="hover:text-[var(--foreground)]">
              Sign in
            </Link>
            <Link href="/terms" className="hover:text-[var(--foreground)]">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-[var(--foreground)]">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
