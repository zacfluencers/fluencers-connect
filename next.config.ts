import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Baseline production security headers, applied to every route.
 * - X-Frame-Options SAMEORIGIN keeps the Sanity Presentation preview working
 *   (the /studio editor iframes the site on the same origin) while blocking
 *   third-party framing/clickjacking.
 * - No strict CSP here on purpose: the app loads Stripe.js, the Sanity Studio,
 *   Supabase and inline styles, which a naive CSP would break. Revisit with a
 *   tested policy if needed.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

/**
 * Wrap with Sentry for production error tracking. Source maps only upload when
 * SENTRY_AUTH_TOKEN (+ SENTRY_ORG / SENTRY_PROJECT) are set at build time;
 * without them the build still succeeds and errors still report (just with
 * minified stack traces). Reads org/project from env automatically.
 */
export default withSentryConfig(nextConfig, {
  org: "fluencers-group",
  project: "javascript-nextjs",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Upload more client bundles so stack traces are readable.
  widenClientFileUpload: true,
  // Route browser events through our own domain to dodge ad-blockers.
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
