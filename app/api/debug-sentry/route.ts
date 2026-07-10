// TEMPORARY diagnostic — verifies Sentry init + which project the DSN targets.
// DSNs are not secret (they ship in the client bundle), but we still only expose
// the host + project id + a short key tail. Delete after confirming.
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const client = Sentry.getClient();
  const dsn =
    (client?.getOptions().dsn as string | undefined) ||
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    process.env.SENTRY_DSN ||
    "";

  let host: string | null = null;
  let projectId: string | null = null;
  let keyTail: string | null = null;
  try {
    const u = new URL(dsn);
    host = u.host;
    projectId = u.pathname.replace(/^\//, "");
    keyTail = u.username ? `…${u.username.slice(-4)}` : null;
  } catch {
    /* dsn unparseable */
  }

  const eventId = Sentry.captureException(
    new Error("Sentry test error — server route (delete me)"),
  );
  const flushed = await Sentry.flush(3000);

  return Response.json({
    dsnPresent: Boolean(dsn),
    clientLive: Boolean(client),
    target: { host, projectId, keyTail },
    eventId,
    flushed,
    note: "Compare `target.projectId` with the project you're viewing in Sentry (Settings → Client Keys shows each project's DSN — the trailing number is its project id).",
  });
}
