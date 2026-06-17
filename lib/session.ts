import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { AppUser } from "@/lib/types";

/**
 * The signed-in user, including their app role from public.users.
 * Returns null when nobody is logged in (or the DB isn't configured).
 */
export async function getCurrentUser(): Promise<AppUser | null> {
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
}
