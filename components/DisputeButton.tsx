"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/**
 * Opens a dispute/refund request. UI only — actual refund processing depends on
 * escrow (not built). Submitting just confirms the request was logged.
 */
export function DisputeButton() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

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
        {sent ? (
          <div className="text-sm text-[var(--muted)]">
            <p className="text-[var(--foreground)]">Your dispute has been logged.</p>
            <p className="mt-2">
              Our team reviews disputes within 48 hours. Funds remain held in
              escrow until it&apos;s resolved.
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
              If the content doesn&apos;t match what was agreed, you can open a
              dispute. Escrowed funds stay held until it&apos;s resolved.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => setSent(true)}>
                Submit dispute
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
