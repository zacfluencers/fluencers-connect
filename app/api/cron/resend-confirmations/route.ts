import { NextResponse } from "next/server";
import { resendSignupConfirmations } from "@/lib/signup-confirmations";

/**
 * Confirmation-email recovery job.
 *
 * Scheduled 08:00 UTC (09:00 UK) — see `vercel.json`. Runs before the profile
 * nudge so anyone who confirms straight away isn't also nudged minutes later.
 *
 * Daily is safe despite this being a one-off recovery: eligibility is "has
 * never been resent", so the backlog drains on the first run and every run
 * afterwards finds nobody. It stays scheduled to catch any future account that
 * misses its confirmation email.
 *
 * `?dryRun=1` reports who would be emailed and sends nothing.
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
  const result = await resendSignupConfirmations({ dryRun });
  return NextResponse.json({ dryRun, ...result });
}
