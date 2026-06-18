import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBrandProfile, getFavoriteBrandIds } from "@/lib/queries";
import { MessageBrandButton } from "@/components/MessageBrandButton";
import { BrandFavoriteButton } from "@/components/BrandFavoriteButton";
import { InstagramIcon, TikTokIcon } from "@/components/SocialIcons";
import { Badge } from "@/components/ui/Badge";
import { gbp, instagramUrl, tiktokUrl } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [brand, me, favoriteBrandIds] = await Promise.all([
    getBrandProfile(id),
    getCurrentUser(),
    getFavoriteBrandIds(),
  ]);
  if (!brand) notFound();

  const budget =
    brand.budget_min != null && brand.budget_max != null
      ? `${gbp.format(brand.budget_min)}–${gbp.format(brand.budget_max)}`
      : brand.budget_max != null
        ? `up to ${gbp.format(brand.budget_max)}`
        : brand.budget_min != null
          ? `from ${gbp.format(brand.budget_min)}`
          : null;

  const websiteHref = brand.website
    ? /^https?:\/\//i.test(brand.website)
      ? brand.website
      : `https://${brand.website}`
    : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
      <Link
        href="/brands"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] underline-offset-4 hover:text-[var(--foreground)] hover:underline"
      >
        ← Back to brands
      </Link>

      <div className="flex flex-wrap items-start gap-5">
        {brand.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logo_url}
            alt={brand.company_name}
            className="h-20 w-20 shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-2xl font-bold text-white">
            {brand.company_name.charAt(0).toUpperCase()}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-h1 h-display font-bold text-[var(--foreground)]">
            {brand.company_name}
          </h1>
          {brand.looking_for_creators && (
            <div className="mt-2">
              <Badge tone="info">Looking for creators</Badge>
            </div>
          )}
        </div>

        {me?.role === "creator" && (
          <BrandFavoriteButton
            brandId={brand.user_id}
            initialFavorited={favoriteBrandIds.has(brand.user_id)}
            variant="full"
          />
        )}
      </div>

      {brand.about && (
        <p className="mt-6 whitespace-pre-line text-[var(--muted)]">{brand.about}</p>
      )}

      {budget && (
        <p className="mt-5 text-[var(--muted)]">
          Budget{" "}
          <span className="font-semibold text-[var(--foreground)]">{budget}</span>{" "}
          / job
        </p>
      )}

      {(websiteHref || brand.instagram || brand.tiktok) && (
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          {websiteHref && (
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[var(--muted)] transition-colors hover:border-[var(--accent-2)]/60 hover:text-[var(--foreground)]"
            >
              <GlobeIcon /> Website
            </a>
          )}
          {brand.instagram && (
            <a
              href={instagramUrl(brand.instagram)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[var(--muted)] transition-colors hover:border-[var(--accent-2)]/60 hover:text-[var(--foreground)]"
            >
              <InstagramIcon className="h-4 w-4" /> Instagram
            </a>
          )}
          {brand.tiktok && (
            <a
              href={tiktokUrl(brand.tiktok)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[var(--muted)] transition-colors hover:border-[var(--accent-2)]/60 hover:text-[var(--foreground)]"
            >
              <TikTokIcon className="h-4 w-4" /> TikTok
            </a>
          )}
        </div>
      )}

      {me?.role === "creator" && (
        <div className="mt-8">
          <MessageBrandButton brandId={brand.user_id} size="md" />
        </div>
      )}
    </main>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18" />
    </svg>
  );
}
