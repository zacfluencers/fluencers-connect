import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import type {
  AppUser,
  Booking,
  CreatorProfile,
  PortfolioItem,
} from "@/lib/types";

/** Every column on creator_profiles — shared so selects stay in sync. */
export const CREATOR_PROFILE_COLUMNS =
  "user_id, name, bio, niche, instagram, tiktok, availability, price, profile_image, instagram_followers, tiktok_followers, followers_synced_at";

const PROFILE_COLS = CREATOR_PROFILE_COLUMNS;

/** Portfolio images for a creator, newest sort_order first. */
export async function getPortfolio(creatorId: string): Promise<PortfolioItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolio_items")
    .select("id, creator_id, image_url, storage_path, sort_order, created_at")
    .eq("creator_id", creatorId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return data ?? [];
}

/** The set of creator IDs the current user has favourited (empty if signed out). */
export async function getFavoriteIds(): Promise<Set<string>> {
  const me = await getCurrentUser();
  if (!me) return new Set();
  const supabase = await createClient();
  const { data } = await supabase
    .from("favorites")
    .select("creator_id")
    .eq("user_id", me.id);
  return new Set((data ?? []).map((r) => r.creator_id));
}

/** Full creator profiles the current user has favourited. */
export async function getFavoriteCreators(): Promise<CreatorProfile[]> {
  const me = await getCurrentUser();
  if (!me) return [];
  const supabase = await createClient();

  const { data: favs } = await supabase
    .from("favorites")
    .select("creator_id")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false });

  const ids = (favs ?? []).map((f) => f.creator_id);
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("creator_profiles")
    .select(CREATOR_PROFILE_COLUMNS)
    .in("user_id", ids);

  // Preserve favourite order (most recently favourited first).
  const byId = new Map((data ?? []).map((c) => [c.user_id, c]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as CreatorProfile[];
}

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
