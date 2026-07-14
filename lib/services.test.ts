import { describe, it, expect } from "vitest";
import { offeredServices, rateFor, lowestRate, serviceLabel } from "./services";

// Only the three rate columns matter to these functions.
const creator = (ugc: number | null, event: number | null, broll: number | null) =>
  ({ ugc_rate: ugc, event_rate: event, broll_rate: broll }) as never;

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
