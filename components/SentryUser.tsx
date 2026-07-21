"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/client";

/**
 * Tell Sentry which signed-in account an error came from.
 *
 * Without this every issue reports "0 users", which makes the list impossible
 * to triage: 8 errors could be one person clicking twice or eight people
 * blocked. The user count is the single thing that separates "annoying" from
 * "drop everything".
 *
 * Only the account ID is sent, never the email. It's an opaque UUID, so Sentry
 * can count and group distinct people without us handing a third party a list
 * of our users' email addresses.
 */
export function SentryUser() {
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      Sentry.setUser(session?.user ? { id: session.user.id } : null);
    });

    // Keep it current across sign-in/sign-out without a page reload, so errors
    // aren't attributed to whoever was signed in previously.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      Sentry.setUser(session?.user ? { id: session.user.id } : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
