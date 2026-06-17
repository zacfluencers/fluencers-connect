import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { FLOW_STEPS } from "@/lib/bookings";
import { gbp } from "@/lib/format";
import type { BookingStatus } from "@/lib/types";

/** Compact booking summary with a mini progress bar. Links to the deal room. */
export function BookingCard({
  id,
  counterparty,
  sublabel,
  price,
  status,
}: {
  id: string;
  counterparty: string;
  sublabel?: string;
  price: number;
  status: BookingStatus;
}) {
  const onTrack = FLOW_STEPS.includes(status);
  const idx = FLOW_STEPS.indexOf(status);

  return (
    <Link href={`/bookings/${id}`} className="block">
      <Card interactive className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-[var(--foreground)]">
              {counterparty}
            </p>
            {sublabel && (
              <p className="truncate text-sm text-[var(--muted)]">{sublabel}</p>
            )}
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Mini progress */}
        <div className="mt-4 flex gap-1">
          {FLOW_STEPS.map((step, i) => (
            <span
              key={step}
              className={`h-1 flex-1 rounded-full ${
                onTrack && i <= idx
                  ? "bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]"
                  : "bg-white/8"
              }`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-semibold text-[var(--foreground)]">
            {gbp.format(price)}
          </span>
          <span className="text-sm text-[var(--accent-2)]">Open →</span>
        </div>
      </Card>
    </Link>
  );
}
