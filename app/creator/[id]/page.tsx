import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import {
  CREATOR_PROFILE_COLUMNS,
  getPortfolio,
  getFavoriteIds,
} from "@/lib/queries";
import { ServiceBooking } from "@/components/ServiceBooking";
import { MessageCreatorButton } from "@/components/MessageCreatorButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { InstagramIcon, TikTokIcon } from "@/components/SocialIcons";
import {
  formatFollowers,
  instagramUrl,
  tiktokUrl,
} from "@/lib/format";
import { offeredServices } from "@/lib/services";
import { genderLabel } from "@/lib/demographics";
import type { CreatorProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getCreator(id: string): Promise<CreatorProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_profiles")
    .select(CREATOR_PROFILE_COLUMNS)
    .eq("user_id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load creator:", error.message);
    return null;
  }
  return data;
}

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [creator, me, portfolio, favoriteIds] = await Promise.all([
    getCreator(id),
    getCurrentUser(),
    getPortfolio(id),
    getFavoriteIds(),
  ]);

  if (!creator) notFound();

  // Creators can't browse other creators (their own profile is fine).
  if (me?.role === "creator" && me.id !== id) redirect("/brands");

  const viewerRole = me?.role ?? null;
  const ig = formatFollowers(creator.instagram_followers);
  const tt = formatFollowers(creator.tiktok_followers);
  const services = offeredServices(creator).map((s) => ({
    key: s.def.key,
    label: s.def.label,
    unit: s.def.unit,
    rate: s.rate,
  }));
  const facts = [
    genderLabel(creator.gender),
    creator.age != null ? `${creator.age} yrs` : null,
    creator.country,
  ].filter(Boolean) as string[];

  return (
    <div>
      <main className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <Link
          href="/marketplace"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] underline-offset-4 hover:text-[var(--foreground)] hover:underline"
        >
          ← Back to creators
        </Link>

        {/* Header: image + key info */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-[260px_1fr]">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--surface-2)]">
            {creator.profile_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.profile_image}
                alt={creator.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-6xl font-bold text-[var(--foreground)]/20">
                {creator.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-h1 h-display font-bold text-[var(--foreground)]">
                {creator.name}
              </h1>
              <AvailabilityPill available={creator.availability} />
              <div className="ml-auto">
                <FavoriteButton
                  creatorId={creator.user_id}
                  initialFavorited={favoriteIds.has(creator.user_id)}
                  canFavorite={!!me}
                  variant="full"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {creator.niche && (
                <span className="inline-block rounded-full bg-[var(--surface-2)] px-3 py-1 text-sm text-[var(--muted)]">
                  {creator.niche}
                </span>
              )}
              {facts.map((f) => (
                <span
                  key={f}
                  className="inline-block rounded-full bg-[var(--surface-2)] px-3 py-1 text-sm text-[var(--muted)]"
                >
                  {f}
                </span>
              ))}
            </div>

            {creator.bio && (
              <p className="mt-4 text-[var(--muted)]">{creator.bio}</p>
            )}

            {/* Socials → external profiles, with follower counts */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              {creator.instagram && (
                <Social
                  icon={<InstagramIcon className="h-4 w-4" />}
                  href={instagramUrl(creator.instagram)}
                  handle={creator.instagram}
                  followers={ig}
                />
              )}
              {creator.tiktok && (
                <Social
                  icon={<TikTokIcon className="h-4 w-4" />}
                  href={tiktokUrl(creator.tiktok)}
                  handle={creator.tiktok}
                  followers={tt}
                />
              )}
            </div>

            {/* Transparent per-service booking */}
            <div className="mt-6">
              <ServiceBooking
                creatorId={creator.user_id}
                services={services}
                available={creator.availability}
                viewerRole={viewerRole}
              />
            </div>

            {viewerRole !== "creator" && (
              <div className="mt-3">
                <MessageCreatorButton
                  creatorId={creator.user_id}
                  viewerRole={viewerRole}
                  full
                />
              </div>
            )}
          </div>
        </div>

        {/* Portfolio */}
        {portfolio.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-5 text-xl font-semibold text-[var(--foreground)]">
              Portfolio
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {portfolio.map((item) => (
                <div
                  key={item.id}
                  className="aspect-[9/16] overflow-hidden rounded-xl bg-black"
                >                  <video
                    // #t=0.1 renders the first frame as the poster (no black box).
                    src={`${item.image_url}#t=0.1`}
                    className="h-full w-full object-cover"
                    controls
                    playsInline
                    preload="metadata"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function AvailabilityPill({ available }: { available: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        available
          ? "bg-emerald-400/12 text-emerald-300"
          : "bg-white/10 text-[var(--muted)]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          available ? "bg-emerald-500" : "bg-[var(--muted)]"
        }`}
      />
      {available ? "Available now" : "Currently booked"}
    </span>
  );
}

function Social({
  icon,
  href,
  handle,
  followers,
}: {
  icon: React.ReactNode;
  href: string;
  handle: string;
  followers: string | null;
}) {
  const clean = handle.replace(/^@/, "");
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[var(--muted)] transition-colors hover:border-[var(--accent-2)]/60 hover:text-[var(--foreground)]"
    >
      {icon}
      <span className="font-medium text-[var(--foreground)]">@{clean}</span>
      {followers && <span className="text-[var(--muted)]">· {followers}</span>}
    </a>
  );
}
