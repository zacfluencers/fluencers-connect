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

/**
 * Brand requests a booking with a creator. Price is snapshotted from the
 * creator's profile so later rate changes don't affect this booking.
 * Status starts at "requested".
 */
export async function createBooking(creatorId: string) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "brand") {
    return { error: "Only brand accounts can request bookings." };
  }

  const supabase = await createClient();

  const { data: creator, error: creatorErr } = await supabase
    .from("creator_profiles")
    .select("user_id, price, availability")
    .eq("user_id", creatorId)
    .maybeSingle();

  if (creatorErr || !creator) return { error: "Creator not found." };
  if (!creator.availability) {
    return { error: "This creator isn't taking bookings right now." };
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      brand_id: me.id,
      creator_id: creator.user_id,
      price: creator.price,
      status: "requested",
    })
    .select("id")
    .single();

  if (error || !booking) {
    return { error: error?.message ?? "Could not create the booking." };
  }

  revalidatePath("/bookings");
  redirect(`/bookings/${booking.id}`);
}

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

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  revalidatePath("/dashboard/creator");
  return { ok: true };
}
