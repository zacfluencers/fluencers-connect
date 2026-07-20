import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MessageBrandButton } from "@/components/MessageBrandButton";
import { BrandFavoriteButton } from "@/components/BrandFavoriteButton";
import { InstagramIcon, TikTokIcon } from "@/components/SocialIcons";
import { gbp, instagramUrl, tiktokUrl, sizedImage } from "@/lib/format";
import type { BrandProfile } from "@/lib/types";

export function BrandCard({
  brand,
  canMessage,
  canFavorite = false,
  initialFavorited = false,
  official = false,
}: {
  brand: BrandProfile;
  canMessage: boolean;
  canFavorite?: boolean;
  initialFavorited?: boolean;
  /** Platform's own account - marks the card with an "Official admin" badge. */
  official?: boolean;
}) {
  const budget =
    brand.budget_min != null && brand.budget_max != null
      ? `${gbp.format(brand.budget_min)}-${gbp.format(brand.budget_max)}`
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
    <Card className="flex flex-col p-6">
      {/* Logo + name (+ save) */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {brand.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sizedImage(brand.logo_url, 44) ?? brand.logo_url}
              alt={brand.company_name}
              loading="lazy"
              decoding="async"
              className="h-11 w-11 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-base font-semibold text-white">
              {brand.company_name.charAt(0).toUpperCase()}
            </span>
          )}
          <Link
            href={`/brand/${brand.user_id}`}
            className="truncate text-h3 font-semibold text-[var(--foreground)] hover:underline"
          >
            {brand.company_name}
          </Link>
        </div>
        {canFavorite && (
          <BrandFavoriteButton
            brandId={brand.user_id}
            initialFavorited={initialFavorited}
          />
        )}
      </div>

      {/* Status badges on their own row so long names never collide with them,
          and wrapping so a narrow card stacks them instead of overflowing. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone="info">Looking for creators</Badge>
        {official && <Badge tone="active">Official admin</Badge>}
      </div>

      {brand.about && (
        <p className="mt-4 line-clamp-3 text-sm text-[var(--muted)]">
          {brand.about}
        </p>
      )}

      {budget && (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Budget{" "}
          <span className="font-semibold text-[var(--foreground)]">{budget}</span>{" "}
          / job
        </p>
      )}

      {/* Website + socials */}
      {(websiteHref || brand.instagram || brand.tiktok) && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {websiteHref && (
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              <GlobeIcon />
              Website
            </a>
          )}
          {brand.instagram && (
            <a
              href={instagramUrl(brand.instagram)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              <InstagramIcon className="h-4 w-4" />
              Instagram
            </a>
          )}
          {brand.tiktok && (
            <a
              href={tiktokUrl(brand.tiktok)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              <TikTokIcon className="h-4 w-4" />
              TikTok
            </a>
          )}
        </div>
      )}

      {canMessage && (
        <div className="mt-5">
          <MessageBrandButton brandId={brand.user_id} />
        </div>
      )}
    </Card>
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
