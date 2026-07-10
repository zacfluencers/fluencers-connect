// Sentry initialisation for the Node.js server runtime (server components,
// server actions, route handlers). Loaded by instrumentation.ts.
//
// DSN falls back to the public var so a single NEXT_PUBLIC_SENTRY_DSN configures
// everything; set a separate SENTRY_DSN if you prefer. No-ops when unset.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  // Attach local variable values to stack frames for richer server traces.
  includeLocalVariables: true,
  enableLogs: true,
});
