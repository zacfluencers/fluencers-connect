"use client";

import { useState, useTransition } from "react";
import {
  createBrandSubscriptionCheckout,
  createBillingPortalSession,
} from "@/app/actions/billing";
import { isSubscribed, type BrandPlanKey } from "@/lib/billing-plans";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export interface PlanOption {
  key: BrandPlanKey;
  label: string;
  blurb: string;
  priceLabel: string;
}

/**
 * Brand subscription panel. Shows the available plans (weekly + annual) with a
 * Subscribe button, or — if already subscribed — the current status and a
 * "Manage plan" button that opens the Stripe billing portal.
 */
export function BrandSubscription({
  plans,
  status,
  planKey,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: {
  plans: PlanOption[];
  status: string | null;
  planKey: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [busyPlan, setBusyPlan] = useState<BrandPlanKey | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subscribed = isSubscribed(status);

  function subscribe(plan: BrandPlanKey) {
    setError(null);
    setBusyPlan(plan);
    startTransition(async () => {
      const res = await createBrandSubscriptionCheckout(plan);
      if (res && "error" in res) {
        setError(res.error);
        setBusyPlan(null);
      }
    });
  }

  function manage() {
    setError(null);
    setBusyPlan("portal");
    startTransition(async () => {
      const res = await createBillingPortalSession();
      if (res && "error" in res) {
        setError(res.error);
        setBusyPlan(null);
      }
    });
  }

  if (subscribed) {
    const currentLabel =
      plans.find((p) => p.key === planKey)?.label ?? planKey ?? "your plan";
    const renews = currentPeriodEnd
      ? new Date(currentPeriodEnd).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Badge tone={status === "past_due" ? "danger" : "success"}>
            {status === "past_due" ? "Payment due" : `${currentLabel} plan active`}
          </Badge>
          <p className="mt-2 max-w-md text-sm text-[var(--muted)]">
            {status === "past_due"
              ? "Your last payment didn't go through - update it to keep your plan."
              : cancelAtPeriodEnd
                ? `Your plan ends${renews ? ` on ${renews}` : ""} - you won't be charged again.`
                : renews
                  ? `Renews on ${renews}.`
                  : "Your subscription is active."}
          </p>
          {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
        </div>
        <Button variant="secondary" disabled={pending} onClick={manage}>
          {busyPlan === "portal" ? "Opening…" : "Manage plan"}
        </Button>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Subscriptions aren&apos;t available just yet - check back soon.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className="flex flex-col rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] p-4"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-medium text-[var(--foreground)]">{plan.label}</span>
              <span className="text-sm font-semibold text-[var(--accent-2)]">
                {plan.priceLabel}
              </span>
            </div>
            <p className="mt-1 mb-4 text-sm text-[var(--muted)]">{plan.blurb}</p>
            <Button
              className="mt-auto w-full"
              disabled={pending}
              onClick={() => subscribe(plan.key)}
            >
              {busyPlan === plan.key ? "Opening…" : `Choose ${plan.label}`}
            </Button>
          </div>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </div>
  );
}
