/** Shapes mirroring the database schema in supabase/migrations/0001_init.sql. */

export type UserRole = "brand" | "creator";

export type BookingStatus =
  | "requested"
  | "declined"
  | "accepted"
  | "in_progress"
  | "in_review"
  | "completed"
  | "refunded";

/** A row in public.users. */
export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
}

export type PaymentStatus = "unpaid" | "held" | "released" | "refunded";

/** Which transparent service a booking is for. */
export type ServiceType = "ugc" | "event" | "broll";

/** A row in public.bookings. */
export interface Booking {
  id: string;
  brand_id: string;
  creator_id: string;
  status: BookingStatus;
  price: number;
  revision_count: number;
  created_at: string;
  payment_status: PaymentStatus;
  service_type: ServiceType | null;
}

/** How a physical product (if any) reaches the creator for a booking. */
export type ProductMode = "none" | "ship" | "order";

/** The detailed campaign brief a brand fills in for a booking (1:1). */
export interface BookingBrief {
  booking_id: string;
  campaign_name: string | null;
  objective: string | null;
  target_audience: string | null;
  platform: string | null;
  deliverables: string | null;
  creative_brief: string | null;
  talking_points: string | null;
  cta: string | null;
  must_include: string | null;
  avoid: string | null;
  deadline: string | null;
  payment: string | null;
  usage_rights: string | null;
  product_mode: ProductMode;
  shipping_tracking: string | null;
  product_link: string | null;
  discount_code: string | null;
  updated_at: string;
}

/** A reference file attached to a booking brief. */
export interface BookingAsset {
  id: string;
  booking_id: string;
  url: string;
  storage_path: string | null;
  name: string | null;
  size: number | null;
  created_at: string;
}

/** A brand's Stripe subscription state (1:1 with a `brand` user). */
export interface BrandBilling {
  user_id: string;
  stripe_customer_id: string | null;
  status: string | null;
  price_id: string | null;
  plan: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  updated_at: string;
}

/** A delivered content file the creator uploads for the brand to review. */
export interface BookingDeliverable {
  id: string;
  booking_id: string;
  url: string;
  storage_path: string | null;
  name: string | null;
  size: number | null;
  created_at: string;
}

/** A creator's public marketplace profile (1:1 with a `creator` user). */
export interface CreatorProfile {
  user_id: string;
  name: string;
  bio: string | null;
  niche: string | null;
  /** Extra niches this creator matches in search. Summarised, not listed, on cards. */
  secondary_niches: string[];
  instagram: string | null;
  tiktok: string | null;
  availability: boolean;
  /** Legacy single price — kept in sync with the lowest service rate. */
  price: number | null;
  /** Per-service rates (GBP). Null = not offered. */
  ugc_rate: number | null;
  event_rate: number | null;
  broll_rate: number | null;
  gender: string | null;
  age: number | null;
  country: string | null;
  profile_image: string | null;
  instagram_followers: number | null;
  tiktok_followers: number | null;
  followers_synced_at: string | null;
  /** Imported social avatars (fallback when no custom profile_image). */
  instagram_avatar: string | null;
  tiktok_avatar: string | null;
  /** Best available engagement rate (%), from social enrichment. */
  engagement_rate: number | null;
}

/**
 * Imported public data for one of a creator's social accounts (1 row per
 * creator+platform). Source of truth for enrichment; the card-facing fields are
 * mirrored onto CreatorProfile. See supabase/migrations/0022.
 */
export interface CreatorSocialAccount {
  id: string;
  creator_id: string;
  platform: "instagram" | "tiktok";
  handle: string;
  profile_url: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  follower_count: number | null;
  following_count: number | null;
  post_count: number | null;
  average_likes: number | null;
  average_views: number | null;
  engagement_rate: number | null;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

/** One uploaded portfolio item (a 9:16 vertical video) for a creator. */
export interface PortfolioItem {
  id: string;
  creator_id: string;
  image_url: string; // media URL (now a video)
  storage_path: string | null;
  sort_order: number;
  created_at: string;
}

/** A brand's profile — what they're looking for. */
export interface BrandProfile {
  user_id: string;
  company_name: string;
  about: string | null;
  budget_min: number | null;
  budget_max: number | null;
  looking_for_creators: boolean;
  logo_url: string | null;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  created_at: string;
}

/** A notification delivered to a user. */
export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

/** A message inside a conversation. */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}
