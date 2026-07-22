import "server-only";
import * as Sentry from "@sentry/nextjs";

/**
 * Wrap a scheduled job so Sentry knows whether it ran.
 *
 * This exists because of a specific, repeated failure: on 21 and 22 July we
 * twice spent a morning unable to answer "did the nudge job run?" - and had to
 * infer it from rows in the database, incorrectly both times. A job that
 * silently stops looks exactly like a job with nothing to do.
 *
 * Sentry's check-ins invert that. The job reports when it starts and how it
 * finished; if a run never arrives, Sentry raises it. Silence becomes a
 * signal rather than an ambiguity.
 *
 * The monitor is created from `schedule` on first check-in, so there is
 * nothing to configure by hand and the schedule can't drift from vercel.json
 * without someone editing both.
 */
export async function withCronMonitor<T>(
  slug: string,
  /** Cron expression, matching vercel.json. */
  schedule: string,
  job: () => Promise<T>,
): Promise<T> {
  return Sentry.withMonitor(slug, job, {
    schedule: { type: "crontab", value: schedule },
    // Vercel does not promise the exact minute, and a job that starts a few
    // minutes late is fine. Only a job that doesn't start is worth waking
    // someone for.
    checkinMargin: 15,
    // Long enough for the slowest real run (nudges pace ~90 emails at 600ms
    // each), short enough that a hung job is reported the same day.
    maxRuntime: 10,
    timezone: "Etc/UTC",
  });
}
