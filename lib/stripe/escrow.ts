import { stripe, isStripeConfigured, platformFeeBps, toPence } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: true } | { error: string };

/**
 * Idempotently create the booking for a paid Checkout Session.
 * Called from the webhook (source of truth) and the success page (fast path).
 */
export async function ensureBookingForSession(
  session: { id: string; payment_intent: unknown; metadata: Record<string, string> | null },
): Promise<string | null> {
  const admin = createAdminClient();

  const existing = await admin
    .from("bookings")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();
  if (existing.data) return existing.data.id;

  const meta = session.metadata ?? {};
  const brandId = meta.brand_id;
  const creatorId = meta.creator_id;
  const price = Number(meta.price);
  const service = ["ugc", "event", "broll"].includes(meta.service)
    ? meta.service
    : null;
  if (!brandId || !creatorId || !Number.isFinite(price)) return null;

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  const inserted = await admin
    .from("bookings")
    .insert({
      brand_id: brandId,
      creator_id: creatorId,
      price,
      service_type: service,
      status: "requested",
      payment_status: "held",
      stripe_payment_intent_id: paymentIntentId,
      stripe_checkout_session_id: session.id,
    })
    .select("id")
    .maybeSingle();
  if (inserted.data) return inserted.data.id;

  // Race (unique session index) — re-read.
  const retry = await admin
    .from("bookings")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();
  return retry.data?.id ?? null;
}

/** Release escrow to the creator (transfer), or just complete if unpaid/no Stripe. */
export async function releaseEscrow(bookingId: string): Promise<Result> {
  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, creator_id, price, payment_status, stripe_payment_intent_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { error: "Booking not found." };

  // Nothing held (legacy/unpaid or Stripe off) — just mark completed.
  if (booking.payment_status !== "held" || !isStripeConfigured()) {
    await admin.from("bookings").update({ status: "completed" }).eq("id", bookingId);
    return { ok: true };
  }

  const { data: creator } = await admin
    .from("creator_profiles")
    .select("stripe_account_id, payouts_enabled")
    .eq("user_id", booking.creator_id)
    .maybeSingle();
  if (!creator?.stripe_account_id || !creator.payouts_enabled) {
    return {
      error: "The creator hasn't finished payout setup, so funds can't be released yet.",
    };
  }

  try {
    const pi = await stripe().paymentIntents.retrieve(
      booking.stripe_payment_intent_id!,
    );
    const chargeId =
      typeof pi.latest_charge === "string" ? pi.latest_charge : undefined;

    const gross = toPence(Number(booking.price));
    const fee = Math.round((gross * platformFeeBps()) / 10000);
    const transfer = await stripe().transfers.create({
      amount: gross - fee,
      currency: "gbp",
      destination: creator.stripe_account_id,
      transfer_group: bookingId,
      ...(chargeId ? { source_transaction: chargeId } : {}),
    });

    await admin
      .from("bookings")
      .update({
        status: "completed",
        payment_status: "released",
        stripe_transfer_id: transfer.id,
      })
      .eq("id", bookingId);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not release funds." };
  }
}

/** Refund escrow to the brand and move the booking to `newStatus`. */
export async function refundEscrow(
  bookingId: string,
  newStatus: "declined" | "refunded",
): Promise<Result> {
  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, payment_status, stripe_payment_intent_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { error: "Booking not found." };

  if (booking.payment_status !== "held" || !isStripeConfigured()) {
    await admin.from("bookings").update({ status: newStatus }).eq("id", bookingId);
    return { ok: true };
  }

  try {
    const refund = await stripe().refunds.create({
      payment_intent: booking.stripe_payment_intent_id!,
    });
    await admin
      .from("bookings")
      .update({
        status: newStatus,
        payment_status: "refunded",
        stripe_refund_id: refund.id,
      })
      .eq("id", bookingId);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not refund." };
  }
}
