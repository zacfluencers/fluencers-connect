import { listBrandsLookingForCreators, getFavoriteBrandIds } from "@/lib/queries";
import { getOfficialBrandIds } from "@/lib/admin";
import { getCurrentUser } from "@/lib/session";
import { BrandCard } from "@/components/BrandCard";
import { Reveal } from "@/components/ui/motion";
import { Pagination } from "@/components/ui/Pagination";
import { paginate } from "@/lib/paginate";

export const dynamic = "force-dynamic";
export const metadata = { title: "Brands hiring - Fluencers Connect" };

// One screenful of cards. Kept in step with the marketplace so no list page
// ever holds enough images to run a phone out of memory.
const PAGE_SIZE = 24;

export default async function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const [brands, me, favoriteBrandIds, officialIds] = await Promise.all([
    listBrandsLookingForCreators(),
    getCurrentUser(),
    getFavoriteBrandIds(),
    getOfficialBrandIds(),
  ]);
  const isCreator = me?.role === "creator";

  const { visible, page, pageCount, start } = paginate(
    brands,
    params.page,
    PAGE_SIZE,
  );

  return (
    <main className="mx-auto max-w-7xl px-6 py-14 sm:py-20">
      <header className="mb-10">
        <p className="text-eyebrow mb-2 text-[var(--accent-2)]">For creators</p>
        <h1 className="text-h1 h-display font-bold">Brands looking for creators</h1>
        <p className="text-lead mt-3 max-w-xl text-[var(--muted)]">
          Brands actively hiring right now. Reach out and start a conversation.
        </p>
      </header>

      {brands.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center text-[var(--muted)]">
          No brands are looking right now - check back soon.
        </div>
      ) : (
        <>
          {pageCount > 1 && (
            <p className="mb-6 text-sm text-[var(--muted)]">
              {brands.length} brands · showing {start + 1}-{start + visible.length}
            </p>
          )}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((b, i) => (
              <Reveal key={b.user_id} index={i}>
                <BrandCard
                  brand={b}
                  canMessage={isCreator}
                  canFavorite={isCreator}
                  initialFavorited={favoriteBrandIds.has(b.user_id)}
                  official={officialIds.has(b.user_id)}
                />
              </Reveal>
            ))}
          </div>

          <Pagination page={page} pageCount={pageCount} basePath="/brands" />
        </>
      )}
    </main>
  );
}
