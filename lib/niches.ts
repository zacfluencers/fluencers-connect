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


/** Whether a value is one of our known niches (lets us keep legacy/free-text values too). */
export function isKnownNiche(value: string | null | undefined): value is Niche {
  return !!value && (NICHES as readonly string[]).includes(value);
}

/**
 * Clean up the secondary niches submitted with a profile form.
 *
 * Drops anything not on our fixed list, removes the primary niche so a creator
 * isn't counted twice for one category, and de-duplicates.
 *
 * There is deliberately no cap. Creators told us five felt limiting, and the
 * cap was never protecting the card - that only ever shows a count, so "+2
 * more" and "+19 more" cost the same space. What the cap protected was brand
 * search, and rankByNicheFocus() now does that job better: claiming every
 * niche gets you seen everywhere but never above a genuine specialist, so
 * there is nothing to gain by spamming.
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
  return [...new Set(clean)];
}

/**
 * Order filtered search results so the best fit comes first.
 *
 * A creator whose MAIN niche matches what the brand asked for ranks above one
 * who only matches on a secondary. This is what makes unlimited secondary
 * niches safe: breadth buys visibility, never rank, so a creator who ticks
 * everything lands at the bottom of every search they didn't specialise in.
 *
 * Relies on Array.prototype.sort being stable (guaranteed since ES2019), which
 * preserves the existing alphabetical order within each group.
 */
export function rankByNicheFocus<
  T extends { niche: string | null; secondary_niches?: string[] | null },
>(creators: T[], filtered: string[]): T[] {
  if (filtered.length === 0) return creators;
  const wanted = new Set(filtered);
  const rank = (c: T) => (c.niche && wanted.has(c.niche) ? 0 : 1);
  return [...creators].sort((a, b) => rank(a) - rank(b));
}
