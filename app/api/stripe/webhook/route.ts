import type Stripe from "stripe";
import { stripe, isStripeConfigured } from "@/lib/stripe/server";
import { ensureBookingForSession } from "@/lib/stripe/escrow";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Secret-free log line for a webhook event. Only the event type + id are ever
 * logged — never the raw body, signature, keys, metadata, or customer PII.
 */
function log(event: Stripe.Event, note?: string) {
  console.log(
    `[stripe webhook] ${event.type} (${event.id})${note ? ` — ${note}` : ""}`,
  );
}

// Stripe requires the *raw* request body to verify the signature, so we read
// req.text() and never parse it before constructEvent().
export async function POST(req: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await req.text(); // raw body — do not JSON.parse before verifying
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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        // Source of truth for creating the (paid) booking.
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== "paid") {
          log(event, `ignored (payment_status=${session.payment_status})`);
          break;
        }
        const bookingId = await ensureBookingForSession({
          id: session.id,
          payment_intent: session.payment_intent,
          metadata: session.metadata,
        });
        // The customer has paid — if we couldn't record the booking, fail the
        // webhook so Stripe retries rather than losing the paid booking.
        if (!bookingId) {
          log(event, "could not record booking — asking Stripe to retry");
          return new Response("Could not record booking", { status: 500 });
        }
        log(event, `booking ${bookingId} recorded`);
        break;
      }

      case "account.updated": {
        // Keep creator payout-readiness in sync (drives escrow release).
        const account = event.data.object as Stripe.Account;
        const enabled =
          Boolean(account.payouts_enabled) &&
          account.capabilities?.transfers === "active";
        await createAdminClient()
          .from("creator_profiles")
          .update({ payouts_enabled: enabled })
          .eq("stripe_account_id", account.id);
        log(event, `payouts_enabled=${enabled}`);
        break;
      }

      case "payment_intent.payment_failed": {
        // Bookings are only created *after* a successful payment, so a failed
        // intent usually has no booking to touch. Log for visibility.
        const pi = event.data.object as Stripe.PaymentIntent;
        const reason = pi.last_payment_error?.message ?? "unknown reason";
        log(event, `payment failed for intent ${pi.id}: ${reason}`);
        break;
      }

      case "charge.refunded": {
        // Reconcile refunds — including any issued directly in the Stripe
        // dashboard. App-initiated refunds already set 'refunded', so we only
        // touch bookings still holding escrow (idempotent).
        const charge = event.data.object as Stripe.Charge;
        const piId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : null;
        if (!piId) {
          log(event, "no payment_intent on charge — nothing to reconcile");
          break;
        }
        const patch: {
          status: string;
          payment_status: string;
          stripe_refund_id?: string;
        } = { status: "refunded", payment_status: "refunded" };
        const refundId = charge.refunds?.data?.[0]?.id;
        if (refundId) patch.stripe_refund_id = refundId;

        const { data: updated } = await createAdminClient()
          .from("bookings")
          .update(patch)
          .eq("stripe_payment_intent_id", piId)
          .eq("payment_status", "held")
          .select("id");
        log(
          event,
          updated?.length
            ? `reconciled booking ${updated[0].id} as refunded`
            : "no held booking to reconcile (already refunded or released)",
        );
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // Subscriptions / Stripe Billing aren't implemented yet. Acknowledge so
        // Stripe stops retrying, but take no action.
        log(event, "subscription event received — no billing handler yet");
        break;
      }

      default:
        log(event, "unhandled event type");
        break;
    }
  } catch (e) {
    // Unexpected handler failure (e.g. a transient DB error) — ask Stripe to
    // retry by returning a 5xx. The message is generic; details go to logs.
    const msg = e instanceof Error ? e.message : "handler error";
    console.error(
      `[stripe webhook] error handling ${event.type} (${event.id}): ${msg}`,
    );
    return new Response("Handler error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
