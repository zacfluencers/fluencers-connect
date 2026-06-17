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
  const total = formatFollowers(
    (creator.instagram_followers ?? 0) + (creator.tiktok_followers ?? 0),
  );
  const hasFollowers =
    creator.instagram_followers != null || creator.tiktok_followers != null;

  return (
    <Link href={`/creator/${creator.user_id}`} className="group block">
      <Card interactive className="overflow-hidden">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface-2)]">
          {creator.profile_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creator.profile_image}
              alt={creator.name}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl font-bold text-white/10">
              {creator.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-transparent to-transparent" />

          <div className="absolute left-4 top-4">
            <Badge tone={creator.availability ? "success" : "neutral"}>
              {creator.availability ? "Available" : "Booked"}
            </Badge>
          </div>
          <div className="absolute right-4 top-4">
            <FavoriteButton
              creatorId={creator.user_id}
              initialFavorited={initialFavorited}
              canFavorite={canFavorite}
            />
          </div>

          {/* Total reach, overlaid bottom-left for impact */}
          {hasFollowers && (
            <div className="absolute bottom-4 left-4">
              <p className="text-xl font-semibold leading-none text-white">
                {total}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-widest text-white/70">
                followers
              </p>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-h3 truncate font-semibold text-[var(--foreground)]">
                {creator.name}
              </h3>
              {creator.niche && (
                <p className="mt-1 truncate text-sm text-[var(--muted)]">
                  {creator.niche}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-[var(--muted)]">from</p>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                {gbp.format(creator.price)}
              </p>
            </div>
          </div>

          {/* Per-platform follower breakdown */}
          {hasFollowers && (
            <div className="mt-5 flex gap-2">
              {ig && <StatPill label="Instagram" value={ig} />}
              {tt && <StatPill label="TikTok" value={tt} />}
            </div>
          )}

          <span className="mt-6 flex h-11 w-full items-center justify-center rounded-xl border border-[var(--border-strong)] text-sm font-medium text-[var(--foreground)] transition-colors group-hover:border-[var(--accent-2)]/60 group-hover:bg-[var(--accent-2)]/5">
            View Profile
          </span>
        </div>
      </Card>
    </Link>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-[var(--muted)]">
      <span className="font-semibold text-[var(--foreground)]">{value}</span>
      {label}
    </span>
  );
}
