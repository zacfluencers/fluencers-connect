import type { SanityImageSource } from "@sanity/image-url";
import { isSanityConfigured } from "@/lib/sanity/client";
import { sanityFetch } from "@/lib/sanity/live";

/** A title/body pair used by the steps + value bullets. */
export interface TitleBody {
  title?: string | null;
  body?: string | null;
}

/** One "trusted by" logo (image optional — falls back to the name). */
export interface BrandLogo {
  name?: string | null;
  image?: SanityImageSource | null;
}

/** The editable homepage content (all fields optional — the page has fallbacks). */
export interface HomepageContent {
  heroEyebrow?: string | null;
  heroHeadline?: string | null;
  heroHeadlineAccent?: string | null;
  heroSubheadline?: string | null;
  heroPrimaryCtaLabel?: string | null;
  heroSecondaryCtaLabel?: string | null;
  trustedByLabel?: string | null;
  trustedByLogos?: BrandLogo[] | null;
  howEyebrow?: string | null;
  howHeading?: string | null;
  howSubheading?: string | null;
  steps?: TitleBody[] | null;
  bothEyebrow?: string | null;
  bothHeading?: string | null;
  brandCardTitle?: string | null;
  brandValues?: TitleBody[] | null;
  creatorCardTitle?: string | null;
  creatorValues?: TitleBody[] | null;
  finalHeading?: string | null;
  finalSubheading?: string | null;
}

const HOMEPAGE_QUERY = `*[_type == "homepage"][0]{
  heroEyebrow, heroHeadline, heroHeadlineAccent, heroSubheadline,
  heroPrimaryCtaLabel, heroSecondaryCtaLabel, trustedByLabel,
  trustedByLogos[]{name, image},
  howEyebrow, howHeading, howSubheading,
  steps[]{title, body},
  bothEyebrow, bothHeading,
  brandCardTitle, brandValues[]{title, body},
  creatorCardTitle, creatorValues[]{title, body},
  finalHeading, finalSubheading
}`;

/**
 * Fetch the editable homepage content. Returns null (→ built-in fallbacks) when
 * Sanity isn't configured or the fetch fails — the landing page never breaks.
 */
export async function getHomepageContent(): Promise<HomepageContent | null> {
  if (!isSanityConfigured) return null;
  try {
    const { data } = await sanityFetch({ query: HOMEPAGE_QUERY });
    return (data as HomepageContent) ?? null;
  } catch (err) {
    console.error("[sanity] homepage fetch failed:", err);
    return null;
  }
}
