import { describe, it, expect } from "vitest";
import {
  offeredServices,
  rateFor,
  lowestRate,
  serviceLabel,
  SERVICES,
} from "./services";

// Only the three rate columns matter to these functions.
const creator = (
  ugc: number | null,
  event: number | null,
  broll: number | null,
  whitelist: number | null = null,
  post: number | null = null,
) =>
  ({
    ugc_rate: ugc,
    event_rate: event,
    broll_rate: broll,
    whitelist_rate: whitelist,
    post_rate: post,
  }) as never;

describe("rateFor", () => {
  it("reads the rate for a service", () => {
    expect(rateFor(creator(250, 600, 400), "ugc")).toBe(250);
    expect(rateFor(creator(250, 600, 400), "event")).toBe(600);
    expect(rateFor(creator(250, 600, 400), "broll")).toBe(400);
  });

  it("returns null for a service the creator doesn't offer", () => {
    expect(rateFor(creator(250, null, null), "event")).toBeNull();
  });
});

describe("offeredServices", () => {
  // A blank rate means "I don't do this", NOT "I do it for free". If a null rate
  // ever leaked through as a bookable £0 service, a brand could book that
  // creator for nothing.
  it("only lists services that have a rate set", () => {
    const services = offeredServices(creator(250, null, 400));
    expect(services.map((s) => s.def.key)).toEqual(["ugc", "broll"]);
    expect(services.map((s) => s.rate)).toEqual([250, 400]);
  });

  it("offers nothing when no rates are set", () => {
    expect(offeredServices(creator(null, null, null))).toEqual([]);
  });

  it("treats a genuine zero rate as a real, offered service", () => {
    expect(offeredServices(creator(0, null, null))).toHaveLength(1);
  });
});

describe("lowestRate", () => {
  it("finds the cheapest way to book this creator", () => {
    expect(lowestRate(creator(250, 600, 400))).toBe(250);
    expect(lowestRate(creator(null, 600, 400))).toBe(400);
  });

  it("is null when the creator offers nothing", () => {
    expect(lowestRate(creator(null, null, null))).toBeNull();
  });
});

describe("serviceLabel", () => {
  it("names the services", () => {
    expect(serviceLabel("ugc")).toBe("UGC");
    expect(serviceLabel("event")).toBe("Event Day");
    expect(serviceLabel("broll")).toBe("B-Roll");
  });

  it("shrugs at an unknown service", () => {
    expect(serviceLabel("nonsense")).toBeNull();
    expect(serviceLabel(null)).toBeNull();
  });
});

describe("whitelisting and profile posts", () => {
  it("prices the two audience services", () => {
    const c = creator(250, null, null, 500, 350);
    expect(rateFor(c, "whitelist")).toBe(500);
    expect(rateFor(c, "post")).toBe(350);
  });

  it("names them", () => {
    expect(serviceLabel("whitelist")).toBe("Meta Whitelist");
    expect(serviceLabel("post")).toBe("Influencer Post");
  });

  // A creator who only sells access to their audience is perfectly valid -
  // they never hand over footage at all.
  it("lets a creator offer only the audience services", () => {
    const c = creator(null, null, null, 500, 350);
    expect(offeredServices(c).map((s) => s.def.key)).toEqual([
      "whitelist",
      "post",
    ]);
    expect(lowestRate(c)).toBe(350);
  });

  // Regression guard for the CHECK constraint on bookings.service_type
  // (migration 0032). If SERVICES ever grows past what the database accepts, a
  // creator can advertise a price that no brand is able to book - and the
  // failure lands at the moment of payment.
  it("every service key is one the database will accept", () => {
    const allowedByDb = ["ugc", "event", "broll", "whitelist", "post"];
    expect(SERVICES.map((s) => s.key).sort()).toEqual([...allowedByDb].sort());
  });
});
