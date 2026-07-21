/**
 * Canonical list of popular UGC / creator niches. Used by the profile form and
 * the marketplace filter so the values stay consistent (no typos / duplicates).
 */
export const NICHES = [
  // Fitness, health and sport stay as three separate options even though they
  // overlap: that's where most of the roster sits, so it's the one area where
  // brands need to tell creators apart. Condensing happened in the long tail.
  "Fitness & Gym",
  "Health & Wellness",
  "Sports & Outdoors",
  "Food & Cooking",
  "Beauty & Skincare",
  "Fashion & Style",
  "Lifestyle",
  "Travel",
  "Home & Interior",
  "Parenting & Family",
  "Pets & Animals",
  "Business & Finance",
  "Tech & Gaming",
  "Entertainment & Music",
  "Art, Design & DIY",
  "Education & How-To",
  "Automotive",
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

// Result ordering (niche focus, profile strength, daily rotation) lives in
// lib/creator-ranking.ts — it's one comparator, because sorting by each
// dimension separately would let a later pass undo an earlier one.
