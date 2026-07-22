import { describe, it, expect } from "vitest";
import {
  offeredServices,
  rateFor,
  lowestRate,
  serviceLabel,
  SERVICES,
  isServiceType,
  deliveryFor,
  revisionCopy,
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

describe("isServiceType", () => {
  // The checkout webhook used to carry its own hardcoded list of three. When
  // two services were added on 22 Jul it silently recorded service_type: null
  // for them - and it happened to a real £20 booking. Deriving the check from
  // SERVICES is what stops that recurring.
  it("accepts every service we sell", () => {
    for (const s of SERVICES) expect(isServiceType(s.key)).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isServiceType("nonsense")).toBe(false);
    expect(isServiceType(null)).toBe(false);
    expect(isServiceType(undefined)).toBe(false);
    expect(isServiceType(123)).toBe(false);
  });
});

describe("deliveryFor", () => {
  // The deal room only ever accepted uploads. Whitelisting hands over a
  // partnership ad code and a profile post hands over a live URL, so both
  // creators arrived at an upload box with nothing to upload.
  it("asks for a code, not a file, on a whitelist", () => {
    const d = deliveryFor("whitelist");
    expect(d.kinds).toContain("note");
    expect(d.kinds[0]).toBe("note");
  });

  it("asks for a link on an influencer post", () => {
    const d = deliveryFor("post");
    expect(d.kinds[0]).toBe("link");
  });

  it("still asks for files on the content services", () => {
    for (const key of ["ugc", "event", "broll"]) {
      expect(deliveryFor(key).kinds).toEqual(["file"]);
    }
  });

  // Bookings made before service types existed carry a null service_type, and
  // every one of them was a file delivery.
  it("falls back to files for unknown or missing services", () => {
    expect(deliveryFor(null).kinds).toEqual(["file"]);
    expect(deliveryFor(undefined).kinds).toEqual(["file"]);
    expect(deliveryFor("nonsense").kinds).toEqual(["file"]);
  });

  it("gives every service a heading and a prompt", () => {
    for (const s of SERVICES) {
      expect(s.delivery.title).not.toBe("");
      expect(s.delivery.prompt).not.toBe("");
      expect(s.delivery.kinds.length).toBeGreaterThan(0);
    }
  });

  // An input with no label is an unexplained empty box, which for a code or a
  // post URL is exactly as unhelpful as the upload box it replaced.
  it("labels whichever input it offers", () => {
    for (const s of SERVICES) {
      if (s.delivery.kinds.includes("link")) {
        expect(s.delivery.linkLabel).toBeTruthy();
      }
      if (s.delivery.kinds.includes("note")) {
        expect(s.delivery.noteLabel).toBeTruthy();
      }
    }
  });
});

describe("revisionCopy", () => {
  // "Request revision" is creative-work language. A partnership ad code either
  // works or it doesn't, so on a whitelist the same button has to say what it
  // actually does - while still existing, because without it a brand holding a
  // broken code can only approve it or raise a dispute.
  it("asks for a fix, not a revision, on a whitelist", () => {
    expect(revisionCopy("whitelist").action).toBe("Ask them to fix the access");
    expect(revisionCopy("whitelist").counter).toBe("Fixes requested");
  });

  it("keeps revision wording where there is creative work to revise", () => {
    for (const key of ["ugc", "event", "broll", "post"]) {
      expect(revisionCopy(key).action).toBe("Request revision");
      expect(revisionCopy(key).counter).toBe("Revisions");
    }
  });

  it("falls back to revision wording for a booking with no service", () => {
    expect(revisionCopy(null).action).toBe("Request revision");
    expect(revisionCopy("nonsense").counter).toBe("Revisions");
  });

  it("never leaves a button or counter unlabelled", () => {
    for (const s of SERVICES) {
      expect(revisionCopy(s.key).action).not.toBe("");
      expect(revisionCopy(s.key).counter).not.toBe("");
    }
  });
});
