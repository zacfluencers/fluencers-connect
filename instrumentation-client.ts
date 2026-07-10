// Sentry initialisation for the browser. Next.js loads this automatically on the
// client. No-ops without NEXT_PUBLIC_SENTRY_DSN.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",
});

// Captures client-side navigation errors (App Router transitions).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
