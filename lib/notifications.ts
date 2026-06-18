import type { SupabaseClient } from "@supabase/supabase-js";

interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
}

/**
 * Best-effort: deliver a notification to a recipient. Uses whichever Supabase
 * client the caller passes — the acting user's client (RLS allows notifying a
 * booking/conversation counterparty) or the admin client (webhook context).
 * Never throws; a failed notification must not break the underlying action.
 */
export async function notify(
  supabase: SupabaseClient,
  { userId, type, title, body = null, link = null }: NotifyInput,
): Promise<void> {
  try {
    await supabase
      .from("notifications")
      .insert({ user_id: userId, type, title, body, link });
  } catch {
    // swallow — notifications are non-critical
  }
}
