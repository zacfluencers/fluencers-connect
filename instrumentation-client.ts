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

  // Noise from the visitor's browser, not from our code. Left unfiltered these
  // drown out real problems: 'window.webkit.messageHandlers' alone accounted
  // for ~75% of all events on 21 Jul, entirely from creators opening invite
  // links inside the Instagram/TikTok in-app browser, which injects its own
  // native bridge and then trips over it. None of these strings appear
  // anywhere in our source.
  ignoreErrors: [
    "window.webkit.messageHandlers",
    "EmptyRanges",
    // Fired by browsers when a layout loop self-corrects. Harmless and
    // unactionable; a long-standing false positive.
    "ResizeObserver loop",
    // Safari's wording when the user navigates away mid-request.
    "cancelled",
    ". cancelled.",
  ],

  // Errors thrown by injected scripts. A password manager or content blocker
  // crashing in a visitor's browser is not our bug and we cannot fix it.
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-(web-)?extension:\/\//i,
  ],
});

// Captures client-side navigation errors (App Router transitions).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
