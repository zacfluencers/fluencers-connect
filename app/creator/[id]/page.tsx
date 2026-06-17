import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { RequestBookingButton } from "@/components/RequestBookingButton";
import type { CreatorProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

async function getCreator(id: string): Promise<CreatorProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_profiles")
    .select(
      "user_id, name, bio, niche, instagram, tiktok, availability, price, profile_image",
    )
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
  const [creator, me] = await Promise.all([getCreator(id), getCurrentUser()]);

  if (!creator) notFound();

  const viewerRole = me?.role ?? null;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <Link
          href="/marketplace"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] underline-offset-4 hover:text-[var(--foreground)] hover:underline"
        >
          ← Back to creators
        </Link>

        {/* Header: image + key info */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-[260px_1fr]">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--foreground)]/5">
            {creator.profile_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.profile_image}
                alt={creator.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-[family-name:var(--font-display)] text-6xl font-bold text-[var(--foreground)]/20">
                {creator.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
                {creator.name}
              </h1>
              <AvailabilityPill available={creator.availability} />
            </div>

            {creator.niche && (
              <span className="mt-3 inline-block rounded-full bg-[var(--foreground)]/5 px-3 py-1 text-sm text-[var(--muted)]">
                {creator.niche}
              </span>
            )}

            {creator.bio && (
              <p className="mt-4 text-[var(--foreground)]/80">{creator.bio}</p>
            )}

            {/* Socials */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              {creator.instagram && (
                <Social label="Instagram" handle={creator.instagram} />
              )}
              {creator.tiktok && (
                <Social label="TikTok" handle={creator.tiktok} />
              )}
            </div>

            {/* Price + CTA */}
            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--foreground)]/10 p-5">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
                  Fixed price per job
                </p>
                <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--foreground)]">
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
        <section className="mt-14">
          <h2 className="mb-5 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
            Portfolio
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex aspect-[4/5] items-center justify-center rounded-xl border border-dashed border-[var(--foreground)]/15 bg-[var(--foreground)]/[0.03] text-sm text-[var(--muted)]"
              >
                Portfolio item {i + 1}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Portfolio media isn&apos;t in the database yet — these are
            placeholders, ready to wire up when the portfolio table is added.
          </p>
        </section>
      </main>
    </div>
  );
}

function AvailabilityPill({ available }: { available: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        available
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-[var(--foreground)]/10 text-[var(--muted)]"
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

function Social({ label, handle }: { label: string; handle: string }) {
  const clean = handle.replace(/^@/, "");
  return (
    <span className="text-[var(--muted)]">
      {label}:{" "}
      <span className="font-medium text-[var(--foreground)]">@{clean}</span>
    </span>
  );
}
