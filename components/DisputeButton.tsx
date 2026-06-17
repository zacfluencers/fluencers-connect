"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { refundBooking } from "@/app/actions/payments";

/**
 * Brand-initiated refund / dispute. Refunds the escrowed payment back to the
 * brand and marks the booking refunded.
 *
 * NOTE: this is an immediate brand-initiated refund. True dispute *adjudication*
 * (who decides when work was delivered) is a later trust-&-safety stage.
 */
export function DisputeButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await refundBooking(bookingId);
      if ("error" in result) setError(result.error);
      else {
        setDone(true);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-[var(--muted)] underline-offset-4 transition-colors hover:text-rose-300 hover:underline"
      >
        Dispute / request refund
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Request a refund">
        {done ? (
          <div className="text-sm text-[var(--muted)]">
            <p className="text-[var(--foreground)]">Refund issued.</p>
            <p className="mt-2">
              The escrowed funds are being returned to your original payment
              method.
            </p>
            <div className="mt-5 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-[var(--muted)]">
            <p>
              If the work isn&apos;t as agreed, you can refund this booking. The
              escrowed payment is returned to you and the booking is closed.
            </p>
            {error && <p className="mt-3 text-rose-300">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={submit} disabled={pending}>
                {pending ? "Refunding…" : "Refund booking"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
