import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import {
  CREATOR_PROFILE_COLUMNS,
  getPortfolio,
  getFavoriteIds,
} from "@/lib/queries";
import { RequestBookingButton } from "@/components/RequestBookingButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { gbp, formatFollowers } from "@/lib/format";
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

  const viewerRole = me?.role ?? null;
  const ig = formatFollowers(creator.instagram_followers);
  const tt = formatFollowers(creator.tiktok_followers);

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

            {creator.niche && (
              <span className="mt-3 inline-block rounded-full bg-[var(--surface-2)] px-3 py-1 text-sm text-[var(--muted)]">
                {creator.niche}
              </span>
            )}

            {creator.bio && (
              <p className="mt-4 text-[var(--muted)]">{creator.bio}</p>
            )}

            {/* Socials + follower counts */}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {creator.instagram && (
                <Social label="Instagram" handle={creator.instagram} followers={ig} />
              )}
              {creator.tiktok && (
                <Social label="TikTok" handle={creator.tiktok} followers={tt} />
              )}
            </div>

            {/* Price + CTA */}
            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--border)] p-5">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
                  Fixed price per job
                </p>
                <p className="text-2xl font-bold text-[var(--foreground)]">
                  {gbp.format(creator.price)}
                </p>
              </div>
              <RequestBookingButton
                creatorId={creator.user_id}
                available={creator.availability}
                viewerRole={viewerRole}
              />
            </div>
          </div>
        </div>

        {/* Portfolio */}
        {portfolio.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-5 text-xl font-semibold text-[var(--foreground)]">
              Portfolio
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {portfolio.map((item) => (
                <div
                  key={item.id}
                  className="aspect-square overflow-hidden rounded-xl bg-[var(--surface-2)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt="Portfolio work"
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
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
  label,
  handle,
  followers,
}: {
  label: string;
  handle: string;
  followers: string | null;
}) {
  const clean = handle.replace(/^@/, "");
  return (
    <span className="text-[var(--muted)]">
      {label}:{" "}
      <span className="font-medium text-[var(--foreground)]">@{clean}</span>
      {followers && (
        <span className="ml-1.5 text-[var(--muted)]">· {followers} followers</span>
      )}
    </span>
  );
}
