import Link from "next/link";
import { FavoriteButton } from "@/components/FavoriteButton";
import { AutoBookButton } from "@/components/AutoBookButton";
import { MessageCreatorButton } from "@/components/MessageCreatorButton";
import { InstagramIcon, TikTokIcon } from "@/components/SocialIcons";
import {
  gbp,
  formatFollowers,
  instagramUrl,
  tiktokUrl,
} from "@/lib/format";
import { offeredServices } from "@/lib/services";
import type { CreatorProfile } from "@/lib/types";

export function CreatorCard({
  creator,
  initialFavorited,
  canFavorite,
  viewerRole = null,
  locked = false,
}: {
  creator: CreatorProfile;
  initialFavorited: boolean;
  canFavorite: boolean;
  viewerRole?: "brand" | "creator" | null;
  /** Brand is signed in but not subscribed — book/chat become Subscribe prompts. */
  locked?: boolean;
}) {
  const services = offeredServices(creator).map((s) => ({
    key: s.def.key,
    label: s.def.label,
    rate: s.rate,
  }));
  const href = `/creator/${creator.user_id}`;
  const ig = formatFollowers(creator.instagram_followers);
  const tt = formatFollowers(creator.tiktok_followers);

  return (
    <div className="group flex flex-col">
      {/* Image (a full-bleed link overlay navigates to the profile; the
          favourite button sits on top of it, so neither is nested in the other) */}
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

        <Link href={href} className="absolute inset-0" aria-label={creator.name} />

        {/* Favouriting creators is a brand action — not shown to creators or
            signed-out visitors. */}
        {viewerRole === "brand" && (
          <div className="absolute right-3 top-3">
            <FavoriteButton
              creatorId={creator.user_id}
              initialFavorited={initialFavorited}
              canFavorite={canFavorite}
            />
          </div>
        )}

        {!creator.availability && (
          <div className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            Booked
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="pt-3">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} className="min-w-0">
            <h3 className="truncate font-semibold text-[var(--foreground)] hover:underline">
              {creator.name}
            </h3>
          </Link>
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

        {/* Socials with per-platform follower counts → external profiles */}
        {(creator.instagram || creator.tiktok) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-7 gap-y-1.5 text-sm">
            {creator.instagram && (
              <a
                href={instagramUrl(creator.instagram)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              >
                <InstagramIcon className="h-4 w-4" />
                {ig ?? "Instagram"}
              </a>
            )}
            {creator.tiktok && (
              <a
                href={tiktokUrl(creator.tiktok)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              >
                <TikTokIcon className="h-4 w-4" />
                {tt ?? "TikTok"}
              </a>
            )}
          </div>
        )}

        {/* Transparent per-service pricing — hidden from signed-out visitors. */}
        {viewerRole !== null && services.length > 0 && (
          <div className="mt-3 space-y-1 border-t border-[var(--border)] pt-3">
            {services.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-[var(--muted)]">{s.label}</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {gbp.format(s.rate)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Brand actions: book + chat */}
        {viewerRole === "brand" && (
          <div className="mt-3 flex items-stretch gap-2">
            <div className="flex-1">
              <AutoBookButton
                creatorId={creator.user_id}
                services={services}
                viewerRole={viewerRole}
                available={creator.availability}
                locked={locked}
              />
            </div>
            <MessageCreatorButton
              creatorId={creator.user_id}
              viewerRole={viewerRole}
              locked={locked}
            />
          </div>
        )}

        {/* Signed-out: prompt to join (pricing + booking are gated). */}
        {viewerRole === null && (
          <Link
            href="/signup"
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-2)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9079f0]"
          >
            Sign up to see pricing &amp; book
          </Link>
        )}
      </div>
    </div>
  );
}
