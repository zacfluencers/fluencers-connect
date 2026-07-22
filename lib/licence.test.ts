import { describe, it, expect } from "vitest";
import {
  addMonths,
  licenceWindow,
  licenceStatus,
  LICENCE_WARNING_DAYS,
} from "./licence";

const utc = (iso: string) => new Date(iso);

describe("addMonths", () => {
  it("adds whole months", () => {
    expect(addMonths(utc("2026-07-22T10:00:00Z"), 3).toISOString()).toBe(
      "2026-10-22T10:00:00.000Z",
    );
  });

  it("crosses the year boundary", () => {
    expect(addMonths(utc("2026-11-15T09:30:00Z"), 3).toISOString()).toBe(
      "2027-02-15T09:30:00.000Z",
    );
  });

  // The one that silently hands over extra days: naively bumping the month
  // number turns 30 November into 2 March.
  it("clamps to the last day of a shorter month", () => {
    expect(addMonths(utc("2026-11-30T12:00:00Z"), 3).toISOString()).toBe(
      "2027-02-28T12:00:00.000Z",
    );
    expect(addMonths(utc("2026-08-31T12:00:00Z"), 3).toISOString()).toBe(
      "2026-11-30T12:00:00.000Z",
    );
  });

  it("knows about leap years", () => {
    expect(addMonths(utc("2027-11-29T12:00:00Z"), 3).toISOString()).toBe(
      "2028-02-29T12:00:00.000Z",
    );
  });

  it("keeps the time of day", () => {
    expect(addMonths(utc("2026-01-10T23:59:59Z"), 3).toISOString()).toBe(
      "2026-04-10T23:59:59.000Z",
    );
  });
});

describe("licenceWindow", () => {
  it("gives a whitelist three months from approval", () => {
    const w = licenceWindow("whitelist", utc("2026-07-22T10:00:00Z"));
    expect(w?.startsAt.toISOString()).toBe("2026-07-22T10:00:00.000Z");
    expect(w?.endsAt.toISOString()).toBe("2026-10-22T10:00:00.000Z");
  });

  // Everything else hands something over outright. Stamping an end date on a
  // UGC booking would imply the brand's rights expire, which is not what was
  // sold and would be worse than recording nothing.
  it("gives no window to services that sell no term", () => {
    for (const key of ["ugc", "event", "broll", "post"]) {
      expect(licenceWindow(key, utc("2026-07-22T10:00:00Z"))).toBeNull();
    }
  });

  it("gives no window to a booking with no service recorded", () => {
    expect(licenceWindow(null, utc("2026-07-22T10:00:00Z"))).toBeNull();
    expect(licenceWindow("nonsense", utc("2026-07-22T10:00:00Z"))).toBeNull();
  });
});

describe("licenceStatus", () => {
  const ends = utc("2026-10-22T10:00:00Z");

  it("is active with plenty of time left", () => {
    expect(licenceStatus(ends, utc("2026-08-01T10:00:00Z"))).toEqual({
      state: "active",
      days: 82,
    });
  });

  it("switches to ending inside the warning window", () => {
    const s = licenceStatus(ends, utc("2026-10-16T10:00:00Z"));
    expect(s.state).toBe("ending");
    expect(s.days).toBe(6);
  });

  it("is still active one day outside the warning window", () => {
    const justOutside = utc("2026-10-15T09:00:00Z");
    expect(licenceStatus(ends, justOutside).days).toBe(LICENCE_WARNING_DAYS + 1);
    expect(licenceStatus(ends, justOutside).state).toBe("active");
  });

  // "0 days left" reads as expired to everyone, so a licence ending later
  // today has to say 1.
  it("counts a licence ending later today as one day", () => {
    expect(licenceStatus(ends, utc("2026-10-22T09:00:00Z"))).toEqual({
      state: "ending",
      days: 1,
    });
  });

  it("is ended at the moment it expires", () => {
    expect(licenceStatus(ends, ends).state).toBe("ended");
  });

  it("counts days since expiry once ended", () => {
    expect(licenceStatus(ends, utc("2026-10-25T10:00:00Z"))).toEqual({
      state: "ended",
      days: 3,
    });
  });
});
