import { STATUS_META } from "@/lib/bookings";
import type { BookingStatus } from "@/lib/types";

const TONE: Record<string, string> = {
  neutral: "bg-[var(--foreground)]/10 text-[var(--muted)]",
  info: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  danger: "bg-[var(--accent)]/15 text-[var(--accent)]",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${TONE[meta.tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}
