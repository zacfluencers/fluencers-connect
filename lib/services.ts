import type { CreatorProfile } from "@/lib/types";

/** The three transparent services a creator can be booked for. */
export type ServiceType = "ugc" | "event" | "broll";

export interface ServiceDef {
  key: ServiceType;
  label: string;
  /** The matching rate column on creator_profiles. */
  rateField: "ugc_rate" | "event_rate" | "broll_rate";
  /** Short hint shown under the price. */
  unit: string;
}

export const SERVICES: ServiceDef[] = [
  { key: "ugc", label: "UGC", rateField: "ugc_rate", unit: "per video" },
  { key: "event", label: "Event Day", rateField: "event_rate", unit: "per day" },
  { key: "broll", label: "B-Roll", rateField: "broll_rate", unit: "per pack" },
];

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
  creator: Pick<CreatorProfile, "ugc_rate" | "event_rate" | "broll_rate">,
  key: ServiceType,
): number | null {
  const v = creator[BY_KEY.get(key)!.rateField];
  return v == null ? null : Number(v);
}

/** Every service this creator offers (has a rate set for), with its price. */
export function offeredServices(
  creator: Pick<CreatorProfile, "ugc_rate" | "event_rate" | "broll_rate">,
): { def: ServiceDef; rate: number }[] {
  return SERVICES.map((def) => ({ def, rate: rateFor(creator, def.key) }))
    .filter((s): s is { def: ServiceDef; rate: number } => s.rate != null);
}

/** The lowest rate across all services this creator offers (for "from £x"). */
export function lowestRate(
  creator: Pick<CreatorProfile, "ugc_rate" | "event_rate" | "broll_rate">,
): number | null {
  const rates = offeredServices(creator).map((s) => s.rate);
  return rates.length ? Math.min(...rates) : null;
}
