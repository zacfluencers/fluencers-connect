/**
 * Detect the cut-down browsers embedded inside social apps.
 *
 * This matters because creators are invited through Instagram and TikTok, so
 * they tap the link and land in that app's built-in browser rather than Safari
 * or Chrome. Those browsers are unreliable at exactly the three things our
 * signup depends on: uploading files, keeping a login session, and rendering
 * React consistently (they were the source of ~75% of our Sentry events, plus
 * the hydration failure on /signup?...&fbclid=).
 *
 * Nothing we can fix in our own code makes those browsers work properly. The
 * only reliable remedy is telling the person to reopen the page in a real
 * browser, so this exists to decide when to say that.
 */

/** Human-readable app name, or null when this is a normal browser. */
export function detectInAppBrowser(userAgent: string): string | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();

  // Instagram and TikTok are the two we actually send people through.
  if (ua.includes("instagram")) return "Instagram";
  // TikTok's webview identifies itself variously by region/build.
  if (
    ua.includes("bytedancewebview") ||
    ua.includes("musical_ly") ||
    ua.includes("tiktok")
  ) {
    return "TikTok";
  }
  // Facebook: FBAN (app name) / FBAV (app version) are the stable markers.
  if (ua.includes("fban") || ua.includes("fbav") || ua.includes("fb_iab")) {
    return "Facebook";
  }
  if (ua.includes("snapchat")) return "Snapchat";
  if (ua.includes("linkedinapp")) return "LinkedIn";
  if (ua.includes("pinterest")) return "Pinterest";
  return null;
}

/**
 * How to escape, per app. Worth being specific: "open in your browser" is
 * useless advice if you can't find the button.
 */
export function escapeHint(app: string): string {
  switch (app) {
    case "Instagram":
    case "Facebook":
      return "tap the ••• menu in the top corner, then \"Open in browser\"";
    case "TikTok":
      return "tap the ••• menu in the top right, then \"Open in browser\"";
    default:
      return "open this page in Safari or Chrome";
  }
}
