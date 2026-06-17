import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { CREATOR_PROFILE_COLUMNS, getFavoriteIds } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { CreatorCard } from "@/components/CreatorCard";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal, RevealOnView } from "@/components/ui/motion";
import type { CreatorProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getPreviewCreators(): Promise<CreatorProfile[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("creator_profiles")
    .select(CREATOR_PROFILE_COLUMNS)
    .order("instagram_followers", { ascending: false, nullsFirst: false })
    .limit(6);
  return data ?? [];
}

export default async function LandingPage() {
  const [creators, favoriteIds, me] = await Promise.all([
    getPreviewCreators(),
    getFavoriteIds(),
    getCurrentUser(),
  ]);

  return (
    <main>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden">
        <div className="aurora" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-24 text-center sm:pt-32">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/5 px-3 py-1 text-xs text-[var(--muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-2)]" />
              The influencer marketplace, reimagined
            </span>
          </Reveal>

          <Reveal index={1}>
            <h1 className="h-display mx-auto mt-6 max-w-3xl text-5xl font-bold sm:text-7xl">
              Book creators instantly.
              <br />
              <span className="text-gradient">No negotiation. No friction.</span>
            </h1>
          </Reveal>

          <Reveal index={2}>
            <p className="mx-auto mt-6 max-w-xl text-lg text-[var(--muted)]">
              A high-end marketplace where brands book vetted creators at fixed
              prices. Browse, request, and pay through escrow — content delivered,
              no chasing.
            </p>
          </Reveal>

          <Reveal index={3}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/marketplace" size="lg">
                Browse Creators
              </ButtonLink>
              <ButtonLink href="/signup" size="lg" variant="secondary">
                Become a Brand
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------- Creator preview grid */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <RevealOnView className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="h-display text-2xl font-semibold sm:text-3xl">
              Featured creators
            </h2>
            <p className="mt-1 text-[var(--muted)]">
              A glimpse of the talent on the platform.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="hidden text-sm text-[var(--accent-2)] underline-offset-4 hover:underline sm:block"
          >
            View all →
          </Link>
        </RevealOnView>

        {creators.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {creators.map((c, i) => (
              <Reveal key={c.user_id} index={i}>
                <CreatorCard
                  creator={c}
                  initialFavorited={favoriteIds.has(c.user_id)}
                  canFavorite={!!me}
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

      {/* ------------------------------------------------------- Social proof */}
      <section className="border-y border-[var(--border)] bg-[var(--surface)]/40">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <RevealOnView className="grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
            <Stat value="2,400+" label="Vetted creators" />
            <Stat value="98%" label="On-time delivery" />
            <Stat value="< 48h" label="Avg. turnaround" />
            <Stat value="£1.2M+" label="Paid to creators" />
          </RevealOnView>

          <RevealOnView className="mt-14">
            <p className="text-center text-xs uppercase tracking-widest text-[var(--muted)]">
              Trusted by modern brands
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-50">
              {["Northwind", "Lumen", "Vertex", "Halcyon", "Ardent"].map((b) => (
                <span
                  key={b}
                  className="text-lg font-semibold tracking-tight text-[var(--foreground)]"
                >
                  {b}
                </span>
              ))}
            </div>
          </RevealOnView>
        </div>
      </section>

      {/* -------------------------------------------------------------- Footer */}
      <footer className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-sm text-[var(--muted)]">
            © {new Date().getFullYear()} Influencer Connect
          </span>
          <div className="flex gap-6 text-sm text-[var(--muted)]">
            <Link href="/marketplace" className="hover:text-[var(--foreground)]">
              Browse
            </Link>
            <Link href="/signup" className="hover:text-[var(--foreground)]">
              Become a Brand
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="h-display text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
        {value}
      </p>
      <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
    </div>
  );
}
