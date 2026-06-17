import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { STATUS_META } from "@/lib/bookings";
import type { BookingStatus } from "@/lib/types";

// Map the data-layer tones onto the brand palette (no amber/yellow — strict palette).
const TONE_MAP: Record<string, BadgeTone> = {
  neutral: "neutral",
  info: "info",
  warn: "active",
  success: "success",
  danger: "danger",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const meta = STATUS_META[status];
  return <Badge tone={TONE_MAP[meta.tone]}>{meta.label}</Badge>;
}
