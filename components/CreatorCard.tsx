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
  const total = formatFollowers(
    (creator.instagram_followers ?? 0) + (creator.tiktok_followers ?? 0),
  );
  const hasFollowers =
    creator.instagram_followers != null || creator.tiktok_followers != null;

  return (
    <Link href={`/creator/${creator.user_id}`} className="group block">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--surface-2)]">
        {creator.profile_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creator.profile_image}
            alt={creator.name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl font-semibold text-white/10">
            {creator.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="absolute right-3 top-3">
          <FavoriteButton
            creatorId={creator.user_id}
            initialFavorited={initialFavorited}
            canFavorite={canFavorite}
          />
        </div>

        {!creator.availability && (
          <div className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            Booked
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="pt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate font-semibold text-[var(--foreground)]">
            {creator.name}
          </h3>
          {creator.availability && (
            <span className="mt-1 flex shrink-0 items-center gap-1.5 text-xs text-[var(--muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Available
            </span>
          )}
        </div>

        {creator.niche && (
          <p className="truncate text-sm text-[var(--muted)]">{creator.niche}</p>
        )}

        {hasFollowers && (
          <p className="text-sm text-[var(--muted)]">{total} followers</p>
        )}

        <p className="mt-1.5 text-[var(--foreground)]">
          <span className="font-semibold">{gbp.format(creator.price)}</span>{" "}
          <span className="text-[var(--muted)]">/ job</span>
        </p>
      </div>
    </Link>
  );
}
