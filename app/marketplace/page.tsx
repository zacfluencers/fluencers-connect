import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { CreatorCard } from "@/components/CreatorCard";
import { MarketplaceFilters } from "@/components/MarketplaceFilters";
import { Reveal } from "@/components/ui/motion";
import { CREATOR_PROFILE_COLUMNS, getFavoriteIds } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import type { CreatorProfile } from "@/lib/types";

export const metadata = {
  title: "Browse Creators — Influencer Connect",
  description: "Find and book influencers for your brand.",
};

// Always reflect the latest filters/data.
export const dynamic = "force-dynamic";

async function getCreators(filters: {
  niche?: string;
  availableOnly: boolean;
}): Promise<CreatorProfile[]> {
  const supabase = await createClient();

  let query = supabase
    .from("creator_profiles")
    .select(CREATOR_PROFILE_COLUMNS)
    .order("name");

  if (filters.niche) query = query.eq("niche", filters.niche);
  if (filters.availableOnly) query = query.eq("availability", true);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to load creators:", error.message);
    return [];
  }
  return data ?? [];
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ niche?: string; available?: string }>;
}) {
  const { niche, available } = await searchParams;

  // Graceful state when the database isn't connected yet.
  if (!isSupabaseConfigured()) {
    return (
      <Shell>
        <EmptyState
          title="Connect your database"
          body="Add your Supabase keys to .env.local (see .env.local.example) to start showing creators here."
        />
      </Shell>
    );
  }

  const availableOnly = available === "true";
  const [creators, favoriteIds, me] = await Promise.all([
    getCreators({ niche, availableOnly }),
    getFavoriteIds(),
    getCurrentUser(),
  ]);

  return (
    <Shell>
      <div className="mb-8">
        <MarketplaceFilters />
      </div>

      {creators.length === 0 ? (
        <EmptyState
          title="No creators match"
          body="Try clearing your filters or check back soon as more creators join."
        />
      ) : (
        <>
          <p className="mb-6 text-sm text-[var(--muted)]">
            {creators.length} creator{creators.length === 1 ? "" : "s"}
          </p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-7xl px-6 py-14 sm:py-20">
      <header className="mb-10">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[var(--accent-2)]">
          Marketplace
        </p>
        <h1 className="text-h1 h-display font-bold">
          Browse Creators
        </h1>
        <p className="text-lead mt-3 max-w-xl text-[var(--muted)]">
          Find the right creator for your campaign. Fixed pricing, clear
          availability, no back-and-forth.
        </p>
      </header>
      {children}
    </main>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center">
      <h2 className="text-xl font-semibold text-[var(--foreground)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[var(--muted)]">{body}</p>
      <Link
        href="/marketplace"
        className="mt-6 inline-block text-sm font-medium text-[var(--accent-2)] underline-offset-4 hover:underline"
      >
        Reset
      </Link>
    </div>
  );
}
