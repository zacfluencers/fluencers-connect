import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import type {
  AppUser,
  AppNotification,
  Booking,
  BookingAsset,
  BookingBrief,
  BookingDeliverable,
  BookingStatus,
  BrandBilling,
  BrandProfile,
  CreatorProfile,
  Message,
  PortfolioItem,
} from "@/lib/types";

const BOOKING_BRIEF_COLUMNS =
  "booking_id, campaign_name, objective, target_audience, platform, deliverables, creative_brief, talking_points, cta, must_include, avoid, deadline, payment, usage_rights, product_mode, shipping_tracking, product_link, discount_code, updated_at";

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

/** Brand IDs the current creator has favourited (empty if signed out). */
export async function getFavoriteBrandIds(): Promise<Set<string>> {
  const me = await getCurrentUser();
  if (!me) return new Set();
  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_favorites")
    .select("brand_id")
    .eq("user_id", me.id);
  return new Set((data ?? []).map((r) => r.brand_id));
}

/** Full brand profiles the current creator has favourited (most recent first). */
export async function getFavoriteBrands(): Promise<BrandProfile[]> {
  const me = await getCurrentUser();
  if (!me) return [];
  const supabase = await createClient();

  const { data: favs } = await supabase
    .from("brand_favorites")
    .select("brand_id")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false });

  const ids = (favs ?? []).map((f) => f.brand_id);
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("brand_profiles")
    .select(BRAND_PROFILE_COLUMNS)
    .in("user_id", ids);

  const byId = new Map((data ?? []).map((b) => [b.user_id, b]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as BrandProfile[];
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

/** The campaign brief for a booking (null if the brand hasn't started one). */
export async function getBookingBrief(
  bookingId: string,
): Promise<BookingBrief | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("booking_briefs")
    .select(BOOKING_BRIEF_COLUMNS)
    .eq("booking_id", bookingId)
    .maybeSingle();
  return (data as BookingBrief) ?? null;
}

/**
 * Swap each row's stored path for a short-lived signed URL. The deliverables /
 * briefs buckets are private (see migration 0020), so files are only reachable
 * through a time-limited signed URL minted here, server-side, for a booking
 * party. Rows without a storage_path keep whatever url they had (legacy).
 */
async function withSignedUrls<
  T extends { url: string; storage_path: string | null },
>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  rows: T[],
): Promise<T[]> {
  const paths = rows
    .map((r) => r.storage_path)
    .filter((p): p is string => Boolean(p));
  if (paths.length === 0) return rows;

  const { data: signed } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, 60 * 60); // 1 hour

  const byPath = new Map(
    (signed ?? [])
      .filter((s) => s.signedUrl && !s.error)
      .map((s) => [s.path, s.signedUrl]),
  );

  return rows.map((r) =>
    r.storage_path && byPath.has(r.storage_path)
      ? { ...r, url: byPath.get(r.storage_path)! }
      : r,
  );
}

/** Reference files attached to a booking brief (as signed URLs). */
export async function getBookingAssets(
  bookingId: string,
): Promise<BookingAsset[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("booking_assets")
    .select("id, booking_id, url, storage_path, name, size, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  return withSignedUrls(supabase, "briefs", data ?? []);
}

/** Content files the creator has delivered for a booking (as signed URLs). */
export async function getBookingDeliverables(
  bookingId: string,
): Promise<BookingDeliverable[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("booking_deliverables")
    .select("id, booking_id, url, storage_path, name, size, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  return withSignedUrls(supabase, "deliverables", data ?? []);
}

/** A brand's own subscription/billing state (read-only; RLS scopes to self). */
export async function getBrandBilling(
  userId: string,
): Promise<BrandBilling | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_billing")
    .select(
      "user_id, stripe_customer_id, status, price_id, plan, current_period_end, cancel_at_period_end, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();
  return (data as BrandBilling) ?? null;
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
  counterpartImage: string | null;
  lastMessage: string | null;
  lastAt: string | null;
  bookingId: string | null;
  bookingStatus: BookingStatus | null;
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
  const bookingIds = [
    ...new Set(convos.map((c) => c.booking_id).filter(Boolean)),
  ] as string[];

  const [{ data: creators }, { data: brands }, { data: msgs }, { data: bks }] =
    await Promise.all([
      supabase.from("creator_profiles").select("user_id, name, profile_image").in("user_id", creatorIds),
      supabase.from("brand_profiles").select("user_id, company_name, logo_url").in("user_id", brandIds),
      supabase
        .from("messages")
        .select("conversation_id, body, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false }),
      bookingIds.length
        ? supabase.from("bookings").select("id, status").in("id", bookingIds)
        : Promise.resolve({ data: [] as { id: string; status: BookingStatus }[] }),
    ]);

  const creatorName = new Map((creators ?? []).map((c) => [c.user_id, c.name]));
  const creatorImage = new Map((creators ?? []).map((c) => [c.user_id, c.profile_image]));
  const brandName = new Map((brands ?? []).map((b) => [b.user_id, b.company_name]));
  const brandLogo = new Map((brands ?? []).map((b) => [b.user_id, b.logo_url]));
  const bookingStatus = new Map(
    (bks ?? []).map((b) => [b.id, b.status as BookingStatus]),
  );
  const lastByConvo = new Map<string, { body: string; created_at: string }>();
  for (const m of msgs ?? []) {
    if (!lastByConvo.has(m.conversation_id)) {
      lastByConvo.set(m.conversation_id, { body: m.body, created_at: m.created_at });
    }
  }

  return convos.map((c) => {
    const last = lastByConvo.get(c.id);
    const isBrandViewer = me.role === "brand";
    const counterpart = isBrandViewer
      ? (creatorName.get(c.creator_id) ?? "Creator")
      : (brandName.get(c.brand_id) ?? "Brand");
    const counterpartImage = isBrandViewer
      ? (creatorImage.get(c.creator_id) ?? null)
      : (brandLogo.get(c.brand_id) ?? null);
    return {
      id: c.id,
      counterpartName: counterpart,
      counterpartImage,
      lastMessage: last?.body ?? null,
      lastAt: last?.created_at ?? null,
      bookingId: c.booking_id ?? null,
      bookingStatus: c.booking_id
        ? (bookingStatus.get(c.booking_id) ?? null)
        : null,
    };
  });
}

export interface ConversationDetail {
  id: string;
  counterpartName: string;
  counterpartImage: string | null;
  counterpartId: string;
  counterpartRole: "brand" | "creator";
  bookingId: string | null;
  bookingStatus: BookingStatus | null;
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
  const counterpartRole = me.role === "brand" ? "creator" : "brand";
  const counterpartQuery =
    me.role === "brand"
      ? supabase
          .from("creator_profiles")
          .select("name, profile_image")
          .eq("user_id", counterpartId)
          .maybeSingle()
          .then((r) => ({
            name: r.data?.name ?? "Creator",
            image: r.data?.profile_image ?? null,
          }))
      : supabase
          .from("brand_profiles")
          .select("company_name, logo_url")
          .eq("user_id", counterpartId)
          .maybeSingle()
          .then((r) => ({
            name: r.data?.company_name ?? "Brand",
            image: r.data?.logo_url ?? null,
          }));

  const [{ data: messages }, counterpart, bookingStatus] = await Promise.all([
    supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
    counterpartQuery,
    convo.booking_id
      ? supabase
          .from("bookings")
          .select("status")
          .eq("id", convo.booking_id)
          .maybeSingle()
          .then((r) => (r.data?.status as BookingStatus) ?? null)
      : Promise.resolve(null),
  ]);

  return {
    id: convo.id,
    counterpartName: counterpart.name,
    counterpartImage: counterpart.image,
    counterpartId,
    counterpartRole,
    bookingId: convo.booking_id,
    bookingStatus,
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
