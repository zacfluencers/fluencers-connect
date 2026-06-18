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

/** A creator's public marketplace profile (1:1 with a `creator` user). */
export interface CreatorProfile {
  user_id: string;
  name: string;
  bio: string | null;
  niche: string | null;
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
