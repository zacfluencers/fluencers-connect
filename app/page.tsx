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
  const creatorCountLabel = `${new Intl.NumberFormat("en-GB").format(creatorCount)}+`;

  return (
    <main>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden">
        <div className="aurora" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-6 pb-32 pt-28 text-center sm:pb-40 sm:pt-44">
          <Reveal>
            <span className="text-eyebrow inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/5 px-4 py-1.5 text-[var(--muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-2)]" />
              The influencer marketplace, reimagined
            </span>
          </Reveal>

          <Reveal index={1}>
            <h1 className="text-hero h-display mx-auto mt-8 font-bold">
              <span className="block whitespace-nowrap">Book creators instantly.</span>
              <span className="block whitespace-nowrap text-gradient pb-[0.12em]">
                No negotiation. No friction.
              </span>
            </h1>
          </Reveal>

          <Reveal index={2}>
            <p className="text-lead mx-auto mt-8 max-w-2xl text-[var(--muted)]">
              A high-end marketplace where brands book vetted creators at fixed
              prices. Browse, request, and pay through escrow — content delivered,
              no chasing.
            </p>
          </Reveal>

          <Reveal index={3}>
            <div className="mt-11 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/marketplace" size="lg">
                Browse Creators
              </ButtonLink>
              <ButtonLink href="/signup?role=brand" size="lg" variant="secondary">
                Become a Brand
              </ButtonLink>
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
          <RevealOnView>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center sm:p-14">
              <h3 className="text-h3 font-semibold">Find your next collaboration</h3>
              <p className="mx-auto mt-2 max-w-md text-[var(--muted)]">
                Browse brands looking for creators and start a conversation.
              </p>
              <div className="mt-6 flex justify-center">
                <ButtonLink href="/brands">Browse brands</ButtonLink>
              </div>
            </div>
          </RevealOnView>
        ) : creators.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {creators.map((c, i) => (
              <Reveal key={c.user_id} index={i}>
                <CreatorCard
                  creator={c}
                  initialFavorited={favoriteIds.has(c.user_id)}
                  canFavorite={!!me}
                  viewerRole={me?.role ?? null}
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
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <RevealOnView className="grid grid-cols-2 gap-10 text-center sm:grid-cols-4">
            <Stat value={creatorCountLabel} label="Vetted creators" />
            <Stat value="Rapid" label="Content delivery" />
            <Stat value="< 48h" label="Avg. turnaround" />
            <Stat value="Endless" label="Content opportunities" />
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
      <footer className="mx-auto max-w-7xl px-6 py-16">
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-h2 h-display font-bold text-[var(--foreground)]">{value}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{label}</p>
    </div>
  );
}
