import { cache } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { AppUser } from "@/lib/types";

/**
 * The signed-in user, including their app role from public.users.
 * Returns null when nobody is logged in (or the DB isn't configured).
 *
 * Cached per request. Nearly every page calls this, and so does the nav that
 * wraps it, so the same two lookups (an auth check and a `users` read) were
 * running two or three times per page load - each one a round trip to the
 * database. Who you are cannot change halfway through rendering a page, so the
 * repeat calls were pure latency.
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<AppUser | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, email, role")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? null;
});
