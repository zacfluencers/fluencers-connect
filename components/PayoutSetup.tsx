"use client";

import { useState, useTransition } from "react";
import { startCreatorOnboarding } from "@/app/actions/payments";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/** Creator payout onboarding (Stripe Express). */
export function PayoutSetup({
  hasAccount,
  payoutsEnabled,
}: {
  hasAccount: boolean;
  payoutsEnabled: boolean;
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
        <p className="mt-2 max-w-md text-sm text-[var(--muted)]">
          {payoutsEnabled
            ? "You're ready to receive payouts when bookings complete."
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
