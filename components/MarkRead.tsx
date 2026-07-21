"use client";

import { useEffect } from "react";
import { markConversationRead } from "@/app/actions/messages";

/**
 * Clears the unread marker once a thread has actually been opened.
 *
 * Has to run from the client. The obvious server-side approaches both fail:
 * writing during render gives a GET a side effect, and after() fires once the
 * response is sent, by which point the Supabase client can't finish its
 * cookie-based auth and the write is silently rejected.
 *
 * Calling the action from an effect also fixes the visible symptom, because
 * only a server action's revalidatePath invalidates the browser's router
 * cache - otherwise going back to the inbox re-displays the stale unread dot.
 */
export function MarkRead({ conversationId }: { conversationId: string }) {
  useEffect(() => {
    void markConversationRead(conversationId);
  }, [conversationId]);

  return null;
}
