import { NextResponse } from "next/server";
import { sendLicenceReminders } from "@/lib/licence-reminders";
import { withCronMonitor } from "@/lib/cron-monitor";

/**
 * Whitelisting licence reminders.
 *
 * Scheduled daily at 09:00 UTC (see `vercel.json`). Daily is right even though
 * most runs find nobody: the query owns the "who is due" rules, and each
 * booking is only ever told once because the job stamps the row.
 *
 * `?dryRun=1` reports how many *would* be told and sends nothing.
 *
 * Auth: same shared secret as the other cron jobs.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("secret") === secret;
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";

  // A dry run is a human checking the audience, not the scheduled job - only
  // the real run counts as a check-in, or a manual peek would mask a scheduled
  // run that never happened.
  const result = dryRun
    ? await sendLicenceReminders({ dryRun })
    : await withCronMonitor("licence-reminders", "0 9 * * *", () =>
        sendLicenceReminders({ dryRun }),
      );
  return NextResponse.json(result);
}
