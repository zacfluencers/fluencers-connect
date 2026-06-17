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
