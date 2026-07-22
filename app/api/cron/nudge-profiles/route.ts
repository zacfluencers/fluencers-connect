import { NextResponse } from "next/server";
import { sendProfileNudges } from "@/lib/profile-nudge";
import { withCronMonitor } from "@/lib/cron-monitor";

/**
 * "Finish your profile" nudge job.
 *
 * Scheduled daily at 10:00 UTC (see `vercel.json`), enabled once the copy was
 * signed off — this is the one job that writes to real people's inboxes rather
 * than to the database, so it was held back until then.
 *
 * Daily is right even though almost every run finds nobody: the SQL side owns
 * the age, cap and spacing rules, so running often just means people are nudged
 * promptly rather than repeatedly.
 *
 * `?dryRun=1` reports who *would* be emailed and sends nothing.
 *
 * Auth: same shared secret as the social refresh cron.
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
  // the real run should count as a check-in, or a manual peek would mask a
  // scheduled run that never happened.
  const result = dryRun
    ? await sendProfileNudges({ dryRun })
    : await withCronMonitor("nudge-profiles", "30 8 * * *", () =>
        sendProfileNudges({ dryRun }),
      );
  return NextResponse.json({ dryRun, ...result });
}
