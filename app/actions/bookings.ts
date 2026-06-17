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

  // Money-moving transitions go through escrow (these set the status too).
  if (action === "approve" || action === "decline") {
    const result =
      action === "approve"
        ? await releaseEscrow(bookingId)
        : await refundEscrow(bookingId, "declined");
    if ("error" in result) return result;
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

  revalidateBooking(bookingId);
  return { ok: true };
}

function revalidateBooking(bookingId: string) {
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  revalidatePath("/dashboard/creator");
  revalidatePath("/dashboard/brand");
}
