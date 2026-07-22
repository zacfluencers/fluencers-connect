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
  return insertDeliverable(input.bookingId, "uploaded content", {
    kind: "file",
    url: input.url,
    storage_path: input.storagePath,
    name: input.name,
    size: input.size,
  });
}

/**
 * Record a link or a note instead of a file.
 *
 * An Influencer Post is delivered as a live URL and a Meta Whitelist as a
 * partnership ad code, so neither creator has anything to upload. Both were
 * bookable from 22 Jul against a deal room that only accepted uploads.
 */
export async function addDeliverableEntry(input: {
  bookingId: string;
  kind: "link" | "note";
  value: string;
}): Promise<{ ok: true } | { error: string }> {
  const value = input.value.trim();
  if (!value) {
    return {
      error:
        input.kind === "link" ? "Add a link first." : "Add some detail first.",
    };
  }
  if (value.length > 2000) return { error: "That's too long." };

  if (input.kind === "link") {
    const url = normaliseUrl(value);
    if (!url) return { error: "That doesn't look like a link. It should start with https://" };
    return insertDeliverable(input.bookingId, "added a link", {
      kind: "link",
      url,
      name: url,
    });
  }

  return insertDeliverable(input.bookingId, "sent whitelisting details", {
    kind: "note",
    note: value,
  });
}

/**
 * Accept a pasted link only if it's a real http(s) URL. Anything else - a
 * handle, a code, a sentence - belongs in a note, and silently storing it as a
 * link would render a dead anchor for the brand to click.
 */
function normaliseUrl(value: string): string | null {
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Shared insert + first-delivery notification for every kind of deliverable. */
async function insertDeliverable(
  bookingId: string,
  verb: string,
  row: Record<string, unknown>,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await creatorBooking(bookingId);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, booking } = ctx;

  // Was this the first thing delivered? Let the brand know once.
  const { count } = await supabase
    .from("booking_deliverables")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", bookingId);

  const { error } = await supabase
    .from("booking_deliverables")
    .insert({ booking_id: bookingId, ...row });
  if (error) return { error: error.message };

  if (!count) {
    const creatorName =
      (await supabase.from("creator_profiles").select("name").eq("user_id", booking.creator_id).maybeSingle()).data?.name ?? "The creator";
    await notify(supabase, {
      userId: booking.brand_id,
      type: "booking_update",
      title: `${creatorName} ${verb}`,
      body: "There's something new to review.",
      link: `/bookings/${bookingId}`,
    });
  }

  revalidatePath(`/bookings/${bookingId}`);
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
