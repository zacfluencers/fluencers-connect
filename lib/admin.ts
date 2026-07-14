import "server-only";
import { notFound, redirect } from "next/navigation";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/session";
import type { AppUser } from "@/lib/types";

/**
 * Is this user an admin?
 *
 * The check reads `admin_users` with the SERVICE-ROLE key, because that table
 * has RLS on and no policies — it is deliberately invisible to the key browsers
 * hold. That's what stops a signed-in user from reading who the admins are, or
 * writing themselves a row.
 *
 * Note this is orthogonal to `role`. An admin is still a brand or a creator;
 * being an admin is an extra permission on top, not a replacement for it.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  // Fail CLOSED. Without a service-role key we cannot verify anyone, so nobody
  // is an admin. (Billing deliberately fails *open* in local demo mode; this
  // must not — an unverifiable admin check has to mean "no".)
  if (!isAdminConfigured()) return false;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[admin] check failed:", error.message);
    return false;
  }
  return Boolean(data);
}

/**
 * Gate an admin page or action. Returns the signed-in admin, or stops the render.
 *
 * A non-admin gets a 404, not a "you're not allowed" — there's no reason to tell
 * a stranger that an admin area exists at all.
 */
export async function requireAdmin(): Promise<AppUser> {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!(await isAdmin(me.id))) notFound();
  return me;
}
