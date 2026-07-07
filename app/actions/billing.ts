"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/session";
import { stripe, isStripeConfigured, getBaseUrl } from "@/lib/stripe/server";
import {
  getBrandPlanPrice,
  subscriptionToRow,
  upsertBrandBilling,
} from "@/lib/stripe/billing";
import { BRAND_PLANS, type BrandPlanKey } from "@/lib/billing-plans";

type ActionResult = { error: string } | void;

/**
 * Start a brand subscription via Stripe Checkout in SUBSCRIPTION mode, for the
 * chosen plan (weekly or annual). The price is resolved from the plan's lookup
 * key, so we never hardcode a price ID here.
 */
export async function createBrandSubscriptionCheckout(
  plan: BrandPlanKey,
): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "brand") return { error: "Only brands can subscribe." };
  if (!isStripeConfigured()) return { error: "Billing isn't set up yet." };
  if (!BRAND_PLANS[plan]) return { error: "Unknown plan." };

  const price = await getBrandPlanPrice(plan);
  if (!price) {
    return { error: "That plan isn't available right now. Please try again soon." };
  }

  const supabase = await createClient();
  // Reuse an existing Stripe customer if this brand has subscribed before.
  const { data: billing } = await supabase
    .from("brand_billing")
    .select("stripe_customer_id")
    .eq("user_id", me.id)
    .maybeSingle();

  const base = getBaseUrl();
  let url: string | null = null;
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: price.id, quantity: 1 }],
      ...(billing?.stripe_customer_id
        ? { customer: billing.stripe_customer_id }
        : { customer_email: me.email }),
      client_reference_id: me.id,
      // Carry the brand's user id + plan onto the subscription so the webhook's
      // customer.subscription.* events can map back to the right brand.
      subscription_data: { metadata: { user_id: me.id, plan } },
      metadata: { user_id: me.id, plan },
      success_url: `${base}/dashboard/brand?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/dashboard/brand?subscription=cancelled`,
    });
    url = session.url;
  } catch (e) {
    console.error("[stripe subscription] checkout failed:", e instanceof Error ? e.message : e);
    return { error: "We couldn't reach the payment provider. Please try again in a moment." };
  }
  if (!url) return { error: "Could not start checkout." };
  redirect(url);
}

/** Open the Stripe billing portal so a brand can manage or cancel their plan. */
export async function createBillingPortalSession(): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "brand") return { error: "Only brands have billing." };
  if (!isStripeConfigured()) return { error: "Billing isn't set up yet." };

  const supabase = await createClient();
  const { data: billing } = await supabase
    .from("brand_billing")
    .select("stripe_customer_id")
    .eq("user_id", me.id)
    .maybeSingle();
  if (!billing?.stripe_customer_id) return { error: "No subscription found yet." };

  const base = getBaseUrl();
  let url: string | null = null;
  try {
    const portal = await stripe().billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: `${base}/dashboard/brand`,
    });
    url = portal.url;
  } catch (e) {
    console.error("[stripe billing portal] failed:", e instanceof Error ? e.message : e);
    return { error: "We couldn't reach the payment provider. Please try again in a moment." };
  }
  redirect(url);
}

/**
 * Sync a brand's subscription from the Checkout Session on return. The webhook
 * is the source of truth, but this makes the dashboard reflect a brand-new
 * subscription immediately without waiting on webhook delivery.
 */
export async function syncBrandSubscriptionFromSession(
  sessionId: string,
): Promise<void> {
  if (!isStripeConfigured() || !isAdminConfigured()) return;
  const me = await getCurrentUser();
  if (!me || me.role !== "brand") return;

  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    // Only sync a session that belongs to the signed-in brand.
    if (session.client_reference_id && session.client_reference_id !== me.id) return;

    const sub = session.subscription;
    if (sub && typeof sub !== "string") {
      await upsertBrandBilling(me.id, subscriptionToRow(sub));
    } else if (typeof session.customer === "string") {
      await upsertBrandBilling(me.id, { stripe_customer_id: session.customer });
    }
  } catch (e) {
    console.error("[stripe subscription] session sync failed:", e instanceof Error ? e.message : e);
  }
}
