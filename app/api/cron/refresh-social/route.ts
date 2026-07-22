import { NextResponse } from "next/server";
import { withCronMonitor } from "@/lib/cron-monitor";
import {
  refreshActiveCreatorsSocialData,
  refreshFeaturedCreatorsSocialData,
  refreshInactiveCreatorsSocialData,
  refreshUnsyncedCreatorsSocialData,
  mirrorPendingSocialAvatars,
} from "@/lib/social/enrichment";

/**
 * Scheduled social refresh entry point. Schedules live in `vercel.json`:
 *   • ?cohort=unsynced  → daily   (SCHEDULED) safety net: creators with a handle
 *                         but no stats yet. Each creator qualifies at most once.
 *   • ?cohort=active    → weekly  (SCHEDULED) keep available creators current.
 *   • ?cohort=avatars   → daily   (SCHEDULED) copy any still-external profile
 *                         picture into our storage. No provider calls.
 *   • ?cohort=featured  → daily   (not scheduled — needs a "featured" flag first)
 *   • ?cohort=inactive  → monthly (not scheduled)
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

  // Only the three scheduled cohorts are monitored. `featured` and `inactive`
  // are run by hand, and a monitor for a job with no schedule would alert
  // every time nobody ran it.
  const schedule = MONITORED_COHORTS[cohort];
  if (schedule) {
    const refreshed = await withCronMonitor(
      `refresh-social-${cohort}`,
      schedule,
      () => runCohort(cohort),
    );
    return NextResponse.json({ cohort, refreshed });
  }
  return NextResponse.json({ cohort, refreshed: await runCohort(cohort) });
}

/** Schedules mirrored from vercel.json. */
const MONITORED_COHORTS: Record<string, string> = {
  unsynced: "0 5 * * *",
  active: "0 6 * * 1",
  avatars: "30 6 * * *",
};

async function runCohort(cohort: string): Promise<number> {
  let refreshed = 0;
  switch (cohort) {
    case "unsynced":
      refreshed = await refreshUnsyncedCreatorsSocialData();
      break;
    case "featured":
      refreshed = await refreshFeaturedCreatorsSocialData();
      break;
    case "avatars":
      refreshed = await mirrorPendingSocialAvatars();
      break;
    case "inactive":
      refreshed = await refreshInactiveCreatorsSocialData();
      break;
    case "active":
    default:
      refreshed = await refreshActiveCreatorsSocialData();
      break;
  }
  return refreshed;
}
