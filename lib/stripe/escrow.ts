import { stripe, isStripeConfigured, platformFeeBps, toPence } from "@/lib/stripe/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notifications";
import { serviceLabel, isServiceType } from "@/lib/services";
import { gbp } from "@/lib/format";

type Result = { ok: true } | { error: string };

/**
 * The escrow writes normally use the service-role client (trusted, bypasses
 * RLS). When that key isn't configured (e.g. local/demo with no Stripe), fall
 * back to the acting user's session — RLS still lets a booking party read and
 * update their own booking, which is all the no-Stripe path needs.
 */
async function escrowDb() {
  return isAdminConfigured() ? createAdminClient() : await createClient();
}

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
  const service = isServiceType(meta.service) ? meta.service : null;
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
  if (inserted.data) {
    // Alert the creator of the new paid request.
    const brandName =
      (await admin.from("brand_profiles").select("company_name").eq("user_id", brandId).maybeSingle()).data?.company_name ?? "A brand";
    const svc = serviceLabel(service);
    await notify(admin, {
      userId: creatorId,
      type: "booking_request",
      title: `New booking request from ${brandName}`,
      body: svc ? `${svc} · paid into escrow` : "Paid into escrow",
      link: `/bookings/${inserted.data.id}`,
    });
    return inserted.data.id;
  }

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
  const admin = await escrowDb();
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
  // The creator can't receive money yet. The brand's side is finished though,
  // so complete the booking and mark the money owed rather than failing the
  // approval - blocking a brand on someone else's paperwork left the job stuck
  // in review with nobody told. The funds are already captured and sitting on
  // the platform balance, so nothing is at risk while we wait.
  if (!creator?.stripe_account_id || !creator.payouts_enabled) {
    await admin
      .from("bookings")
      .update({ status: "completed", payment_status: "pending_payout" })
      .eq("id", bookingId);

    await notify(admin, {
      userId: booking.creator_id,
      type: "booking",
      title: `${gbp.format(Number(booking.price))} is waiting for you`,
      body: "Your work was approved. Finish payout setup to receive it.",
      link: "/dashboard/creator",
    });
    return { ok: true };
  }

  return transferToCreator(bookingId);
}

/**
 * Move a completed booking's money to the creator.
 *
 * Split out because three different things can trigger it - the brand
 * approving, the Stripe `account.updated` webhook, and the dashboard refresh -
 * and they can easily overlap.
 *
 * The idempotency key is what makes that safe. Two simultaneous callers both
 * see `pending_payout`, both call Stripe, and Stripe returns the SAME transfer
 * for the second one rather than creating another. Guarding on our own row
 * alone would not be enough: between reading it and writing it there is a gap
 * long enough to pay someone twice.
 */
export async function transferToCreator(bookingId: string): Promise<Result> {
  const admin = await escrowDb();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, creator_id, price, payment_status, stripe_payment_intent_id, stripe_transfer_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { error: "Booking not found." };

  // Already paid out - nothing to do, and saying "ok" keeps retries harmless.
  if (booking.payment_status === "released" || booking.stripe_transfer_id) {
    return { ok: true };
  }
  if (!["held", "pending_payout"].includes(booking.payment_status)) {
    return { error: "This booking isn't awaiting payout." };
  }

  const { data: creator } = await admin
    .from("creator_profiles")
    .select("stripe_account_id, payouts_enabled")
    .eq("user_id", booking.creator_id)
    .maybeSingle();
  if (!creator?.stripe_account_id || !creator.payouts_enabled) {
    return { error: "The creator can't receive payouts yet." };
  }

  try {
    const pi = await stripe().paymentIntents.retrieve(
      booking.stripe_payment_intent_id!,
    );
    const chargeId =
      typeof pi.latest_charge === "string" ? pi.latest_charge : undefined;

    const gross = toPence(Number(booking.price));
    const fee = Math.round((gross * platformFeeBps()) / 10000);
    const transfer = await stripe().transfers.create(
      {
        amount: gross - fee,
        currency: "gbp",
        destination: creator.stripe_account_id,
        transfer_group: bookingId,
        ...(chargeId ? { source_transaction: chargeId } : {}),
      },
      // Derived from the booking, so it is the same key on every retry and
      // from every trigger. This is the actual guarantee against paying twice.
      { idempotencyKey: `booking-transfer-${bookingId}` },
    );

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

/**
 * Pay out everything owed to one creator. Called when Stripe confirms they can
 * receive money - from the webhook, and from the dashboard's refresh.
 *
 * Returns how many were paid so callers can log it. Never throws: a single
 * failed transfer must not stop the rest.
 */
export async function payOutPendingForCreator(
  creatorId: string,
): Promise<number> {
  if (!isStripeConfigured() || !isAdminConfigured()) return 0;

  const admin = createAdminClient();
  const { data: owed } = await admin
    .from("bookings")
    .select("id")
    .eq("creator_id", creatorId)
    .eq("payment_status", "pending_payout");

  let paid = 0;
  for (const booking of owed ?? []) {
    const result = await transferToCreator(booking.id);
    if ("ok" in result) paid++;
    else console.error(`[payout] ${booking.id}: ${result.error}`);
  }
  return paid;
}

/** Refund escrow to the brand and move the booking to `newStatus`. */
export async function refundEscrow(
  bookingId: string,
  newStatus: "declined" | "refunded",
): Promise<Result> {
  const admin = await escrowDb();
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
