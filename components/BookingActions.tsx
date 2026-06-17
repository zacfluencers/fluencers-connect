"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { transitionBooking } from "@/app/actions/bookings";
import type { BookingAction, Transition } from "@/lib/bookings";

/**
 * Renders the transition buttons available to the current user for a booking.
 * Used on both the creator dashboard and the booking detail page.
 */
export function BookingActions({
  bookingId,
  actions,
}: {
  bookingId: string;
  actions: Transition[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: BookingAction) {
    setError(null);
    startTransition(async () => {
      const result = await transitionBooking(bookingId, action);
      if (result && "error" in result) setError(result.error ?? "Action failed.");
      else router.refresh();
    });
  }

  if (actions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((t) => (
          <button
            key={t.action}
            type="button"
            disabled={pending}
            onClick={() => run(t.action)}
            className={buttonClass(t.intent) + " disabled:opacity-50"}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-rose-300">{error}</p>}
    </div>
  );
}

function buttonClass(intent: Transition["intent"]) {
  const base =
    "rounded-full px-5 py-2 text-sm font-semibold transition-colors";
  if (intent === "primary")
    return `${base} bg-[var(--accent)] text-white hover:opacity-90`;
  if (intent === "danger")
    return `${base} border border-[var(--accent-2)]/40 text-[var(--accent-2)] hover:bg-[var(--accent-2)]/10`;
  return `${base} border border-[var(--border-strong)] text-[var(--foreground)] hover:border-[var(--accent-2)]/50`;
}
