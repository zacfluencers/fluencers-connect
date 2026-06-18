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
  },
) {
  const { action, actorRole, brandId, creatorId, bookingId } = args;
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
    request_revision: { title: `${actorName} requested a revision` },
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
    .select("id, brand_id, creator_id, status, revision_count")
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
  };

  // Money-moving transitions go through escrow (these set the status too).
  if (action === "approve" || action === "decline") {
    const result =
      action === "approve"
        ? await releaseEscrow(bookingId)
        : await refundEscrow(bookingId, "declined");
    if ("error" in result) return result;
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
