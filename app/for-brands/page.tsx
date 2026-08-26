import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal, RevealOnView } from "@/components/ui/motion";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Book creators at fixed prices - Fluencers Connect",
  description:
    "Browse vetted creators, book UGC, events and B-roll at listed prices, and pay through escrow - released only when you approve the content. Create your brand account on Fluencers Connect.",
};

/** Where every primary call to action points. */
const JOIN = "/signup?role=brand";

/** Reasons to join — the core of the pitch, brand-first. */
const REASONS = [
  {
    title: "Transparent pricing",
    body: "See every creator’s rates upfront. No haggling, no surprise quotes - just the price to book.",
  },
  {
    title: "Escrow protection",
    body: "Your payment is held safely and only released once you’ve approved the content you asked for.",
  },
  {
    title: "Vetted creators only",
    body: "Every creator is reviewed before they appear, so you skip the guesswork and the fake followings.",
  },
  {
    title: "Fast turnaround",
    body: "Most content lands in under 48 hours - not weeks of back-and-forth over email.",
  },
  {
    title: "Nothing lost in DMs",
    body: "Every booking keeps the brief, scope, files and price in one place, from request to delivery.",
  },
  {
    title: "Book like anything else",
    body: "Filter by niche, audience, platform, country and budget, then book in a couple of clicks.",
  },
];

/** The three-step explainer, from a brand’s point of view. */
const STEPS = [
  {
    title: "Find the right fit",
    body: "Filter vetted creators by niche, audience size, platform, country and price. See exactly who you’re getting before you reach out.",
  },
  {
    title: "Book at a fixed price",
    body: "Every service - UGC, event day, B-roll - has a clear rate. Pick one and book in a couple of clicks. No briefs lost in DMs.",
  },
  {
    title: "Pay safely on delivery",
    body: "Your payment sits in escrow until the content lands and you approve it. On time, on brief, with peace of mind.",
  },
];

/** What brands can book. */
const SERVICES = [
  {
    tag: "UGC",
    title: "User-generated content",
    body: "Authentic photo and video made for your channels and ads, priced and ready to book.",
  },
  {
    tag: "Events",
    title: "Event coverage",
    body: "A creator on the ground to capture your launch, pop-up or activation as it happens.",
  },
  {
    tag: "B-roll",
    title: "B-roll and clips",
    body: "Ready-to-edit footage you can drop straight into campaigns and social posts.",
  },
];

/** Short objection-busters for the mailing audience. */
const FAQS = [
  {
    q: "How does booking work?",
    a: "Browse creators, pick a service at its listed price, and pay into escrow. The creator delivers, you approve, and only then are the funds released.",
  },
  {
    q: "How much does it cost?",
    a: "Creating an account and browsing creators is free. When you’re ready to book, you choose a plan that fits how much you hire.",
  },
  {
    q: "What if the content isn’t right?",
    a: "You approve the work before any money is released, and every booking includes revisions - so if something’s off, you’re covered.",
  },
  {
    q: "Are the creators legit?",
    a: "Every creator is vetted before they appear, with real audience numbers pulled straight from their platforms.",
  },
];

/** Live count of creators available to book, for social proof. */
async function getCreatorCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("creator_profiles")
    .select("user_id", { count: "exact", head: true });
  return count ?? 0;
}

export default async function BrandsLandingPage() {
  const [me, creatorCount] = await Promise.all([
    getCurrentUser(),
    getCreatorCount(),
  ]);
  const isBrand = me?.role === "brand";
  const countLabel = new Intl.NumberFormat("en-GB").format(creatorCount);

  // A signed-in brand landing here from a campaign link goes straight to the
  // marketplace to book, rather than being asked to sign up again.
  const primaryHref = isBrand ? "/marketplace" : JOIN;
  const primaryLabel = isBrand ? "Browse creators" : "Create your brand account";

  return (
    <main>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden">
        <div className="aurora" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-20 text-center sm:pb-36 sm:pt-40">
          <Reveal>
            <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[var(--border-strong)] bg-white/5 px-3 py-1.5 text-[clamp(0.56rem,2.7vw,0.78rem)] font-medium uppercase tracking-[0.14em] text-[var(--muted)] sm:px-4 sm:tracking-[0.2em]">
              <span className="pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-2)]" />
              For brands
            </span>
          </Reveal>

          <Reveal index={1}>
            <h1 className="text-hero h-display mx-auto mt-8 font-bold">
              <span className="block whitespace-nowrap">Book vetted creators.</span>
              <span className="block whitespace-nowrap text-gradient pb-[0.12em]">
                At a fixed price.
              </span>
            </h1>
          </Reveal>

          <Reveal index={2}>
            <p className="text-lead mx-auto mt-8 max-w-2xl text-[var(--muted)]">
              Browse creators by niche, audience and budget, book a service at its
              listed rate, and pay through escrow - released only when you approve
              the content. No haggling, no agencies, no briefs lost in DMs.
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
                Browse{" "}
                <span className="font-semibold text-[var(--foreground)]">
                  {countLabel}+
                </span>{" "}
                vetted creators ready to book.
              </p>
            </Reveal>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------- Why join (reasons) */}
      <section className="mx-auto max-w-7xl px-6 pb-28 sm:pb-36">
        <RevealOnView className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow text-[var(--accent-2)]">Why book here</p>
          <h2 className="text-h2 h-display mt-3 font-semibold">
            Content, booked like you book anything else
          </h2>
          <p className="text-lead mt-3 text-[var(--muted)]">
            Clear prices, vetted talent, and your money protected until the work
            is right.
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
            {isBrand ? "Browse creators" : "Start booking creators"}
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
              From discovery to delivery in three steps
            </h2>
            <p className="text-lead mt-3 text-[var(--muted)]">
              No briefs lost in inboxes, no negotiating rates over DMs. Just a
              clear path from browsing to booked.
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

      {/* ------------------------------------------------ What you can book */}
      <section className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
        <RevealOnView className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow text-[var(--accent-2)]">What you can book</p>
          <h2 className="text-h2 h-display mt-3 font-semibold">
            The content your campaigns need
          </h2>
          <p className="text-lead mt-3 text-[var(--muted)]">
            Every service has a listed price. Pick one and book - simple as that.
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
            {isBrand ? "Browse creators" : "Find a creator to book"}
          </ButtonLink>
        </RevealOnView>
      </section>

      {/* ------------------------------------------------------- Stats (framed) */}
      <section className="mx-auto max-w-7xl px-6 pb-20 sm:pb-28">
        <RevealOnView>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
            {[
              { value: creatorCount > 0 ? `${countLabel}+` : "Growing", label: "Vetted creators" },
              { value: "Escrow", label: "Protected payments" },
              { value: "< 48h", label: "Typical turnaround" },
              { value: "Fixed", label: "Upfront pricing" },
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
                Book your next creator in minutes
              </h2>
              <p className="text-lead mx-auto mt-5 max-w-xl text-[var(--muted)]">
                Browse the talent, pick a price, and pay safely on delivery.
                Creating an account and browsing is free.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <ButtonLink href={primaryHref} size="lg">
                  {primaryLabel}
                </ButtonLink>
                {!isBrand && (
                  <ButtonLink href="/marketplace" size="lg" variant="secondary">
                    Browse creators first
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
              Brand Sign Up
            </Link>
            <Link href="/signup?role=creator" className="hover:text-[var(--foreground)]">
              Creator Sign Up
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
