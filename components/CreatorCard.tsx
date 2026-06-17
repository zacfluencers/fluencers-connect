import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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
    <Link href={`/creator/${creator.user_id}`} className="block">
      <Card interactive className="overflow-hidden">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface-2)]">
          {creator.profile_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creator.profile_image}
              alt={creator.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl font-bold text-white/10">
              {creator.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-transparent to-transparent" />

          <div className="absolute left-3 top-3">
            <Badge tone={creator.availability ? "success" : "neutral"}>
              {creator.availability ? "Available" : "Booked"}
            </Badge>
          </div>
          <div className="absolute right-3 top-3">
            <FavoriteButton
              creatorId={creator.user_id}
              initialFavorited={initialFavorited}
              canFavorite={canFavorite}
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                {creator.name}
              </h3>
              {creator.niche && (
                <p className="mt-0.5 text-sm text-[var(--muted)]">{creator.niche}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--muted)]">from</p>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                {gbp.format(creator.price)}
              </p>
            </div>
          </div>

          {(ig || tt) && (
            <div className="mt-3 flex gap-4 text-xs text-[var(--muted)]">
              {ig && (
                <span>
                  <span className="font-semibold text-[var(--foreground)]">{ig}</span>{" "}
                  Instagram
                </span>
              )}
              {tt && (
                <span>
                  <span className="font-semibold text-[var(--foreground)]">{tt}</span>{" "}
                  TikTok
                </span>
              )}
            </div>
          )}

          <span className="mt-4 flex h-10 w-full items-center justify-center rounded-xl border border-[var(--border-strong)] text-sm font-medium text-[var(--foreground)] transition-colors group-hover:border-[var(--accent-2)]/50">
            View Profile
          </span>
        </div>
      </Card>
    </Link>
  );
}
