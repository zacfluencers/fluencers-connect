import Stripe from "stripe";

/** Lazily-built Stripe client. SERVER-ONLY. */
let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured (missing STRIPE_SECRET_KEY).");
  }
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Absolute base URL for building Stripe redirect/return URLs. */
/**
 * The origin to build outward-facing links from: Stripe return URLs, email
 * links, anything a person will actually click.
 *
 * Order matters, and the middle entry is the lesson from 21 Jul. This used to
 * fall straight back to VERCEL_URL, which is the *generated* deployment
 * address (fluencers-connect.vercel.app) rather than the real domain. With
 * NEXT_PUBLIC_SITE_URL stale, every Stripe payout link and confirmation email
 * pointed at a hostname where the visitor has no session - silently, for 35
 * days.
 *
 * VERCEL_PROJECT_PRODUCTION_URL is Vercel's own answer to this: it resolves to
 * the shortest production CUSTOM domain, so the fallback now lands somewhere
 * people are actually signed in. VERCEL_URL is kept last, where it only serves
 * preview deployments - which is the one place it's correct.
 */
export function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Optional platform fee in basis points (e.g. 1000 = 10%). Default 0. */
export function platformFeeBps() {
  const n = Number(process.env.PLATFORM_FEE_BPS ?? "0");
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

/** GBP pounds → integer pence. */
export function toPence(pounds: number) {
  return Math.round(pounds * 100);
}
