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
export function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
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
