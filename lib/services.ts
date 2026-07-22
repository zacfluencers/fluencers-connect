import type { CreatorProfile } from "@/lib/types";

/**
 * The transparent services a creator can be booked for.
 *
 * The first three sell the creator's time and hand the footage over. The last
 * two sell their audience instead: whitelisting licenses their handle for the
 * brand's ads, and a post publishes to their own followers.
 *
 * Adding to this list means adding to the CHECK constraint on
 * bookings.service_type as well (migration 0032) - otherwise a creator can
 * advertise a price that the database refuses to book.
 */
export type ServiceType = "ugc" | "event" | "broll" | "whitelist" | "post";

/**
 * What a creator actually hands over.
 *
 * The first three services produce files. The other two do not: whitelisting
 * hands over *access* to the creator's handle, and an Influencer Post hands
 * over a *live URL*. Sending either of those creators to an "upload your
 * files" box leaves them with nothing to upload and no way to finish.
 */
export type DeliveryKind = "file" | "link" | "note";

export interface DeliveryDef {
  /** Heading for the delivery panel in the deal room. */
  title: string;
  /** What the creator is being asked for, in their words. */
  prompt: string;
  /** Accepted kinds, most important first. */
  kinds: DeliveryKind[];
  linkLabel?: string;
  linkPlaceholder?: string;
  noteLabel?: string;
  notePlaceholder?: string;
  /** Extra note shown to the brand while they wait. */
  brandHint?: string;
}

export interface ServiceDef {
  key: ServiceType;
  label: string;
  /** The matching rate column on creator_profiles. */
  rateField:
    | "ugc_rate"
    | "event_rate"
    | "broll_rate"
    | "whitelist_rate"
    | "post_rate";
  /** Short hint shown under the price. */
  unit: string;
  delivery: DeliveryDef;
  /** Set when the service runs for a period rather than handing over outright. */
  term?: TermDef;
  /**
   * Wording for the brand's "send it back" action. Defaults to revision
   * language, which only fits services where there is creative work to revise.
   */
  revision?: RevisionCopy;
}

export interface RevisionCopy {
  /** The button the brand presses at review. */
  action: string;
  /** Heading on the counter in the deal room. */
  counter: string;
}

const DEFAULT_REVISION: RevisionCopy = {
  action: "Request revision",
  counter: "Revisions",
};

/**
 * A service that runs for a period rather than handing something over outright.
 *
 * The two we sell point in opposite directions, which is why `kind` exists:
 *
 *  - `licence` - the *brand's* rights expire. Whitelisting: they may run ads
 *    for three months, then must stop.
 *  - `commitment` - the *creator* must keep something in place. An Influencer
 *    Post has to stay live for 30 days before they may take it down.
 *
 * Same clock, opposite obligation. Every piece of copy has to pick the right
 * one, or it tells the wrong person they're free.
 */
export interface TermDef {
  kind: "licence" | "commitment";
  /** Exactly one of these. Months are calendar months; days are days. */
  months?: number;
  days?: number;
  /** Heading for the countdown card. */
  label: string;
}

/** Files, the original behaviour. Also used for bookings with no service set. */
const FILE_DELIVERY: DeliveryDef = {
  title: "Content delivery",
  prompt: "Upload the finished content for the brand to review and download.",
  kinds: ["file"],
};

export const SERVICES: ServiceDef[] = [
  {
    key: "ugc",
    label: "UGC",
    rateField: "ugc_rate",
    unit: "per video",
    delivery: FILE_DELIVERY,
  },
  {
    key: "event",
    label: "Event Day",
    rateField: "event_rate",
    unit: "per day",
    delivery: FILE_DELIVERY,
  },
  {
    key: "broll",
    label: "B-Roll",
    rateField: "broll_rate",
    unit: "per pack",
    delivery: FILE_DELIVERY,
  },
  {
    key: "whitelist",
    label: "Meta Whitelist",
    rateField: "whitelist_rate",
    unit: "3 months ad usage",
    // The "3 months" in that unit is a promise to both sides, so it has to be
    // a number the system acts on rather than words on a price list.
    term: { kind: "licence", months: 3, label: "Whitelisting term" },
    // Nothing creative is being revised here - a partnership code either works
    // or it doesn't. The brand still needs to send it back without escalating
    // to a dispute over a typo, so the action stays and only the words change.
    revision: {
      action: "Ask them to fix the access",
      counter: "Fixes requested",
    },
    delivery: {
      title: "Whitelisting access",
      prompt:
        "Add the brand as a partner in Instagram (Settings → Creator tools → Branded content), then record the partnership ad code here so they can start their ads.",
      kinds: ["note", "file"],
      noteLabel: "Partnership ad code, or confirmation of access",
      notePlaceholder:
        "e.g. the partnership ad code, or “Added the brand as an approved partner today”",
      brandHint:
        "The creator records the partnership ad code here once they've granted access in Instagram.",
    },
  },
  {
    key: "post",
    label: "Influencer Post",
    rateField: "post_rate",
    unit: "profile post",
    // Without a minimum, a creator could take the post down the next morning
    // and the booking would still read as complete.
    term: { kind: "commitment", days: 30, label: "Post stays live" },
    delivery: {
      title: "Your post",
      prompt:
        "Publish to your own profile, then paste the link to the live post so the brand can check it.",
      kinds: ["link", "file"],
      linkLabel: "Link to the live post",
      linkPlaceholder: "https://www.instagram.com/p/…",
      brandHint:
        "The creator adds a link to the live post here once it's published.",
    },
  },
];

/**
 * Just the rate columns. Derived from SERVICES so a new service can never be
 * added without this widening to match.
 */
export type CreatorRates = Pick<CreatorProfile, ServiceDef["rateField"]>;

const BY_KEY = new Map(SERVICES.map((s) => [s.key, s]));

export function serviceDef(key: ServiceType): ServiceDef | undefined {
  return BY_KEY.get(key);
}

/**
 * Whether an untrusted string names a real service.
 *
 * Exists because the checkout webhook used to carry its own hardcoded list of
 * three, so when Meta Whitelist and Influencer Post were added on 22 Jul a
 * booking for either would have recorded service_type: null - the money moves
 * but the record of what was sold is lost. Derived from SERVICES so it cannot
 * fall behind again.
 */
export function isServiceType(value: unknown): value is ServiceType {
  return typeof value === "string" && BY_KEY.has(value as ServiceType);
}

/**
 * How delivery works for a booking. Falls back to files, which is right for
 * every booking made before service types existed.
 */
export function deliveryFor(key: string | null | undefined): DeliveryDef {
  return (key && BY_KEY.get(key as ServiceType)?.delivery) || FILE_DELIVERY;
}

/** What sending work back is called for this service. */
export function revisionCopy(key: string | null | undefined): RevisionCopy {
  return (key && BY_KEY.get(key as ServiceType)?.revision) || DEFAULT_REVISION;
}

/** The term a service runs for, or null if it hands over outright. */
export function termFor(key: string | null | undefined): TermDef | null {
  if (!key) return null;
  return BY_KEY.get(key as ServiceType)?.term ?? null;
}

export function serviceLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  return BY_KEY.get(key as ServiceType)?.label ?? null;
}

/** The rate a creator charges for a given service, or null if not offered. */
export function rateFor(
  creator: CreatorRates,
  key: ServiceType,
): number | null {
  const v = creator[BY_KEY.get(key)!.rateField];
  return v == null ? null : Number(v);
}

/** Every service this creator offers (has a rate set for), with its price. */
export function offeredServices(
  creator: CreatorRates,
): { def: ServiceDef; rate: number }[] {
  return SERVICES.map((def) => ({ def, rate: rateFor(creator, def.key) }))
    .filter((s): s is { def: ServiceDef; rate: number } => s.rate != null);
}

/** The lowest rate across all services this creator offers (for "from £x"). */
export function lowestRate(
  creator: CreatorRates,
): number | null {
  const rates = offeredServices(creator).map((s) => s.rate);
  return rates.length ? Math.min(...rates) : null;
}
