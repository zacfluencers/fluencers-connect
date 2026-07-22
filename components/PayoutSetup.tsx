"use client";

import { useState, useTransition } from "react";
import { startCreatorOnboarding } from "@/app/actions/payments";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { gbp } from "@/lib/format";

/** Creator payout onboarding (Stripe Express). */
export function PayoutSetup({
  hasAccount,
  payoutsEnabled,
  owed = 0,
}: {
  hasAccount: boolean;
  payoutsEnabled: boolean;
  /** Approved work whose money is waiting on payout setup. */
  owed?: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        {payoutsEnabled ? (
          <Badge tone="success">Payouts active</Badge>
        ) : hasAccount ? (
          <Badge tone="info">Setup incomplete</Badge>
        ) : (
          <Badge tone="neutral">Not set up</Badge>
        )}

        {/* A real amount is a far stronger prompt than "connect an account",
            which is why the money is named before anything else. */}
        {owed > 0 && !payoutsEnabled && (
          <p className="mt-2 font-semibold text-[var(--foreground)]">
            {gbp.format(owed)} is waiting for you.
          </p>
        )}

        <p className="mt-2 max-w-md text-sm text-[var(--muted)]">
          {payoutsEnabled
            ? "You're ready to receive payouts when bookings complete."
            : owed > 0
              ? "Your work was approved and the money is being held for you. Finish payout setup and it's sent automatically - you don't need to claim it."
              : "Connect a Stripe account to get paid. Funds are released from escrow when a brand approves your work."}
        </p>
        {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
      </div>

      {!payoutsEnabled && (
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await startCreatorOnboarding();
              if (result && "error" in result) setError(result.error);
            });
          }}
        >
          {pending ? "Opening…" : hasAccount ? "Finish payout setup" : "Set up payouts"}
        </Button>
      )}
    </div>
  );
}
