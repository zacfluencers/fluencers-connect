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

/** A row in public.bookings. */
export interface Booking {
  id: string;
  brand_id: string;
  creator_id: string;
  status: BookingStatus;
  price: number;
  revision_count: number;
  created_at: string;
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
  price: number;
  profile_image: string | null;
  instagram_followers: number | null;
  tiktok_followers: number | null;
  followers_synced_at: string | null;
}

/** One uploaded portfolio image for a creator. */
export interface PortfolioItem {
  id: string;
  creator_id: string;
  image_url: string;
  storage_path: string | null;
  sort_order: number;
  created_at: string;
}
