"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { notify } from "@/lib/notifications";
import type { ProductMode } from "@/lib/types";

/** Trim a form value to a string, or null when empty. */
function str(form: FormData, key: string): string | null {
  const v = form.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

type BrandBookingCtx =
  | { ok: false; error: string }
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      booking: { id: string; brand_id: string; creator_id: string };
    };

/** Confirm the current user is the brand on this booking; returns the booking. */
async function brandBooking(bookingId: string): Promise<BrandBookingCtx> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "Please sign in." };
  if (me.role !== "brand")
    return { ok: false, error: "Only the brand can edit the brief." };

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, brand_id, creator_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.brand_id !== me.id) {
    return { ok: false, error: "Booking not found." };
  }
  return { ok: true, supabase, booking };
}

/** Save (create or update) the campaign brief for a booking. */
export async function saveBookingBrief(
  bookingId: string,
  form: FormData,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await brandBooking(bookingId);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, booking } = ctx;

  const mode = (str(form, "product_mode") ?? "none") as ProductMode;
  const productMode: ProductMode = ["none", "ship", "order"].includes(mode)
    ? mode
    : "none";

  const row = {
    booking_id: bookingId,
    campaign_name: str(form, "campaign_name"),
    target_audience: str(form, "target_audience"),
    platform: str(form, "platform"),
    creative_brief: str(form, "creative_brief"),
    cta: str(form, "cta"),
    must_include: str(form, "must_include"),
    avoid: str(form, "avoid"),
    deadline: str(form, "deadline"),
    usage_rights: str(form, "usage_rights"),
    // Whitelisting and posts only - the form doesn't show these otherwise, so
    // they simply come through empty.
    meta_business_id: str(form, "meta_business_id"),
    brand_handle: str(form, "brand_handle"),
    // Only keep the fields that match the chosen product mode.
    product_mode: productMode,
    shipping_tracking: productMode === "ship" ? str(form, "shipping_tracking") : null,
    product_link: productMode === "order" ? str(form, "product_link") : null,
    discount_code: productMode === "order" ? str(form, "discount_code") : null,
    updated_at: new Date().toISOString(),
  };

  // First brief? Let the creator know once.
  const { data: existing } = await supabase
    .from("booking_briefs")
    .select("booking_id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  const { error } = await supabase
    .from("booking_briefs")
    .upsert(row, { onConflict: "booking_id" });
  if (error) return { error: error.message };

  if (!existing) {
    await notify(supabase, {
      userId: booking.creator_id,
      type: "booking_update",
      title: "A campaign brief is ready",
      body: row.campaign_name
        ? `Brief added for “${row.campaign_name}”.`
        : "The brand added a brief to your booking.",
      link: `/bookings/${bookingId}`,
    });
  }

  revalidatePath(`/bookings/${bookingId}`);
  return { ok: true };
}

/** Record a reference file after it's uploaded to storage by the browser. */
export async function recordBriefAsset(input: {
  bookingId: string;
  url: string;
  storagePath: string;
  name: string;
  size: number;
}): Promise<{ ok: true } | { error: string }> {
  const ctx = await brandBooking(input.bookingId);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase } = ctx;

  const { error } = await supabase.from("booking_assets").insert({
    booking_id: input.bookingId,
    url: input.url,
    storage_path: input.storagePath,
    name: input.name,
    size: input.size,
  });
  if (error) return { error: error.message };

  revalidatePath(`/bookings/${input.bookingId}`);
  return { ok: true };
}

/** Remove a reference file (DB row + stored object). Brand-only. */
export async function deleteBriefAsset(
  assetId: string,
): Promise<{ ok: true } | { error: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Please sign in." };

  const supabase = await createClient();
  const { data: asset } = await supabase
    .from("booking_assets")
    .select("id, booking_id, storage_path")
    .eq("id", assetId)
    .maybeSingle();
  if (!asset) return { error: "File not found." };

  // Belt-and-braces on top of RLS: confirm the caller is the brand on this
  // booking before deleting, so a wrong party gets an honest error rather than
  // a silent no-op reported as success.
  const ctx = await brandBooking(asset.booking_id);
  if (!ctx.ok) return { error: ctx.error };

  const { data: deleted, error } = await supabase
    .from("booking_assets")
    .delete()
    .eq("id", assetId)
    .select("id");
  if (error) return { error: error.message };
  if (!deleted || deleted.length === 0) {
    // RLS blocked it (not the owner) — never report a delete that didn't happen.
    return { error: "You can't delete this file." };
  }

  if (asset.storage_path) {
    const { error: rmError } = await supabase.storage
      .from("briefs")
      .remove([asset.storage_path]);
    // The row is gone; a failed object removal just leaves an orphan — log it
    // for cleanup rather than failing the whole action.
    if (rmError) console.error("brief asset object remove failed:", rmError.message);
  }

  revalidatePath(`/bookings/${asset.booking_id}`);
  return { ok: true };
}
