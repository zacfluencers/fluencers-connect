import { termFor } from "@/lib/services";

/**
 * The clock on a service that runs for a period.
 *
 * Two services have one, pointing in opposite directions. A Meta Whitelist is a
 * *licence*: the brand may run ads from the creator's handle for three months,
 * then must stop. An Influencer Post is a *commitment*: the creator must keep
 * the post live for 30 days before they may take it down.
 *
 * Neither was recorded anywhere, which made them the only parts of a booking
 * with no answer when the two sides disagreed - the brand dates a licence from
 * when they paid, the creator from when they granted access, and nobody can
 * prove it either way.
 *
 * The clock starts at approval. That's the moment the platform records the work
 * as delivered, it's already an explicit action by the brand, and it can't run
 * while a revision is outstanding.
 *
 * The database columns are named `licence_*` for both kinds; `TermDef.kind` is
 * what decides who the clock actually binds.
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

/** Add whole days. Terms measured in days need no month-end clamping. */
export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * DAY_MS);
}

/**
 * The term window for a booking approved at `approvedAt`, or null when the
 * service hands over outright (UGC, B-Roll and Event Day).
 */
export function licenceWindow(
  serviceType: string | null | undefined,
  approvedAt: Date,
): { startsAt: Date; endsAt: Date } | null {
  const term = termFor(serviceType);
  if (!term) return null;
  const endsAt =
    term.months != null
      ? addMonths(approvedAt, term.months)
      : addDays(approvedAt, term.days ?? 0);
  return { startsAt: approvedAt, endsAt };
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
