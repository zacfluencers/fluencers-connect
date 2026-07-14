"use client";

import { useActionState, useState } from "react";
import { adminRefundBooking, type AdminActionState } from "@/app/actions/admin";
import { gbp } from "@/lib/format";

/**
 * Refund a booking's escrow back to the brand.
 *
 * Two-step on purpose. This moves real money and can't be undone, so the first
 * click only asks the question — and the confirmation says the amount and the
 * name out loud, because "are you sure?" on its own is a button people learn to
 * click without reading.
 */
export function AdminRefundButton({
  bookingId,
  amount,
  brandName,
  creatorName,
}: {
  bookingId: string;
  amount: number | null;
  brandName: string;
  creatorName: string;
}) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(
    adminRefundBooking,
    null,
  );
  const [confirming, setConfirming] = useState(false);

  if (state && "ok" in state) {
    return <span className="text-xs text-emerald-300">{state.ok}</span>;
  }

  if (!confirming) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-rose-400/40 hover:bg-rose-400/10 hover:text-rose-300"
        >
          Refund
        </button>
        {state && "error" in state && (
          <p className="mt-1 text-xs text-rose-300">{state.error}</p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="min-w-[15rem]">
      <input type="hidden" name="bookingId" value={bookingId} />
      <p className="mb-2 text-xs text-[var(--foreground)]">
        Return{" "}
        <strong className="font-semibold">
          {amount != null ? gbp.format(amount) : "the payment"}
        </strong>{" "}
        to {brandName}? {creatorName} will not be paid, and both will be told.
      </p>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-rose-500/90 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Refunding…" : "Yes, refund"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
      {state && "error" in state && (
        <p className="mt-1 text-xs text-rose-300">{state.error}</p>
      )}
    </form>
  );
}
