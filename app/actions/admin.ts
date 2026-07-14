"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { refundEscrow } from "@/lib/stripe/escrow";
import { notify } from "@/lib/notifications";

export type AdminActionState = { error: string } | { ok: string } | null;

/**
 * Admin refunds a booking, returning the escrowed money to the brand.
 *
 * This exists because refunds were being done by hand in the Stripe dashboard,
 * which moves the money but leaves this app's own record of the booking stale —
 * so the app and Stripe end up disagreeing about what happened. Going through
 * here keeps them in step and tells both parties.
 *
 * It reuses the same `refundEscrow` path the brand's own cancel button uses, so
 * there is exactly one piece of code in this codebase that moves money back.
 */
export async function adminRefundBooking(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  // Never trust the page guard. A server action is a public HTTP endpoint —
  // anyone can post to it — so it re-checks admin itself.
  await requireAdmin();

  const bookingId = String(formData.get("bookingId") ?? "").trim();
  if (!bookingId) return { error: "Which booking?" };

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, brand_id, creator_id, payment_status, price")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { error: "Booking not found." };

  // The money must actually still be in escrow. Refunding anything else would
  // either double-refund or try to claw back a payment the creator already has.
  if (booking.payment_status !== "held") {
    return {
      error:
        booking.payment_status === "refunded"
          ? "This booking has already been refunded."
          : booking.payment_status === "released"
            ? "That money has already been paid out to the creator — refund it in Stripe if you really mean to."
            : "There's no money held on this booking to refund.",
    };
  }

  const result = await refundEscrow(bookingId, "refunded");
  if ("error" in result) return result;

  // Tell both sides. A refund they weren't told about is how disputes start.
  await Promise.all([
    notify(admin, {
      userId: booking.creator_id,
      type: "booking_update",
      title: "This booking was cancelled and refunded",
      body: "The payment has been returned to the brand. Get in touch if this looks wrong.",
      link: `/bookings/${bookingId}`,
    }),
    notify(admin, {
      userId: booking.brand_id,
      type: "booking_update",
      title: "Your booking was refunded",
      body: "The payment has been returned to your card.",
      link: `/bookings/${bookingId}`,
    }),
  ]);

  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  revalidatePath(`/bookings/${bookingId}`);

  return { ok: "Refunded. Both parties have been told." };
}
