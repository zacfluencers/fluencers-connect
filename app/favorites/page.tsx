import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getFavoriteCreators } from "@/lib/queries";
import { CreatorCard } from "@/components/CreatorCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Favourites — Influencer Connect" };

export default async function FavoritesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const creators = await getFavoriteCreators();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold text-[var(--foreground)]">
        Favourites
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Creators you&apos;ve saved to come back to.
      </p>

      {creators.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center">
          <p className="text-[var(--muted)]">
            You haven&apos;t saved any creators yet.
          </p>
          <Link
            href="/marketplace"
            className="mt-4 inline-block text-sm font-medium text-[var(--accent-2)] underline-offset-4 hover:underline"
          >
            Browse creators
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {creators.map((c) => (
            <CreatorCard
              key={c.user_id}
              creator={c}
              initialFavorited={true}
              canFavorite={true}
            />
          ))}
        </div>
      )}
    </main>
  );
}
