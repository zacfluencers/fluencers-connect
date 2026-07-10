// Sentry initialisation for the Edge runtime (proxy.ts / any edge routes).
// Loaded by instrumentation.ts. No-ops without NEXT_PUBLIC_SENTRY_DSN.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",
});
