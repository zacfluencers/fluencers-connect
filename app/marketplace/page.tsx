import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { CreatorCard } from "@/components/CreatorCard";
import { MarketplaceFilters } from "@/components/MarketplaceFilters";
import { Reveal } from "@/components/ui/motion";
import { CREATOR_PROFILE_COLUMNS, getFavoriteIds } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { brandCanTransact } from "@/lib/subscription";
import { offeredServices } from "@/lib/services";
import { isKnownNiche } from "@/lib/niches";
import { rankCreators } from "@/lib/creator-ranking";
import type { CreatorProfile } from "@/lib/types";

export const metadata = {
  title: "Browse Creators - Fluencers Connect",
  description: "Find and book influencers for your brand.",
};

// Always reflect the latest filters/data.
export const dynamic = "force-dynamic";

/**
 * Creators shown per page.
 *
 * Every matching creator used to render at once. At 157 that was a 1MB
 * document and roughly 29MB of images - but the real cost is memory, because a
 * decoded 720x720 image holds about 2MB of bitmap whatever it weighs on the
 * wire. Mobile Safari caps memory per tab and killed the page outright ("A
 * problem repeatedly occurred"), so the marketplace was unusable on an iPhone
 * while looking perfectly fine on a desktop browser.
 *
 * Paging by URL rather than a "load more" button on purpose: appending to the
 * page would walk into the same wall, just more slowly.
 */
const PAGE_SIZE = 24;

interface Filters {
  niches: string[];
  gender?: string;
  country?: string;
  availableOnly: boolean;
  ageMin?: number;
  ageMax?: number;
  rateMin?: number;
  rateMax?: number;
  igMin?: number;
  ttMin?: number;
}

async function getCreators(f: Filters): Promise<CreatorProfile[]> {
  const supabase = await createClient();

  // Cheap equality filters run in SQL; numeric ranges (which span nullable
  // columns) are applied in JS below on the small result set.
  let query = supabase
    .from("creator_profiles")
    .select(CREATOR_PROFILE_COLUMNS)
    .order("name");

  // Match the main niche OR any secondary one, so a fitness creator who also
  // does health shows up under either. Values are re-checked against our fixed
  // list because they arrive from the URL and get interpolated into the filter
  // string below.
  const niches = f.niches.filter(isKnownNiche);
  if (niches.length) {
    const list = niches.map((n) => `"${n}"`).join(",");
    query = query.or(`niche.in.(${list}),secondary_niches.ov.{${list}}`);
  }
  if (f.gender) query = query.eq("gender", f.gender);
  if (f.country) query = query.eq("country", f.country);
  if (f.availableOnly) query = query.eq("availability", true);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to load creators:", error.message);
    return [];
  }

  const matched = (data ?? []).filter((c) => {
    if (f.ageMin != null && (c.age == null || c.age < f.ageMin)) return false;
    if (f.ageMax != null && (c.age == null || c.age > f.ageMax)) return false;

    if (f.rateMin != null || f.rateMax != null) {
      const rates = offeredServices(c).map((s) => s.rate);
      if (rates.length === 0) return false;
      const lo = f.rateMin ?? 0;
      const hi = f.rateMax ?? Infinity;
      // Match if any offered rate falls within the budget range.
      if (!rates.some((r) => r >= lo && r <= hi)) return false;
    }

    if (f.igMin != null && (c.instagram_followers ?? 0) < f.igMin) return false;
    if (f.ttMin != null && (c.tiktok_followers ?? 0) < f.ttMin) return false;
    return true;
  });

  // Which creators have portfolio video, for the strength score. One small
  // query rather than a join, because the marketplace select is a shared
  // column list used by several pages.
  const { data: portfolio } = await supabase
    .from("portfolio_items")
    .select("creator_id");
  const portfolioIds = new Set(
    (portfolio ?? []).map((p) => p.creator_id as string),
  );

  return rankCreators(matched, { niches, portfolioIds });
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  // Creators don't browse other creators — send them to the brand directory.
  const me = await getCurrentUser();
  if (me?.role === "creator") redirect("/brands");

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

  const numParam = (key: string) => {
    const v = Number(params[key]);
    return params[key] != null && Number.isFinite(v) ? v : undefined;
  };

  const filters: Filters = {
    niches: (params.niches ?? "").split(",").filter(Boolean),
    gender: params.gender || undefined,
    country: params.country || undefined,
    availableOnly: params.available === "true",
    ageMin: numParam("ageMin"),
    ageMax: numParam("ageMax"),
    rateMin: numParam("rateMin"),
    rateMax: numParam("rateMax"),
    igMin: numParam("igMin"),
    ttMin: numParam("ttMin"),
  };

  const [creators, favoriteIds] = await Promise.all([
    getCreators(filters),
    getFavoriteIds(),
  ]);
  const viewerRole = me?.role ?? null;
  const locked = me?.role === "brand" ? !(await brandCanTransact(me.id)) : false;

  // Clamped, so a hand-typed ?page=99 or a stale link lands on a real page
  // rather than an empty grid that looks like "no creators match".
  const pageCount = Math.max(1, Math.ceil(creators.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(numParam("page") ?? 1)), pageCount);
  const start = (page - 1) * PAGE_SIZE;
  const visible = creators.slice(start, start + PAGE_SIZE);

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
            {pageCount > 1 && (
              <span>
                {" "}
                · showing {start + 1}-{start + visible.length}
              </span>
            )}
          </p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((c, i) => (
              <Reveal key={c.user_id} index={i} className="h-full">
                <CreatorCard
                  creator={c}
                  initialFavorited={favoriteIds.has(c.user_id)}
                  canFavorite={!!me}
                  viewerRole={viewerRole}
                  locked={locked}
                />
              </Reveal>
            ))}
          </div>

          <Pagination page={page} pageCount={pageCount} params={params} />
        </>
      )}
    </Shell>
  );
}

/**
 * Page links that carry the current filters with them - landing on page 2 of
 * "Fitness, available now" and losing the filters would be worse than no
 * paging at all.
 */
function Pagination({
  page,
  pageCount,
  params,
}: {
  page: number;
  pageCount: number;
  params: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  const href = (n: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v && k !== "page") q.set(k, v);
    }
    if (n > 1) q.set("page", String(n));
    const s = q.toString();
    return s ? `/marketplace?${s}` : "/marketplace";
  };

  const box =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm transition-colors";

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex flex-wrap items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          rel="prev"
          className={`${box} border-[var(--border-strong)] text-[var(--foreground)] hover:bg-white/5`}
        >
          ← Previous
        </Link>
      ) : (
        <span className={`${box} border-[var(--border)] text-[var(--muted)] opacity-40`}>
          ← Previous
        </span>
      )}

      <span className="px-2 text-sm text-[var(--muted)]">
        Page {page} of {pageCount}
      </span>

      {page < pageCount ? (
        <Link
          href={href(page + 1)}
          rel="next"
          className={`${box} border-[var(--border-strong)] text-[var(--foreground)] hover:bg-white/5`}
        >
          Next →
        </Link>
      ) : (
        <span className={`${box} border-[var(--border)] text-[var(--muted)] opacity-40`}>
          Next →
        </span>
      )}
    </nav>
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
