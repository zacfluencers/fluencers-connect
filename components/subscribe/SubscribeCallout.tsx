"use client";

import { useEffect, useState } from "react";
import { SubscribeButton } from "./SubscribeButton";

/**
 * A dismissible "unlock full access" strip for unsubscribed brands, shown at the
 * top of the dashboard and the marketplace. Dismissal is remembered per browser
 * (localStorage) so we nudge without nagging - the popup and the dashboard
 * Membership panel are still there whenever they're ready.
 */
export function SubscribeCallout({
  storageKey,
  heading = "Unlock full access",
  body = "Book creators, message them and save shortlists. Browsing is free - subscribe when you're ready to reach out.",
  reason,
  cta = "See plans",
}: {
  /** Unique key so each placement remembers its own dismissal. */
  storageKey: string;
  heading?: string;
  body?: string;
  reason?: string;
  cta?: string;
}) {
  // Start hidden and reveal after checking storage, so a dismissed banner never
  // flashes in. localStorage can throw (private mode) - treat that as "show".
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(storageKey) === "1";
    } catch {
      dismissed = false; // storage blocked (private mode) - show the banner
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a client-only dismissal flag on mount
    if (!dismissed) setVisible(true);
  }, [storageKey]);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore - a non-dismissible banner is fine */
    }
  }

  if (!visible) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-gradient-to-r from-[var(--accent)]/20 to-[var(--surface-2)] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pr-6">
        <div className="min-w-0">
          <p className="font-semibold text-[var(--foreground)]">{heading}</p>
          <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">{body}</p>
        </div>
        <SubscribeButton reason={reason} size="md">
          {cta}
        </SubscribeButton>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 rounded-lg p-1 text-[var(--muted)] transition-colors hover:bg-white/10 hover:text-[var(--foreground)]"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94Z" />
        </svg>
      </button>
    </div>
  );
}
