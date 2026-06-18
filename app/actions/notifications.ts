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

/** Mark a single notification as read (RLS scopes it to the owner). */
export async function markNotificationRead(
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Please sign in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
