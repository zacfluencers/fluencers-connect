import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getFavoriteCreators, getFavoriteBrands } from "@/lib/queries";
import { CreatorCard } from "@/components/CreatorCard";
import { BrandCard } from "@/components/BrandCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Favourites — Influencer Connect" };

export default async function FavoritesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const isCreator = me.role === "creator";

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-h1 h-display font-bold text-[var(--foreground)]">
        Favourites
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        {isCreator
          ? "Brands you've saved to come back to."
          : "Creators you've saved to come back to."}
      </p>

      {isCreator ? <CreatorFavorites /> : <BrandFavorites />}
    </main>
  );
}

async function CreatorFavorites() {
  const brands = await getFavoriteBrands();

  if (brands.length === 0) {
    return (
      <EmptyState
        body="You haven't saved any brands yet."
        href="/brands"
        cta="Browse brands looking for creators"
      />
    );
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {brands.map((b) => (
        <BrandCard
          key={b.user_id}
          brand={b}
          canMessage
          canFavorite
          initialFavorited
        />
      ))}
    </div>
  );
}

async function BrandFavorites() {
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

  return (
    <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {creators.map((c) => (
        <CreatorCard
          key={c.user_id}
          creator={c}
          initialFavorited={true}
          canFavorite={true}
          viewerRole="brand"
        />
      ))}
    </div>
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
