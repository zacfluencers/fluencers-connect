"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { stripe, isStripeConfigured, getBaseUrl, toPence } from "@/lib/stripe/server";
import { refundEscrow, payOutPendingForCreator } from "@/lib/stripe/escrow";
import { rateFor, serviceDef, type ServiceType } from "@/lib/services";
import { brandCanTransact } from "@/lib/subscription";
import { notify } from "@/lib/notifications";

/**
 * Brand pays into escrow at request time, for a specific service (UGC / Event
 * Day / B-Roll). Creates a Stripe Checkout Session; the booking is created
 * (idempotently) once payment succeeds, via the webhook / success page.
 * Funds sit on the platform balance until release.
 */
export async function createBookingCheckout(
  creatorId: string,
  service: ServiceType = "ugc",
) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "brand") return { error: "Only brands can book creators." };
  // Gate: only subscribed brands can book (free brands can browse only).
  if (!(await brandCanTransact(me.id))) {
    return { error: "Subscribe to book creators - see Membership on your dashboard." };
  }

  const def = serviceDef(service);
  if (!def) return { error: "Unknown service." };

  const supabase = await createClient();
  const { data: creator } = await supabase
    .from("creator_profiles")
    .select(
      // Every rate column, not a hand-picked list: a missing one reads as
      // "doesn't offer this service" and silently blocks the booking.
      "user_id, name, ugc_rate, event_rate, broll_rate, whitelist_rate, post_rate, availability",
    )
    .eq("user_id", creatorId)
    .maybeSingle();
  if (!creator) return { error: "Creator not found." };
  if (!creator.availability) {
    return { error: "This creator isn't taking bookings right now." };
  }

  const rate = rateFor(creator, service);
  if (rate == null) {
    return { error: `This creator doesn't offer ${def.label}.` };
  }

  // Demo mode: with no Stripe keys configured we skip checkout entirely and
  // create the booking directly (the brand may insert their own booking under
  // RLS). This unblocks testing the full booking → brief → deal-room flow.
  // When Stripe IS configured this branch never runs, so production is unchanged.
  if (!isStripeConfigured()) {
    const { data: created, error } = await supabase
      .from("bookings")
      .insert({
        brand_id: me.id,
        creator_id: creator.user_id,
        price: rate,
        service_type: service,
        status: "requested",
        payment_status: "unpaid",
      })
      .select("id")
      .maybeSingle();
    if (error || !created) {
      return { error: error?.message ?? "Could not create the booking." };
    }

    const brandName =
      (await supabase.from("brand_profiles").select("company_name").eq("user_id", me.id).maybeSingle()).data?.company_name ?? "A brand";
    await notify(supabase, {
      userId: creator.user_id,
      type: "booking_request",
      title: `New booking request from ${brandName}`,
      body: `${def.label} · demo booking (payments off)`,
      link: `/bookings/${created.id}`,
    });

    redirect(`/bookings/${created.id}`);
  }

  const base = getBaseUrl();
  let checkoutUrl: string | null = null;
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: toPence(rate),
            product_data: { name: `${def.label} - ${creator.name}` },
          },
        },
      ],
      payment_intent_data: {
        metadata: { brand_id: me.id, creator_id: creator.user_id, service },
      },
      metadata: {
        brand_id: me.id,
        creator_id: creator.user_id,
        price: String(rate),
        service,
      },
      success_url: `${base}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/creator/${creator.user_id}?canceled=1`,
    });
    checkoutUrl = session.url;
  } catch (e) {
    console.error("[stripe checkout] failed:", e instanceof Error ? e.message : e);
    return { error: "We couldn't reach the payment provider. Please try again in a moment." };
  }

  if (!checkoutUrl) return { error: "Could not start checkout." };
  redirect(checkoutUrl);
}

/**
 * Creator onboards (or resumes onboarding) a Stripe Express account for payouts.
 */
export async function startCreatorOnboarding() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "creator") return { error: "Only creators set up payouts." };
  if (!isStripeConfigured()) return { error: "Payments aren't set up yet." };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("stripe_account_id")
    .eq("user_id", me.id)
    .maybeSingle();

  let accountId = profile?.stripe_account_id ?? null;
  let linkUrl: string;
  try {
    if (!accountId) {
      const account = await stripe().accounts.create({
        type: "express",
        country: "GB",
        email: me.email,
        // Creators onboard as individuals — they never need to be a company.
        business_type: "individual",
        // GB→GB payouts require Stripe's standard agreement (the lighter
        // "recipient" agreement is cross-border only), which needs both
        // capabilities. We only use `transfers`; `card_payments` is unused but
        // required. To keep onboarding short, we pre-fill the "business" fields
        // on the creator's behalf so Stripe doesn't ask them.
        business_profile: {
          mcc: "7311", // Advertising / creative services
          product_description:
            "Sponsored and user-generated content created for brands.",
          url: `${getBaseUrl()}/creator/${me.id}`,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      await supabase
        .from("creator_profiles")
        .update({ stripe_account_id: accountId })
        .eq("user_id", me.id);
    }

    const base = getBaseUrl();
    const link = await stripe().accountLinks.create({
      account: accountId,
      refresh_url: `${base}/dashboard/creator?payouts=refresh`,
      return_url: `${base}/dashboard/creator?payouts=done`,
      type: "account_onboarding",
    });
    linkUrl = link.url;
  } catch (e) {
    console.error("[stripe onboarding] failed:", e instanceof Error ? e.message : e);
    return { error: "We couldn't reach the payment provider. Please try again in a moment." };
  }

  redirect(linkUrl);
}

/**
 * Pull the creator's current payout readiness straight from Stripe and sync the
 * `payouts_enabled` flag. The webhook (`account.updated`) is the primary path,
 * but it can be delayed or unsubscribed — calling this when the creator returns
 * to their dashboard makes the status reliable without waiting on the webhook.
 * Returns the up-to-date enabled flag.
 */
export async function refreshPayoutStatus(): Promise<boolean> {
  const me = await getCurrentUser();
  if (!me || me.role !== "creator") return false;
  if (!isStripeConfigured()) return false;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("stripe_account_id, payouts_enabled")
    .eq("user_id", me.id)
    .maybeSingle();
  if (!profile?.stripe_account_id) return false;

  try {
    const account = await stripe().accounts.retrieve(profile.stripe_account_id);
    const enabled =
      Boolean(account.payouts_enabled) &&
      account.capabilities?.transfers === "active";
    if (enabled !== Boolean(profile.payouts_enabled)) {
      await supabase
        .from("creator_profiles")
        .update({ payouts_enabled: enabled })
        .eq("user_id", me.id);
    }
    // Second chance to settle anything owed. The webhook is the primary path,
    // but a creator returning from Stripe onboarding hits this page directly -
    // often before the webhook lands - and money owed should not wait on it.
    // Safe to run every time: the transfer is idempotent per booking.
    if (enabled) await payOutPendingForCreator(me.id);
    return enabled;
  } catch (e) {
    console.error("[payout sync] failed:", e instanceof Error ? e.message : e);
    return Boolean(profile.payouts_enabled);
  }
}

/** Brand cancels/disputes an active booking → refund escrow, mark refunded. */
export async function refundBooking(
  bookingId: string,
): Promise<{ ok: true } | { error: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Please sign in." };

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, brand_id, creator_id, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { error: "Booking not found." };
  if (booking.brand_id !== me.id) {
    return { error: "Only the brand on this booking can request a refund." };
  }
  if (["completed", "declined", "refunded"].includes(booking.status)) {
    return { error: "This booking can no longer be refunded." };
  }

  const result = await refundEscrow(bookingId, "refunded");
  if ("error" in result) return result;

  const brandName =
    (await supabase.from("brand_profiles").select("company_name").eq("user_id", me.id).maybeSingle()).data?.company_name ?? "The brand";
  await notify(supabase, {
    userId: booking.creator_id,
    type: "booking_update",
    title: `${brandName} cancelled the booking`,
    body: "The escrow has been refunded to the brand.",
    link: `/bookings/${bookingId}`,
  });

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  revalidatePath("/dashboard/brand");
  return { ok: true };
}
