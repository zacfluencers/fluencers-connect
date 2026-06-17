import { createClient } from "@/lib/supabase/server";
import type { AppUser, Booking, CreatorProfile } from "@/lib/types";

const PROFILE_COLS =
  "user_id, name, bio, niche, instagram, tiktok, availability, price, profile_image";

export interface BookingDetail {
  booking: Booking;
  creator: CreatorProfile | null;
  brand: Pick<AppUser, "id" | "email"> | null;
}

/** One booking with both parties' details. RLS limits this to bookings you're on. */
export async function getBookingDetail(
  id: string,
): Promise<BookingDetail | null> {
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, brand_id, creator_id, status, price, revision_count, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!booking) return null;

  const [{ data: creator }, { data: brand }] = await Promise.all([
    supabase
      .from("creator_profiles")
      .select(PROFILE_COLS)
      .eq("user_id", booking.creator_id)
      .maybeSingle(),
    supabase
      .from("users")
      .select("id, email")
      .eq("id", booking.brand_id)
      .maybeSingle(),
  ]);

  return { booking, creator: creator ?? null, brand: brand ?? null };
}

export interface BookingRow extends Booking {
  creatorName: string | null;
  brandEmail: string | null;
}

/**
 * All of my bookings (RLS scopes to ones I'm a party on), with each
 * counterparty's display label attached. `creatorId` optionally narrows to a
 * single creator's incoming bookings (used by the creator dashboard).
 */
export async function listMyBookings(creatorId?: string): Promise<BookingRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("bookings")
    .select("id, brand_id, creator_id, status, price, revision_count, created_at")
    .order("created_at", { ascending: false });

  if (creatorId) query = query.eq("creator_id", creatorId);

  const { data: bookings } = await query;
  if (!bookings || bookings.length === 0) return [];

  const creatorIds = [...new Set(bookings.map((b) => b.creator_id))];
  const brandIds = [...new Set(bookings.map((b) => b.brand_id))];

  const [{ data: creators }, { data: brands }] = await Promise.all([
    supabase.from("creator_profiles").select("user_id, name").in("user_id", creatorIds),
    supabase.from("users").select("id, email").in("id", brandIds),
  ]);

  const nameByCreator = new Map((creators ?? []).map((c) => [c.user_id, c.name]));
  const emailByBrand = new Map((brands ?? []).map((b) => [b.id, b.email]));

  return bookings.map((b) => ({
    ...b,
    creatorName: nameByCreator.get(b.creator_id) ?? null,
    brandEmail: emailByBrand.get(b.brand_id) ?? null,
  }));
}
