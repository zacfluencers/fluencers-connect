import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import type {
  AppUser,
  AppNotification,
  Booking,
  BrandProfile,
  CreatorProfile,
  Message,
  PortfolioItem,
} from "@/lib/types";

const BRAND_PROFILE_COLUMNS =
  "user_id, company_name, about, budget_min, budget_max, looking_for_creators, logo_url, website, instagram, tiktok, created_at";

/** Every column on creator_profiles — shared so selects stay in sync. */
export const CREATOR_PROFILE_COLUMNS =
  "user_id, name, bio, niche, instagram, tiktok, availability, price, ugc_rate, event_rate, broll_rate, gender, age, country, profile_image, instagram_followers, tiktok_followers, followers_synced_at";

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
    .select(
      "id, brand_id, creator_id, status, price, revision_count, created_at, payment_status, service_type",
    )
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

/** A brand's own profile (used on the brand dashboard). */
export async function getBrandProfile(
  userId: string,
): Promise<BrandProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_profiles")
    .select(BRAND_PROFILE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}

/** Brands actively looking for creators (the creator-facing directory). */
export async function listBrandsLookingForCreators(): Promise<BrandProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_profiles")
    .select(BRAND_PROFILE_COLUMNS)
    .eq("looking_for_creators", true)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export interface ConversationSummary {
  id: string;
  counterpartName: string;
  lastMessage: string | null;
  lastAt: string | null;
}

/** Conversations the current user is part of, with counterpart + last message. */
export async function getMyConversations(): Promise<ConversationSummary[]> {
  const me = await getCurrentUser();
  if (!me) return [];
  const supabase = await createClient();

  // RLS scopes these to conversations I'm a party on.
  const { data: convos } = await supabase
    .from("conversations")
    .select("id, brand_id, creator_id, booking_id, created_at")
    .order("created_at", { ascending: false });
  if (!convos || convos.length === 0) return [];

  const creatorIds = [...new Set(convos.map((c) => c.creator_id))];
  const brandIds = [...new Set(convos.map((c) => c.brand_id))];
  const ids = convos.map((c) => c.id);

  const [{ data: creators }, { data: brands }, { data: msgs }] =
    await Promise.all([
      supabase.from("creator_profiles").select("user_id, name").in("user_id", creatorIds),
      supabase.from("brand_profiles").select("user_id, company_name").in("user_id", brandIds),
      supabase
        .from("messages")
        .select("conversation_id, body, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false }),
    ]);

  const creatorName = new Map((creators ?? []).map((c) => [c.user_id, c.name]));
  const brandName = new Map((brands ?? []).map((b) => [b.user_id, b.company_name]));
  const lastByConvo = new Map<string, { body: string; created_at: string }>();
  for (const m of msgs ?? []) {
    if (!lastByConvo.has(m.conversation_id)) {
      lastByConvo.set(m.conversation_id, { body: m.body, created_at: m.created_at });
    }
  }

  return convos.map((c) => {
    const last = lastByConvo.get(c.id);
    const counterpart =
      me.role === "brand"
        ? (creatorName.get(c.creator_id) ?? "Creator")
        : (brandName.get(c.brand_id) ?? "Brand");
    return {
      id: c.id,
      counterpartName: counterpart,
      lastMessage: last?.body ?? null,
      lastAt: last?.created_at ?? null,
    };
  });
}

export interface ConversationDetail {
  id: string;
  counterpartName: string;
  bookingId: string | null;
  messages: Message[];
}

/** A single conversation with its messages, scoped by RLS to its parties. */
export async function getConversation(
  id: string,
): Promise<ConversationDetail | null> {
  const me = await getCurrentUser();
  if (!me) return null;
  const supabase = await createClient();

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, brand_id, creator_id, booking_id")
    .eq("id", id)
    .maybeSingle();
  if (!convo) return null;

  const counterpartId = me.role === "brand" ? convo.creator_id : convo.brand_id;
  const [{ data: messages }, counterpartName] = await Promise.all([
    supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
    me.role === "brand"
      ? supabase
          .from("creator_profiles")
          .select("name")
          .eq("user_id", counterpartId)
          .maybeSingle()
          .then((r) => r.data?.name ?? "Creator")
      : supabase
          .from("brand_profiles")
          .select("company_name")
          .eq("user_id", counterpartId)
          .maybeSingle()
          .then((r) => r.data?.company_name ?? "Brand"),
  ]);

  return {
    id: convo.id,
    counterpartName,
    bookingId: convo.booking_id,
    messages: messages ?? [],
  };
}

/** Find (or lazily create) the conversation tied to a booking. */
export async function getOrCreateBookingConversation(
  bookingId: string,
  brandId: string,
  creatorId: string,
): Promise<string | null> {
  const supabase = await createClient();

  const existing = await supabase
    .from("conversations")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (existing.data) return existing.data.id;

  const inserted = await supabase
    .from("conversations")
    .insert({ brand_id: brandId, creator_id: creatorId, booking_id: bookingId })
    .select("id")
    .maybeSingle();
  if (inserted.data) return inserted.data.id;

  // Race: another request created it first — re-read.
  const retry = await supabase
    .from("conversations")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();
  return retry.data?.id ?? null;
}

/** The current user's recent notifications (newest first). */
export async function getMyNotifications(
  limit = 20,
): Promise<AppNotification[]> {
  const me = await getCurrentUser();
  if (!me) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, user_id, type, title, body, link, read, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/** How many unread notifications the current user has. */
export async function getUnreadNotificationCount(): Promise<number> {
  const me = await getCurrentUser();
  if (!me) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("read", false);
  return count ?? 0;
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
    .select(
      "id, brand_id, creator_id, status, price, revision_count, created_at, payment_status, service_type",
    )
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
