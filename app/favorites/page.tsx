import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getFavoriteCreators, getFavoriteBrands } from "@/lib/queries";
import { brandCanTransact } from "@/lib/subscription";
import { CreatorCard } from "@/components/CreatorCard";
import { BrandCard } from "@/components/BrandCard";
import { getOfficialBrandIds } from "@/lib/admin";
import { Pagination } from "@/components/ui/Pagination";
import { paginate } from "@/lib/paginate";

export const dynamic = "force-dynamic";
export const metadata = { title: "Favourites - Fluencers Connect" };

// Matches the marketplace so a long favourites list can't overload a phone.
const PAGE_SIZE = 24;

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const params = await searchParams;
  const isCreator = me.role === "creator";
  const locked = isCreator ? false : !(await brandCanTransact(me.id));

  return (
    <main className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
      <h1 className="text-h1 h-display font-bold text-[var(--foreground)]">
        Favourites
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        {isCreator
          ? "Brands you've saved to come back to."
          : "Creators you've saved to come back to."}
      </p>

      {isCreator ? (
        <CreatorFavorites pageParam={params.page} />
      ) : (
        <BrandFavorites locked={locked} pageParam={params.page} />
      )}
    </main>
  );
}

async function CreatorFavorites({ pageParam }: { pageParam?: string }) {
  const [brands, officialIds] = await Promise.all([
    getFavoriteBrands(),
    getOfficialBrandIds(),
  ]);

  if (brands.length === 0) {
    return (
      <EmptyState
        body="You haven't saved any brands yet."
        href="/brands"
        cta="Browse brands looking for creators"
      />
    );
  }

  const { visible, page, pageCount } = paginate(brands, pageParam, PAGE_SIZE);

  return (
    <>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((b) => (
          <BrandCard
            key={b.user_id}
            brand={b}
            canMessage
            canFavorite
            initialFavorited
            official={officialIds.has(b.user_id)}
          />
        ))}
      </div>
      <Pagination page={page} pageCount={pageCount} basePath="/favorites" />
    </>
  );
}

async function BrandFavorites({
  locked,
  pageParam,
}: {
  locked: boolean;
  pageParam?: string;
}) {
  const creators = await getFavoriteCreators();

  if (creators.length === 0) {
    return (
      <EmptyState
        body="You haven't saved any creators yet."
        href="/marketplace"
        cta="Browse creators"
      />
    );
  }

  const { visible, page, pageCount } = paginate(creators, pageParam, PAGE_SIZE);

  return (
    <>
      <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((c) => (
          <CreatorCard
            key={c.user_id}
            creator={c}
            initialFavorited={true}
            canFavorite={true}
            viewerRole="brand"
            locked={locked}
          />
        ))}
      </div>
      <Pagination page={page} pageCount={pageCount} basePath="/favorites" />
    </>
  );
}

function EmptyState({
  body,
  href,
  cta,
}: {
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center">
      <p className="text-[var(--muted)]">{body}</p>
      <Link
        href={href}
        className="mt-4 inline-block text-sm font-medium text-[var(--accent-2)] underline-offset-4 hover:underline"
      >
        {cta}
      </Link>
    </div>
  );
}
