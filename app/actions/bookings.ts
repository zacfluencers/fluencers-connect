"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import {
  MAX_REVISIONS,
  findTransition,
  type BookingAction,
} from "@/lib/bookings";
import { releaseEscrow, refundEscrow } from "@/lib/stripe/escrow";
import { licenceWindow } from "@/lib/licence";
import { termFor } from "@/lib/services";
import { notify } from "@/lib/notifications";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Alert the counterparty that a booking moved. Best-effort. */
async function notifyBookingAction(
  supabase: SupabaseClient,
  args: {
    action: BookingAction;
    actorRole: "brand" | "creator";
    actorId: string;
    brandId: string;
    creatorId: string;
    bookingId: string;
    serviceType: string | null;
  },
) {
  const { action, actorRole, brandId, creatorId, bookingId, serviceType } = args;
  const recipientId = actorRole === "brand" ? creatorId : brandId;

  const actorName =
    actorRole === "brand"
      ? (await supabase.from("brand_profiles").select("company_name").eq("user_id", brandId).maybeSingle()).data?.company_name ?? "The brand"
      : (await supabase.from("creator_profiles").select("name").eq("user_id", creatorId).maybeSingle()).data?.name ?? "The creator";

  const map: Record<BookingAction, { title: string; body?: string }> = {
    accept: { title: `${actorName} accepted your booking` },
    decline: { title: `${actorName} declined your booking`, body: "Any escrow held has been refunded." },
    start: { title: `${actorName} started work on your booking` },
    submit: { title: `${actorName} submitted work for review`, body: "Review it and approve or request a revision." },
    approve: { title: `${actorName} approved & completed your booking`, body: "Funds have been released to you." },
    // Says what they actually want back. On a whitelist "requested a revision"
    // leaves the creator hunting for creative feedback that doesn't exist.
    request_revision: {
      title:
        termFor(serviceType)?.kind === "licence"
          ? `${actorName} needs the access fixed`
          : `${actorName} requested a revision`,
    },
    unaccept: { title: `${actorName} moved the booking back to requested` },
    revert_to_accepted: { title: `${actorName} moved the booking back a step` },
    withdraw: { title: `${actorName} withdrew the submission`, body: "They're making changes before resubmitting." },
  };

  const msg = map[action];
  await notify(supabase, {
    userId: recipientId,
    type: "booking_update",
    title: msg.title,
    body: msg.body ?? null,
    link: `/bookings/${bookingId}`,
  });
}

/**
 * Tell both sides the licence clock has started, and when it stops.
 *
 * Said once, at the start, so neither party has to go looking for the date -
 * and so "I didn't know when it ran out" isn't available to either of them
 * later. The reminders a week before and on the day come from the scheduled
 * job in lib/licence-reminders.ts.
 */
async function announceLicence(
  supabase: SupabaseClient,
  args: {
    brandId: string;
    creatorId: string;
    bookingId: string;
    serviceType: string | null;
    endsAt: Date;
  },
) {
  const when = args.endsAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });
  const link = `/bookings/${args.bookingId}`;
  const remind = "We'll remind you both a week before it ends.";

  // Whitelisting: the brand holds rights that expire.
  if (termFor(args.serviceType)?.kind !== "commitment") {
    await notify(supabase, {
      userId: args.brandId,
      type: "booking_update",
      title: `Your whitelisting runs until ${when}`,
      body: `You can run ads from the creator's handle until this date. ${remind}`,
      link,
    });
    await notify(supabase, {
      userId: args.creatorId,
      type: "booking_update",
      title: `Whitelisting agreed until ${when}`,
      body: `The brand can run ads from your handle until this date. After that you can remove them as an approved partner. ${remind}`,
      link,
    });
    return;
  }

  // A post: the creator holds an obligation that expires.
  await notify(supabase, {
    userId: args.creatorId,
    type: "booking_update",
    title: `Keep your post live until ${when}`,
    body: `That's the agreed 30 days. After it you're free to remove the post. ${remind}`,
    link,
  });
  await notify(supabase, {
    userId: args.brandId,
    type: "booking_update",
    title: `The post stays live until ${when}`,
    body: `The creator has agreed to keep it up for 30 days. ${remind}`,
    link,
  });
}

// Booking creation now happens through Stripe Checkout — see
// createBookingCheckout in app/actions/payments.ts.

/**
 * Move a booking through the state machine. Validates: the actor is a party on
 * the booking, holds the role allowed for the action, the action is legal from
 * the current status, and the revision cap. RLS is the outer guard; this is the
 * transition guard.
 */
export async function transitionBooking(
  bookingId: string,
  action: BookingAction,
) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const supabase = await createClient();

  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("id, brand_id, creator_id, status, revision_count, service_type")
    .eq("id", bookingId)
    .maybeSingle();

  if (fetchErr || !booking) return { error: "Booking not found." };

  const isParty =
    booking.brand_id === me.id || booking.creator_id === me.id;
  if (!isParty) return { error: "You're not part of this booking." };

  const transition = findTransition(booking.status, action);
  if (!transition) {
    return { error: `Can't ${action} a booking that is ${booking.status}.` };
  }

  // The actor must hold the role the transition requires, AND be the right party.
  if (transition.actor !== me.role) {
    return { error: "You can't take that action on this booking." };
  }
  const partyMatches =
    transition.actor === "brand"
      ? booking.brand_id === me.id
      : booking.creator_id === me.id;
  if (!partyMatches) {
    return { error: "You can't take that action on this booking." };
  }

  const actorRole = me.role as "brand" | "creator";
  const notifyArgs = {
    action,
    actorRole,
    actorId: me.id,
    brandId: booking.brand_id,
    creatorId: booking.creator_id,
    bookingId,
    serviceType: booking.service_type,
  };

  // Money-moving transitions go through escrow (these set the status too).
  if (action === "approve" || action === "decline") {
    const result =
      action === "approve"
        ? await releaseEscrow(bookingId)
        : await refundEscrow(bookingId, "declined");
    if ("error" in result) return result;

    // Approval is what starts a whitelist's three months. Recorded here rather
    // than in escrow because it's a fact about the agreement, not the payment -
    // and it must not be set by a decline or a refund.
    if (action === "approve") {
      const window = licenceWindow(booking.service_type, new Date());
      if (window) {
        const { data: started } = await supabase
          .from("bookings")
          .update({
            licence_starts_at: window.startsAt.toISOString(),
            licence_ends_at: window.endsAt.toISOString(),
          })
          .eq("id", bookingId)
          // Never restart a clock that's already running: a second approval
          // would silently extend the brand's rights.
          .is("licence_ends_at", null)
          .select("id");

        // Only announce a clock we actually started, so a repeated approval
        // can't tell either side the term has been reset.
        if (started?.length) {
          await announceLicence(supabase, {
            brandId: booking.brand_id,
            creatorId: booking.creator_id,
            bookingId,
            serviceType: booking.service_type,
            endsAt: window.endsAt,
          });
        }
      }
    }

    await notifyBookingAction(supabase, notifyArgs);
    revalidateBooking(bookingId);
    return { ok: true };
  }

  const patch: { status: string; revision_count?: number } = {
    status: transition.to,
  };

  if (action === "request_revision") {
    if (booking.revision_count >= MAX_REVISIONS) {
      return { error: `Revision limit reached (max ${MAX_REVISIONS}).` };
    }
    patch.revision_count = booking.revision_count + 1;
  }

  const { error } = await supabase
    .from("bookings")
    .update(patch)
    .eq("id", bookingId);

  if (error) return { error: error.message };

  await notifyBookingAction(supabase, notifyArgs);
  revalidateBooking(bookingId);
  return { ok: true };
}

function revalidateBooking(bookingId: string) {
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  revalidatePath("/dashboard/creator");
  revalidatePath("/dashboard/brand");
}
