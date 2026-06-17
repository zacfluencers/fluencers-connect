import Link from "next/link";
import { FavoriteButton } from "@/components/FavoriteButton";
import { gbp, formatFollowers } from "@/lib/format";
import type { CreatorProfile } from "@/lib/types";

export function CreatorCard({
  creator,
  initialFavorited,
  canFavorite,
}: {
  creator: CreatorProfile;
  initialFavorited: boolean;
  canFavorite: boolean;
}) {
  const ig = formatFollowers(creator.instagram_followers);
  const tt = formatFollowers(creator.tiktok_followers);
  return (
    <Link
      href={`/creator/${creator.user_id}`}
      className="group block overflow-hidden rounded-2xl border border-[var(--foreground)]/10 bg-[var(--background)] transition-all hover:border-[var(--foreground)]/25 hover:shadow-lg"
    >
      {/* Profile image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--foreground)]/5">
        {creator.profile_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creator.profile_image}
            alt={creator.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-[family-name:var(--font-display)] text-4xl font-bold text-[var(--foreground)]/20">
            {creator.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Availability badge */}
        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            creator.availability
              ? "bg-emerald-500/90 text-white"
              : "bg-[var(--foreground)]/70 text-[var(--background)]"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {creator.availability ? "Available" : "Booked"}
        </span>

        {/* Favourite heart */}
        <div className="absolute right-3 top-3">
          <FavoriteButton
            creatorId={creator.user_id}
            initialFavorited={initialFavorited}
            canFavorite={canFavorite}
          />
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)]">
            {creator.name}
          </h3>
          <span className="shrink-0 text-sm font-semibold text-[var(--foreground)]">
            {gbp.format(creator.price)}
          </span>
        </div>

        {creator.niche && (
          <span className="mt-2 inline-block rounded-full bg-[var(--foreground)]/5 px-2.5 py-0.5 text-xs text-[var(--muted)]">
            {creator.niche}
          </span>
        )}

        {(ig || tt) && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
            {ig && (
              <span>
                <span className="font-semibold text-[var(--foreground)]">{ig}</span> IG
              </span>
            )}
            {tt && (
              <span>
                <span className="font-semibold text-[var(--foreground)]">{tt}</span> TikTok
              </span>
            )}
          </div>
        )}

        {creator.bio && (
          <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
            {creator.bio}
          </p>
        )}
      </div>
    </Link>
  );
}
