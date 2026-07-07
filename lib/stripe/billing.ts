import type Stripe from "stripe";
import { stripe, isStripeConfigured } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BRAND_PLANS, type BrandPlanKey } from "@/lib/billing-plans";

/**
 * Resolve a Stripe Price from a lookup key (preferred — decouples the code from
 * specific price IDs). For convenience a raw `price_…` id is also accepted, so
 * the env var can hold either the price's lookup key or its id.
 */
async function resolvePrice(value: string | undefined): Promise<Stripe.Price | null> {
  if (!value || !isStripeConfigured()) return null;
  if (value.startsWith("price_")) {
    try {
      return await stripe().prices.retrieve(value, { expand: ["product"] });
    } catch {
      return null;
    }
  }
  const res = await stripe().prices.list({
    lookup_keys: [value],
    active: true,
    expand: ["data.product"],
    limit: 1,
  });
  return res.data[0] ?? null;
}

/** The Stripe Price for a brand plan, via its lookup-key env var. */
export function getBrandPlanPrice(plan: BrandPlanKey): Promise<Stripe.Price | null> {
  return resolvePrice(process.env[BRAND_PLANS[plan].lookupEnv]);
}

export interface BrandPlanOption {
  key: BrandPlanKey;
  label: string;
  blurb: string;
  priceId: string;
  /** Human label like "£299 / year" or "£19 / week". */
  priceLabel: string;
}

/** All configured brand plans (skips any whose price can't be resolved). */
export async function getBrandPlanOptions(): Promise<BrandPlanOption[]> {
  const keys = Object.keys(BRAND_PLANS) as BrandPlanKey[];
  const resolved = await Promise.all(
    keys.map(async (key): Promise<BrandPlanOption | null> => {
      const price = await getBrandPlanPrice(key);
      if (!price || price.unit_amount == null) return null;
      return {
        key,
        label: BRAND_PLANS[key].label,
        blurb: BRAND_PLANS[key].blurb,
        priceId: price.id,
        priceLabel: formatPrice(price),
      };
    }),
  );
  return resolved.filter((p): p is BrandPlanOption => p !== null);
}

/** "£299 / year" from a recurring Stripe price. */
function formatPrice(price: Stripe.Price): string {
  const amount = (price.unit_amount ?? 0) / 100;
  const currency = (price.currency ?? "gbp").toUpperCase();
  const nf = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  });
  const interval = price.recurring?.interval;
  return interval ? `${nf.format(amount)} / ${interval}` : nf.format(amount);
}

/** True when Stripe + at least one plan lookup key are configured. */
export function isBrandBillingConfigured(): boolean {
  if (!isStripeConfigured()) return false;
  return (Object.keys(BRAND_PLANS) as BrandPlanKey[]).some(
    (k) => Boolean(process.env[BRAND_PLANS[k].lookupEnv]),
  );
}

// ---------------------------------------------------------------------------
// Server-side writes to brand_billing (service role — bypasses RLS). Used by
// the Stripe webhook and the on-return sync. Brands can never write this table.
// ---------------------------------------------------------------------------

export interface BrandBillingRow {
  stripe_customer_id?: string | null;
  status?: string | null;
  price_id?: string | null;
  plan?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
}

/** Map a Stripe Subscription to our brand_billing columns. */
export function subscriptionToRow(sub: Stripe.Subscription): BrandBillingRow {
  const item = sub.items.data[0];
  // `current_period_end` lives on the subscription in most API versions and on
  // the item in newer ones — read whichever is present.
  const periodEnd =
    (sub as { current_period_end?: number }).current_period_end ??
    (item as { current_period_end?: number } | undefined)?.current_period_end ??
    null;
  return {
    stripe_customer_id:
      typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    status: sub.status,
    price_id: item?.price.id ?? null,
    plan: (sub.metadata?.plan as string | undefined) ?? null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
  };
}

/** Upsert a brand's billing row (service role). */
export async function upsertBrandBilling(
  userId: string,
  row: BrandBillingRow,
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("brand_billing").upsert(
    { user_id: userId, ...row, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
}
