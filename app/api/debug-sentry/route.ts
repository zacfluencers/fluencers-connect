// TEMPORARY diagnostic — verifies Sentry is initialised and can deliver events.
// Reports whether the DSN reached the runtime + whether a Sentry client is live,
// then explicitly captures and flushes a test error. Delete after confirming.
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const dsnPresent = Boolean(
    process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  );
  const clientLive = Boolean(Sentry.getClient());

  const eventId = Sentry.captureException(
    new Error("Sentry test error — server route (delete me)"),
  );
  // Serverless functions can freeze before the event is sent — force a flush.
  const flushed = await Sentry.flush(3000);

  return Response.json({
    dsnPresent,
    clientLive,
    eventId,
    flushed,
    note: "If dsnPresent + clientLive are true, check Sentry Issues for the event.",
  });
}
