"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { refundEscrow } from "@/lib/stripe/escrow";
import { notify } from "@/lib/notifications";
import { isEmailConfigured } from "@/lib/email";
import { sendProfileNudgePreview } from "@/lib/profile-nudge";
import { mirrorPendingSocialAvatars } from "@/lib/social/enrichment";

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
            ? "That money has already been paid out to the creator - refund it in Stripe if you really mean to."
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

/**
 * Email a sample of both "finish your profile" nudges to the admin who asked,
 * so the wording can be checked in a real inbox before any creator gets one.
 *
 * Sends only to the signed-in admin's own address — it takes no recipient from
 * the form, so this can't be turned into a way to email arbitrary people.
 */
export async function adminPreviewProfileNudge(): Promise<AdminActionState> {
  const me = await requireAdmin();

  if (!isEmailConfigured()) {
    return { error: "Email isn't configured, so nothing can be sent." };
  }

  const ok = await sendProfileNudgePreview(me.email);
  return ok
    ? { ok: `Sent both sample emails to ${me.email}.` }
    : { error: "The email provider rejected the send. Nothing went out." };
}

/**
 * Run the imported-photo repair now, instead of waiting for the daily job.
 *
 * Creators who never uploaded a photo fall back to their Instagram or TikTok
 * picture, and those links expire within days. The nightly job copies them into
 * our own storage; this is the same pass on demand, for when you'd rather not
 * wait until morning. Safe to run any time: already-copied photos are skipped
 * and it makes no paid API calls.
 */
export async function adminMirrorAvatars(): Promise<AdminActionState> {
  await requireAdmin();

  const fixed = await mirrorPendingSocialAvatars();

  revalidatePath("/marketplace");
  revalidatePath("/admin");

  return {
    ok:
      fixed === 0
        ? "Nothing to fix - every imported photo is already stored safely."
        : `Fixed ${fixed} imported ${fixed === 1 ? "photo" : "photos"}.`,
  };
}
