/**
 * Keep production on one hostname.
 *
 * Vercel serves every project on a generated `*.vercel.app` address as well as
 * its real domain. Both run the same code, but cookies belong to whichever
 * hostname set them - so a visitor who lands on the generated address is
 * silently signed OUT, with no clue why.
 *
 * That is not theoretical: on 21 Jul the Stripe payout return URL pointed at
 * the generated address, and creators finishing payout setup arrived logged
 * out. Confirmation emails sent that morning still carry those links.
 *
 * Redirecting is deliberate rather than blocking the address outright (which
 * Vercel's Standard Protection would do): those outstanding email links belong
 * to real creators, and a "log in to Vercel" wall would strand the very people
 * the emails were meant to rescue.
 */

export function canonicalRedirect(args: {
  /** Full URL of the incoming request. */
  requestUrl: string;
  /** Host header as sent by the browser. */
  host: string | null;
  /** NEXT_PUBLIC_SITE_URL - the one true origin. */
  siteUrl: string | undefined;
  /** VERCEL_ENV: production | preview | development. */
  vercelEnv: string | undefined;
}): string | null {
  const { requestUrl, host, siteUrl, vercelEnv } = args;

  // Production only. Preview deployments are *served* on generated
  // *.vercel.app hostnames, so redirecting there would make every preview
  // bounce to production - breaking the only place changes get reviewed.
  if (vercelEnv !== "production") return null;
  if (!siteUrl || !host) return null;

  let canonical: URL;
  try {
    canonical = new URL(siteUrl);
  } catch {
    // A malformed value must not take the site down: better to serve the page
    // on the wrong hostname than to redirect everyone somewhere invalid.
    return null;
  }
  if (!canonical.host) return null;
  if (host.toLowerCase() === canonical.host.toLowerCase()) return null;

  let target: URL;
  try {
    target = new URL(requestUrl);
  } catch {
    return null;
  }

  // Carry the path and query across, so an email link lands where it meant to
  // rather than dumping the visitor on the home page.
  return `${canonical.origin}${target.pathname}${target.search}`;
}
