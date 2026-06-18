/**
 * Shared option lists for creator attributes + marketplace filters, so the
 * profile form and the filter bar always agree on the exact same values.
 */

export const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Other" },
] as const;

export type Gender = (typeof GENDERS)[number]["value"];

export function genderLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return GENDERS.find((g) => g.value === value)?.label ?? value;
}

/** Common markets first, then the rest alphabetically. Stored as the label. */
export const COUNTRIES = [
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "Ireland",
  "France",
  "Germany",
  "Italy",
  "Spain",
  "Netherlands",
  "Sweden",
  "Norway",
  "Denmark",
  "Portugal",
  "Belgium",
  "Switzerland",
  "Austria",
  "Poland",
  "United Arab Emirates",
  "Saudi Arabia",
  "India",
  "Singapore",
  "New Zealand",
  "South Africa",
  "Brazil",
  "Mexico",
  "Japan",
  "South Korea",
] as const;

/** Slider bounds used across filters + profile inputs. */
export const AGE_MIN = 18;
export const AGE_MAX = 65;
export const RATE_MAX = 5000; // £
export const FOLLOWERS_MAX = 1_000_000;
