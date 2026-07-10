// Sentry initialisation for the Node.js server runtime (server components,
// server actions, route handlers). Loaded by instrumentation.ts.
//
// If NEXT_PUBLIC_SENTRY_DSN is unset (e.g. local dev), Sentry no-ops — nothing
// is sent. Errors only report from production builds with a DSN configured.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Low sample rate for performance traces — errors are always captured
  // regardless. Fine to raise later; keeps quota safe at launch.
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",
});
