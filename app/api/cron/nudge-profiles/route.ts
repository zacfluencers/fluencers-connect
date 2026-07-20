import { NextResponse } from "next/server";
import { sendProfileNudges } from "@/lib/profile-nudge";

/**
 * "Finish your profile" nudge job.
 *
 * NOT SCHEDULED YET — deliberately absent from `vercel.json` until the email
 * copy has been signed off, because this one writes to real people's inboxes
 * rather than to the database. To turn it on, add:
 *
 *   { "path": "/api/cron/nudge-profiles", "schedule": "0 10 * * *" }
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
  const result = await sendProfileNudges({ dryRun });
  return NextResponse.json({ dryRun, ...result });
}
