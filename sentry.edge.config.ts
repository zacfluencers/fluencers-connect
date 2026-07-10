// Sentry initialisation for the Edge runtime (proxy.ts / any edge routes).
// Loaded by instrumentation.ts. No-ops without a DSN.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  enableLogs: true,
});
