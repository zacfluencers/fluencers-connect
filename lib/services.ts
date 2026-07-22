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
}

export const SERVICES: ServiceDef[] = [
  { key: "ugc", label: "UGC", rateField: "ugc_rate", unit: "per video" },
  { key: "event", label: "Event Day", rateField: "event_rate", unit: "per day" },
  { key: "broll", label: "B-Roll", rateField: "broll_rate", unit: "per pack" },
  {
    key: "whitelist",
    label: "Meta Whitelist",
    rateField: "whitelist_rate",
    unit: "3 months ad usage",
  },
  {
    key: "post",
    label: "Influencer Post",
    rateField: "post_rate",
    unit: "profile post",
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
