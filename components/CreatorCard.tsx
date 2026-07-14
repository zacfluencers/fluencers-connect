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
  creatorAvatar,
  formatEngagement,
  sizedImage,
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
  // Uploaded photo wins; imported IG/TikTok avatars are only a fallback. The
  // card slot is ~360px at its widest, so that's all we ask Supabase for.
  const avatar = sizedImage(creatorAvatar(creator), 360);
  const engagement = formatEngagement(creator.engagement_rate);

  return (
    // h-full + the flex column below keep a row of cards aligned: the grid
    // stretches every card to the tallest, the details stay packed under the
    // name, and the CTA is pinned to the bottom. A creator missing a niche or an
    // engagement figure just gets more slack above their button, rather than a
    // shorter card.
    <div className="group flex h-full flex-col">
      {/* Image (a full-bleed link overlay navigates to the profile; the
          favourite button sits on top of it, so neither is nested in the other) */}
      <div className="relative aspect-square shrink-0 overflow-hidden rounded-2xl bg-[var(--surface-2)]">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt={creator.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl font-semibold text-white/10">
            {creator.name.charAt(0).toUpperCase()}
          </div>
        )}

        <Link href={href} className="absolute inset-0" aria-label={creator.name} />

        {/* Favouriting creators is a brand action — hidden from creators,
            signed-out visitors, and unsubscribed brands. */}
        {viewerRole === "brand" && !locked && (
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
      <div className="flex flex-1 flex-col pt-3">
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
        <div className="mt-3 flex flex-wrap items-center gap-x-7 gap-y-1.5 text-sm">
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

        {/* Subtle engagement signal — only when we have a meaningful figure. */}
        {engagement && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <span className="h-1 w-1 rounded-full bg-[var(--accent-2)]" />
            {engagement} avg. engagement
          </p>
        )}

        {/* Transparent per-service pricing — hidden from signed-out visitors
            and unsubscribed brands. */}
        {viewerRole !== null && !locked && services.length > 0 && (
          <div className="mt-5 space-y-1.5 border-t border-[var(--border)] pt-4">
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

        {/* Subscribed brand: book + chat. `mt-auto` pins the actions to the
            bottom, so buttons line up across a row however tall each card is. */}
        {viewerRole === "brand" && !locked && (
          <div className="mt-auto flex items-stretch gap-2 pt-6">
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

        {/* Unsubscribed brand: one full-width prompt to subscribe. The wrapper
            carries mt-auto + pt so the button never sits flush against the text
            above it, however full the card is. */}
        {viewerRole === "brand" && locked && (
          <div className="mt-auto pt-6">
            <Link
              href="/dashboard/brand"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-2)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9079f0]"
            >
              Subscribe to see more
            </Link>
          </div>
        )}

        {/* Signed-out: prompt to join (pricing + booking are gated). */}
        {viewerRole === null && (
          <div className="mt-auto pt-6">
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-2)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9079f0]"
            >
              Sign up to see pricing &amp; book
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
