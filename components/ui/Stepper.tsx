import { FLOW_STEPS, STATUS_META } from "@/lib/bookings";
import type { BookingStatus } from "@/lib/types";

/**
 * Horizontal status tracker for the booking flow. Off-track states
 * (declined / refunded) render the track greyed with a note.
 */
export function Stepper({ status }: { status: BookingStatus }) {
  const onTrack = FLOW_STEPS.includes(status);
  const currentIdx = FLOW_STEPS.indexOf(status);

  return (
    <div>
      <ol className="flex items-center">
        {FLOW_STEPS.map((step, i) => {
          const done = onTrack && i < currentIdx;
          const current = onTrack && i === currentIdx;
          const isLast = i === FLOW_STEPS.length - 1;

          return (
            <li key={step} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                    current
                      ? "border-transparent bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-white shadow-[0_0_20px_-2px_rgba(132,105,237,0.8)]"
                      : done
                        ? "border-[var(--accent-2)]/40 bg-[var(--accent)]/30 text-[#d6ccff]"
                        : "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--muted)]"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span
                  className={`mt-2 hidden whitespace-nowrap text-xs sm:block ${
                    current
                      ? "font-medium text-[var(--foreground)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {STATUS_META[step].label}
                </span>
              </div>

              {!isLast && (
                <span className="mx-2 h-px flex-1 bg-gradient-to-r from-transparent via-[var(--border-strong)] to-transparent">
                  <span
                    className={`block h-px origin-left transition-transform duration-500 ${
                      done
                        ? "scale-x-100 bg-[var(--accent-2)]/60"
                        : "scale-x-0"
                    }`}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {!onTrack && (
        <p className="mt-4 text-sm text-rose-300/80">
          This booking was {STATUS_META[status].label.toLowerCase()}.
        </p>
      )}
    </div>
  );
}
