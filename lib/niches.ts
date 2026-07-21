/**
 * Canonical list of popular UGC / creator niches. Used by the profile form and
 * the marketplace filter so the values stay consistent (no typos / duplicates).
 */
export const NICHES = [
  "Beauty & Makeup",
  "Skincare",
  "Fashion & Style",
  "Fitness & Gym",
  "Health & Wellness",
  "Food & Cooking",
  "Travel",
  "Lifestyle",
  "Home & Interior",
  "Parenting & Family",
  "Pets & Animals",
  "Tech & Gadgets",
  "Gaming",
  "Finance & Investing",
  "Business & Entrepreneurship",
  "Education & How-To",
  "Comedy & Entertainment",
  "Beauty Tech & Nails",
  "DIY & Crafts",
  "Sustainability",
  "Automotive",
  "Sports & Outdoors",
  "Music & Dance",
  "Art & Design",
] as const;

export type Niche = (typeof NICHES)[number];

/**
 * How many extra niches a creator may claim beyond their primary one.
 *
 * Capped deliberately: if everyone ticks all 24, the filter stops narrowing
 * anything and brands lose the one tool they use most. Five is enough for a
 * genuinely cross-over creator without letting anyone blanket the directory.
 */
export const MAX_SECONDARY_NICHES = 5;

/** Whether a value is one of our known niches (lets us keep legacy/free-text values too). */
export function isKnownNiche(value: string | null | undefined): value is Niche {
  return !!value && (NICHES as readonly string[]).includes(value);
}

/**
 * Clean up the secondary niches submitted with a profile form.
 *
 * Drops anything not on our fixed list, removes the primary niche so a creator
 * isn't counted twice for one category, de-duplicates, and enforces the cap.
 *
 * The validation is load-bearing, not cosmetic: these values end up
 * interpolated into the marketplace's PostgREST filter string, so only known
 * niches may ever reach it.
 */
export function sanitiseSecondaryNiches(
  values: string[],
  primary: string,
): Niche[] {
  const clean = values
    .map((v) => v.trim())
    .filter((v): v is Niche => isKnownNiche(v) && v !== primary);
  return [...new Set(clean)].slice(0, MAX_SECONDARY_NICHES);
}
