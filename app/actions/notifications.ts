"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";

/** Mark every one of the current user's notifications as read. */
export async function markAllNotificationsRead(): Promise<
  { ok: true } | { error: string }
> {
  const me = await getCurrentUser();
  if (!me) return { error: "Please sign in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", me.id)
    .eq("read", false);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Mark a single notification as read. Scoped to the owner (RLS + explicit filter). */
export async function markNotificationRead(
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Please sign in." };

  const supabase = await createClient();
  // Explicit owner filter in addition to RLS — a mismatched id is a harmless
  // no-op (marking read is idempotent), so we don't surface an error for it.
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", me.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
