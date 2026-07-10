// TEMPORARY diagnostic — inspects the raw DSN env value for corruption and shows
// which project it targets. DSNs are not secret. Delete after confirming.
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const raw = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN ?? "";
  // Strip surrounding quotes/whitespace the way a correct value wouldn't need.
  const cleaned = raw.trim().replace(/^["']|["']$/g, "").trim();

  let host: string | null = null;
  let projectId: string | null = null;
  try {
    const u = new URL(cleaned);
    host = u.host;
    projectId = u.pathname.replace(/^\//, "");
  } catch {
    /* still unparseable even after cleaning */
  }

  const eventId = Sentry.captureException(
    new Error("Sentry test error — server route (delete me)"),
  );
  const flushed = await Sentry.flush(3000);

  return Response.json({
    rawLength: raw.length,
    startsWith: raw.slice(0, 9),
    endsWith: raw.slice(-6),
    hadQuotesOrWhitespace: raw !== cleaned,
    parsedAfterClean: { host, projectId },
    eventId,
    flushed,
    note: "host null after cleaning = the DSN value itself is wrong/truncated. host present but events still missing = wrong project.",
  });
}
