// Sentry initialisation for the browser. Next.js loads this automatically on the
// client (the current pattern — replaces the older sentry.client.config.ts).
// No-ops without NEXT_PUBLIC_SENTRY_DSN.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Full tracing in dev, light sampling in prod (errors are always captured).
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  // Session Replay: record 10% of sessions, and 100% of sessions with an error.
  // Sentry masks all text + inputs by default, so no PII is recorded.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
  integrations: [Sentry.replayIntegration()],
});

// Captures client-side navigation errors (App Router transitions).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
