/**
 * Brand subscription plans (pure config — safe to import from client code).
 *
 * Each plan resolves its Stripe Price at runtime via a *lookup key* env var, so
 * the code never hardcodes price IDs. To add another plan later: add an entry
 * here with its own lookup-key env var, set that var in the environment, and it
 * automatically appears in the checkout action + billing UI.
 */
export const BRAND_PLANS = {
  weekly: {
    key: "weekly",
    label: "Weekly",
    lookupEnv: "STRIPE_PRICE_BRAND_WEEKLY_LOOKUP_KEY",
    blurb: "Flexible, pay-as-you-go access.",
  },
  annual: {
    key: "annual",
    label: "Annual",
    lookupEnv: "STRIPE_PRICE_BRAND_ANNUAL_LOOKUP_KEY",
    blurb: "Best value - one payment for the year.",
  },
} as const;

export type BrandPlanKey = keyof typeof BRAND_PLANS;

export const BRAND_PLAN_KEYS = Object.keys(BRAND_PLANS) as BrandPlanKey[];

/**
 * A plan as shown to the brand (label + resolved price text). Client-safe, so
 * both the dashboard panel and the subscribe popup can share the shape without
 * pulling in the Stripe SDK.
 */
export interface BrandPlanDisplay {
  key: BrandPlanKey;
  label: string;
  blurb: string;
  /** Human label like "£19 / week" or "£299 / year". */
  priceLabel: string;
}

/**
 * What a brand unlocks by subscribing - the single source of truth for the
 * selling points shown in the popup, the welcome page and the nudge banners.
 */
export const BRAND_SUBSCRIBER_BENEFITS = [
  "Book any creator at their listed price",
  "Message creators directly",
  "Save creators to shortlists",
  "List your brand so creators come to you",
] as const;

/** Subscription statuses that count as "the brand currently has a plan". */
export const ACTIVE_SUB_STATUSES = ["active", "trialing", "past_due"];

export function isSubscribed(status: string | null | undefined): boolean {
  return Boolean(status && ACTIVE_SUB_STATUSES.includes(status));
}
