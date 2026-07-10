import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { getBaseUrl } from "@/lib/stripe/server";
import { sendEmail, isEmailConfigured, renderNotificationEmail } from "@/lib/email";

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
 *
 * Also sends a transactional email (via Resend) to the recipient. The email is
 * dispatched with `after()` so it runs *after* the response is sent — it never
 * adds latency to the user's action, and it's fully best-effort (no email
 * provider configured, or a send failure, is silently ignored).
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

  // Fire the email off the request's critical path.
  if (isEmailConfigured() && isAdminConfigured()) {
    try {
      after(async () => {
        try {
          // Look up the recipient's email with the service-role client so this
          // works regardless of the acting user's RLS visibility.
          const admin = createAdminClient();
          const { data: recipient } = await admin
            .from("users")
            .select("email")
            .eq("id", userId)
            .maybeSingle();
          const to = recipient?.email;
          if (!to) return;

          const url = link ? `${getBaseUrl()}${link}` : getBaseUrl();
          const { html, text } = renderNotificationEmail({ title, body, url });
          await sendEmail({ to, subject: title, html, text });
        } catch (e) {
          console.error("[notify email] failed:", e instanceof Error ? e.message : e);
        }
      });
    } catch {
      // after() can only be called within a request scope; if we're somehow
      // outside one, skip the email rather than throw.
    }
  }
}
