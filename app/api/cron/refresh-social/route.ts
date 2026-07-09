import { NextResponse } from "next/server";
import {
  refreshActiveCreatorsSocialData,
  refreshFeaturedCreatorsSocialData,
  refreshInactiveCreatorsSocialData,
} from "@/lib/social/enrichment";

/**
 * Scheduled social refresh entry point (NOT wired to a schedule yet).
 *
 * To turn this on, add a Vercel Cron job (Project → Settings → Cron Jobs, or a
 * `crons` entry in vercel config) hitting this route on the cadence you want,
 * and set a `CRON_SECRET` env var. Suggested schedule:
 *   • ?cohort=featured  → daily      (once a "featured" flag exists)
 *   • ?cohort=active    → weekly
 *   • ?cohort=inactive  → monthly
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. We also accept
 * `?secret=` for manual/admin triggers. Without CRON_SECRET set, the route is
 * disabled (503) so it can never be called anonymously in production.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const cohort = new URL(req.url).searchParams.get("cohort") ?? "active";
  let refreshed = 0;
  switch (cohort) {
    case "featured":
      refreshed = await refreshFeaturedCreatorsSocialData();
      break;
    case "inactive":
      refreshed = await refreshInactiveCreatorsSocialData();
      break;
    case "active":
    default:
      refreshed = await refreshActiveCreatorsSocialData();
      break;
  }

  return NextResponse.json({ cohort, refreshed });
}
