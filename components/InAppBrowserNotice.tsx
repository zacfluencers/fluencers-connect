"use client";

import { useSyncExternalStore } from "react";
import { detectInAppBrowser, escapeHint } from "@/lib/in-app-browser";

// The user agent never changes for the life of the page, so there is nothing
// to subscribe to - but useSyncExternalStore is still the right tool: it gives
// a separate server snapshot, so the server renders nothing and the client
// fills it in. Reading navigator during render would itself cause the kind of
// hydration mismatch this banner exists to warn about.
const neverChanges = () => () => {};
const clientSnapshot = () => detectInAppBrowser(navigator.userAgent);
const serverSnapshot = () => null;

/**
 * Warn creators who opened an invite link inside Instagram or TikTok.
 *
 * Their built-in browsers routinely fail to upload files and lose the login
 * session part-way through, which looks to the creator like our site is
 * broken - they press Save, nothing happens, and they give up. We can't fix
 * their browser, so the honest move is to say so before they waste the effort.
 *
 * Runs in an effect rather than on the server because the page is cached: the
 * banner has to depend on the person viewing it, not on whoever triggered the
 * render.
 */
export function InAppBrowserNotice() {
  const app = useSyncExternalStore(
    neverChanges,
    clientSnapshot,
    serverSnapshot,
  );

  if (!app) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-center text-sm text-amber-100"
    >
      You&apos;re viewing this inside {app}. Uploads and saving often fail here
      - to be safe, {escapeHint(app)}.
    </div>
  );
}
