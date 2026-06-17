import type Stripe from "stripe";
import { stripe, isStripeConfigured } from "@/lib/stripe/server";
import { ensureBookingForSession } from "@/lib/stripe/escrow";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe needs the raw body for signature verification.
export async function POST(req: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid signature";
    return new Response(`Webhook error: ${msg}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      // Source of truth for creating the (paid) booking.
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid") {
        await ensureBookingForSession({
          id: session.id,
          payment_intent: session.payment_intent,
          metadata: session.metadata,
        });
      }
      break;
    }

    case "account.updated": {
      // Keep creator payout-readiness in sync.
      const account = event.data.object as Stripe.Account;
      const enabled =
        Boolean(account.payouts_enabled) &&
        account.capabilities?.transfers === "active";
      await createAdminClient()
        .from("creator_profiles")
        .update({ payouts_enabled: enabled })
        .eq("stripe_account_id", account.id);
      break;
    }

    default:
      break;
  }

  return new Response(null, { status: 200 });
}
