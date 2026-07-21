/**
 * The order creators appear in on the browse page.
 *
 * This used to be alphabetical, which carried no information at all: measured
 * on 21 Jul, the first 24 creators shown averaged a profile strength of 2.29
 * and the remaining 89 averaged 2.27. Identical. Of 41 genuinely strong
 * profiles, only 9 were visible before scrolling - the other 32 were buried
 * because of their name. It also handed a permanent advantage to anyone called
 * Aisha over anyone called Zoe, and on a marketplace being seen is income.
 *
 * Three levels, in order:
 *   1. Specialists first, when a niche filter is applied.
 *   2. Better-presented profiles above thin ones.
 *   3. A daily reshuffle between creators who tie.
 *
 * Level 3 is what stops level 2 becoming the new alphabet. Ties are extremely
 * common - strength is a 0-4 score across 117 people - so without it the same
 * faces would lead the page forever.
 */

import { isKnownNiche } from "@/lib/niches";

export interface RankableCreator {
  user_id: string;
  niche: string | null;
  bio?: string | null;
  engagement_rate?: number | null;
}

/**
 * How well presented a profile is, 0-4.
 *
 * Deliberately ignores photo, rates and follower counts: the profile form
 * requires all three, so every single creator has them and they separate
 * nobody. These are the signals that actually vary.
 *
 * Portfolio video is weighted double because it's the one thing a brand can
 * judge the work by, and the only one that takes real effort to produce.
 */
export function profileStrength(
  creator: RankableCreator,
  hasPortfolio: boolean,
): number {
  let score = 0;
  if (hasPortfolio) score += 2;
  if (creator.bio && creator.bio.trim().length > 20) score += 1;
  if (creator.engagement_rate != null) score += 1;
  return score;
}

/** UTC date stamp used to seed the daily shuffle. */
export function rotationDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * A stable pseudo-random position for one creator on one day (FNV-1a).
 *
 * Deterministic on purpose. A brand can scroll down, open a profile, come back
 * and find the page exactly as they left it - a genuinely random order would
 * reshuffle under them on every request and make the directory feel broken.
 */
export function rotationKey(creatorId: string, day: string): number {
  let hash = 0x811c9dc5;
  const input = `${day}:${creatorId}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

export function rankCreators<T extends RankableCreator>(
  creators: T[],
  opts: {
    /** Niches the brand filtered by, if any. */
    niches?: string[];
    /** IDs of creators who have at least one portfolio video. */
    portfolioIds?: Set<string>;
    /** Override the shuffle seed (tests). */
    day?: string;
  } = {},
): T[] {
  const day = opts.day ?? rotationDay();
  const portfolioIds = opts.portfolioIds ?? new Set<string>();
  // Widened to string: isKnownNiche narrows to the Niche union, but we look
  // up creator.niche, which is a plain nullable string from the database.
  const wanted = new Set<string>((opts.niches ?? []).filter(isKnownNiche));

  // With no filter every creator ties here, so ranking falls through to
  // strength - which is what the unfiltered browse page wants.
  const nicheRank = (c: T) =>
    wanted.size === 0 || (c.niche && wanted.has(c.niche)) ? 0 : 1;

  return [...creators].sort((a, b) => {
    const byNiche = nicheRank(a) - nicheRank(b);
    if (byNiche !== 0) return byNiche;

    const byStrength =
      profileStrength(b, portfolioIds.has(b.user_id)) -
      profileStrength(a, portfolioIds.has(a.user_id));
    if (byStrength !== 0) return byStrength;

    return rotationKey(a.user_id, day) - rotationKey(b.user_id, day);
  });
}
