import type { NextConfig } from "next";

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

export default nextConfig;
