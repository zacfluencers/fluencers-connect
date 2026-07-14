import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Reads for the admin area. Every one of these uses the service-role client,
 * which bypasses RLS — that's the whole point (an admin needs to see other
 * people's data, which RLS exists to prevent). Nothing in this file may be
 * called without `requireAdmin()` having passed first.
 */

export interface AdminStats {
  creators: number;
  brands: number;
  subscribedBrands: number;
  bookings: number;
  /** Money currently sitting in escrow, i.e. paid but not yet released. */
  heldPence: number;
  /** Money paid out to creators. */
  releasedPence: number;
  refundedPence: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const admin = createAdminClient();

  const [users, billing, bookings] = await Promise.all([
    admin.from("users").select("role"),
    admin.from("brand_billing").select("status"),
    admin.from("bookings").select("price, payment_status"),
  ]);

  const roles = users.data ?? [];
  const rows = bookings.data ?? [];

  // Sum in pence to dodge floating-point drift on money.
  const sumBy = (status: string) =>
    rows
      .filter((b) => b.payment_status === status)
      .reduce((total, b) => total + Math.round(Number(b.price ?? 0) * 100), 0);

  const ACTIVE = ["active", "trialing", "past_due"];

  return {
    creators: roles.filter((u) => u.role === "creator").length,
    brands: roles.filter((u) => u.role === "brand").length,
    subscribedBrands: (billing.data ?? []).filter((b) =>
      ACTIVE.includes(String(b.status)),
    ).length,
    bookings: rows.length,
    heldPence: sumBy("held"),
    releasedPence: sumBy("released"),
    refundedPence: sumBy("refunded"),
  };
}

export interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  name: string | null;
  createdAt: string | null;
  subscription: string | null;
  isAdmin: boolean;
}

/** Every user, newest first, with their profile name and subscription state. */
export async function listAdminUsers(query?: string): Promise<AdminUserRow[]> {
  const admin = createAdminClient();

  const [users, creators, brands, billing, admins, auth] = await Promise.all([
    admin.from("users").select("id, email, role"),
    admin.from("creator_profiles").select("user_id, name"),
    admin.from("brand_profiles").select("user_id, company_name"),
    admin.from("brand_billing").select("user_id, status"),
    admin.from("admin_users").select("user_id"),
    // public.users has no created_at — the signup date only exists in auth.
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const nameOf = new Map<string, string>();
  for (const c of creators.data ?? []) nameOf.set(c.user_id, c.name);
  for (const b of brands.data ?? []) nameOf.set(b.user_id, b.company_name);

  const subOf = new Map((billing.data ?? []).map((b) => [b.user_id, b.status]));
  const adminIds = new Set((admins.data ?? []).map((a) => a.user_id));
  const createdOf = new Map(
    (auth.data?.users ?? []).map((u) => [u.id, u.created_at ?? null]),
  );

  const rows: AdminUserRow[] = (users.data ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    name: nameOf.get(u.id) ?? null,
    createdAt: createdOf.get(u.id) ?? null,
    subscription: subOf.get(u.id) ?? null,
    isAdmin: adminIds.has(u.id),
  }));

  const q = query?.trim().toLowerCase();
  const matched = q
    ? rows.filter(
        (r) =>
          r.email.toLowerCase().includes(q) ||
          (r.name ?? "").toLowerCase().includes(q),
      )
    : rows;

  return matched.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export interface AdminBookingRow {
  id: string;
  status: string;
  paymentStatus: string;
  price: number | null;
  serviceType: string | null;
  createdAt: string;
  brandName: string;
  creatorName: string;
  paymentIntentId: string | null;
  /** Can an admin still refund this one? */
  refundable: boolean;
}

/** Money can only come back while it's actually still held in escrow. */
const REFUNDABLE_PAYMENT_STATUS = "held";

export async function listAdminBookings(): Promise<AdminBookingRow[]> {
  const admin = createAdminClient();

  const { data: bookings } = await admin
    .from("bookings")
    .select(
      "id, status, payment_status, price, service_type, created_at, brand_id, creator_id, stripe_payment_intent_id",
    )
    .order("created_at", { ascending: false });

  if (!bookings?.length) return [];

  const [brands, creators] = await Promise.all([
    admin.from("brand_profiles").select("user_id, company_name"),
    admin.from("creator_profiles").select("user_id, name"),
  ]);

  const brandName = new Map((brands.data ?? []).map((b) => [b.user_id, b.company_name]));
  const creatorName = new Map((creators.data ?? []).map((c) => [c.user_id, c.name]));

  return bookings.map((b) => ({
    id: b.id,
    status: b.status,
    paymentStatus: b.payment_status,
    price: b.price == null ? null : Number(b.price),
    serviceType: b.service_type,
    createdAt: b.created_at,
    brandName: brandName.get(b.brand_id) ?? "Unknown brand",
    creatorName: creatorName.get(b.creator_id) ?? "Unknown creator",
    paymentIntentId: b.stripe_payment_intent_id,
    refundable: b.payment_status === REFUNDABLE_PAYMENT_STATUS,
  }));
}
