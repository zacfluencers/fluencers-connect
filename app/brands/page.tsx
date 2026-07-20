import { listBrandsLookingForCreators, getFavoriteBrandIds } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { BrandCard } from "@/components/BrandCard";
import { Reveal } from "@/components/ui/motion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Brands hiring - Fluencers Connect" };

export default async function BrandsPage() {
  const [brands, me, favoriteBrandIds] = await Promise.all([
    listBrandsLookingForCreators(),
    getCurrentUser(),
    getFavoriteBrandIds(),
  ]);
  const isCreator = me?.role === "creator";

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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b, i) => (
            <Reveal key={b.user_id} index={i}>
              <BrandCard
                brand={b}
                canMessage={isCreator}
                canFavorite={isCreator}
                initialFavorited={favoriteBrandIds.has(b.user_id)}
              />
            </Reveal>
          ))}
        </div>
      )}
    </main>
  );
}
