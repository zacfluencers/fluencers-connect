"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { notify } from "@/lib/notifications";

/** Confirm the current user is the creator on this booking; returns the booking. */
async function creatorBooking(bookingId: string) {
  const me = await getCurrentUser();
  if (!me) return { ok: false as const, error: "Please sign in." };
  if (me.role !== "creator")
    return { ok: false as const, error: "Only the creator can deliver files." };

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, brand_id, creator_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.creator_id !== me.id) {
    return { ok: false as const, error: "Booking not found." };
  }
  return { ok: true as const, supabase, booking };
}

/** Record a delivered file after the browser uploads it to storage. */
export async function recordDeliverable(input: {
  bookingId: string;
  url: string;
  storagePath: string;
  name: string;
  size: number;
}): Promise<{ ok: true } | { error: string }> {
  const ctx = await creatorBooking(input.bookingId);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, booking } = ctx;

  // Was this the first delivered file? Let the brand know once.
  const { count } = await supabase
    .from("booking_deliverables")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", input.bookingId);

  const { error } = await supabase.from("booking_deliverables").insert({
    booking_id: input.bookingId,
    url: input.url,
    storage_path: input.storagePath,
    name: input.name,
    size: input.size,
  });
  if (error) return { error: error.message };

  if (!count) {
    const creatorName =
      (await supabase.from("creator_profiles").select("name").eq("user_id", booking.creator_id).maybeSingle()).data?.name ?? "The creator";
    await notify(supabase, {
      userId: booking.brand_id,
      type: "booking_update",
      title: `${creatorName} uploaded content`,
      body: "New deliverables are ready to review.",
      link: `/bookings/${input.bookingId}`,
    });
  }

  revalidatePath(`/bookings/${input.bookingId}`);
  return { ok: true };
}

/** Remove a delivered file (DB row + stored object). Creator-only. */
export async function deleteDeliverable(
  deliverableId: string,
): Promise<{ ok: true } | { error: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Please sign in." };

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("booking_deliverables")
    .select("id, booking_id, storage_path")
    .eq("id", deliverableId)
    .maybeSingle();
  if (!item) return { error: "File not found." };

  // Belt-and-braces on top of RLS: confirm the caller is the creator on this
  // booking before touching anything, so a wrong party gets an honest error
  // rather than a silent no-op reported as success.
  const ctx = await creatorBooking(item.booking_id);
  if (!ctx.ok) return { error: ctx.error };

  const { data: deleted, error } = await supabase
    .from("booking_deliverables")
    .delete()
    .eq("id", deliverableId)
    .select("id");
  if (error) return { error: error.message };
  if (!deleted || deleted.length === 0) {
    // RLS blocked it (not the owner) — never report a delete that didn't happen.
    return { error: "You can't delete this file." };
  }

  if (item.storage_path) {
    const { error: rmError } = await supabase.storage
      .from("deliverables")
      .remove([item.storage_path]);
    // The row is gone; a failed object removal just leaves an orphan — log it
    // for cleanup rather than failing the whole action.
    if (rmError) console.error("deliverable object remove failed:", rmError.message);
  }

  revalidatePath(`/bookings/${item.booking_id}`);
  return { ok: true };
}
