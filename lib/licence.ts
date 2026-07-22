import { licenceMonthsFor } from "@/lib/services";

/**
 * The clock on a Meta Whitelist.
 *
 * Whitelisting doesn't hand over a file, it hands over a *term*: the brand may
 * run ads from the creator's handle for three months. Nothing in the system
 * recorded when that started or ended, which makes it the one thing on a
 * booking with no answer when the two sides disagree - the brand thinks the
 * clock started when they paid, the creator thinks it started when they granted
 * access, and neither can prove it.
 *
 * The clock starts at approval. That's the moment the platform records the work
 * as delivered, it's already an explicit action by the brand, and it can't run
 * while a revision is outstanding.
 */

/** Days before expiry that both sides get a warning. */
export const LICENCE_WARNING_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Add whole months, clamping to the end of a short month.
 *
 * 30 November plus three months is 28 February (29 in a leap year), not
 * 2 March. Naively bumping the month number rolls over, which would quietly
 * hand a brand two extra days of ad rights.
 */
export function addMonths(from: Date, months: number): Date {
  const day = from.getUTCDate();
  const result = new Date(from.getTime());
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDayOfTarget = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();

  result.setUTCDate(Math.min(day, lastDayOfTarget));
  return result;
}

/**
 * The licence window for a booking approved at `approvedAt`, or null when the
 * service doesn't sell a term (UGC, B-Roll, Event Day and posts hand over
 * something outright).
 */
export function licenceWindow(
  serviceType: string | null | undefined,
  approvedAt: Date,
): { startsAt: Date; endsAt: Date } | null {
  const months = licenceMonthsFor(serviceType);
  if (months == null) return null;
  return { startsAt: approvedAt, endsAt: addMonths(approvedAt, months) };
}

export type LicenceState = "active" | "ending" | "ended";

/**
 * Where a licence stands right now.
 *
 * `days` is always counted from `now` to the end date, rounded up, so a licence
 * ending later today reads as 1 day rather than 0 - nobody describes "today" as
 * zero days left.
 */
export function licenceStatus(
  endsAt: Date,
  now: Date,
): { state: LicenceState; days: number } {
  const remainingMs = endsAt.getTime() - now.getTime();
  if (remainingMs <= 0) {
    return { state: "ended", days: Math.ceil(-remainingMs / DAY_MS) };
  }
  const days = Math.ceil(remainingMs / DAY_MS);
  return {
    state: days <= LICENCE_WARNING_DAYS ? "ending" : "active",
    days,
  };
}
