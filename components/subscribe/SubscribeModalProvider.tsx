"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  createBrandSubscriptionCheckout,
  getBrandPlansForModal,
} from "@/app/actions/billing";
import {
  BRAND_SUBSCRIBER_BENEFITS,
  type BrandPlanDisplay,
  type BrandPlanKey,
} from "@/lib/billing-plans";

/**
 * A single subscribe popup shared across the whole app. Any button can open it
 * with `useSubscribe().open("why you're seeing this")`; the reason becomes the
 * popup's subheading so the prompt matches what the brand was trying to do.
 *
 * Plans are fetched the first time it opens (not on every page load), then
 * cached for the session. Choosing a plan runs the same Stripe checkout the
 * dashboard uses, so the money path is unchanged.
 */

type SubscribeContext = { open: (reason?: string) => void };

const Ctx = createContext<SubscribeContext | null>(null);

/** Open the subscribe popup from any client component. Safe no-op if unmounted. */
export function useSubscribe(): SubscribeContext {
  return useContext(Ctx) ?? { open: () => {} };
}

export function SubscribeModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  // Plan data - loaded lazily on first open, then kept for the session.
  const [plans, setPlans] = useState<BrandPlanDisplay[] | null>(null);
  const [loading, setLoading] = useState(false);
  const loadedOnce = useRef(false);

  // Checkout state.
  const [pending, startCheckout] = useTransition();
  const [busyPlan, setBusyPlan] = useState<BrandPlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback((why?: string) => {
    setReason(why ?? null);
    setError(null);
    setIsOpen(true);
    // Fetch plans once, the first time the popup is opened.
    if (!loadedOnce.current) {
      loadedOnce.current = true;
      setLoading(true);
      getBrandPlansForModal()
        .then((p) => setPlans(p))
        .catch(() => setPlans([]))
        .finally(() => setLoading(false));
    }
  }, []);

  const close = useCallback(() => {
    if (pending) return; // don't yank the popup away mid-redirect
    setIsOpen(false);
  }, [pending]);

  function choose(plan: BrandPlanKey) {
    setError(null);
    setBusyPlan(plan);
    startCheckout(async () => {
      const res = await createBrandSubscriptionCheckout(plan);
      // Success redirects to Stripe; we only get here on an error.
      if (res && "error" in res) {
        setError(res.error);
        setBusyPlan(null);
      }
    });
  }

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <Modal open={isOpen} onClose={close} title="Unlock full access">
        <p className="text-sm text-[var(--muted)]">
          {reason ?? "Subscribe to book creators, message them and manage your campaigns."}
        </p>

        {/* What they get - the same benefits everywhere, from one list. */}
        <ul className="mt-4 space-y-2">
          {BRAND_SUBSCRIBER_BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
              <CheckIcon />
              {b}
            </li>
          ))}
        </ul>

        <div className="mt-5">
          {loading ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">
              Loading plans…
            </p>
          ) : plans && plans.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {plans.map((plan) => (
                <div
                  key={plan.key}
                  className="flex flex-col rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] p-4"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium text-[var(--foreground)]">
                      {plan.label}
                    </span>
                    <span className="text-sm font-semibold text-[var(--accent-2)]">
                      {plan.priceLabel}
                    </span>
                  </div>
                  <p className="mt-1 mb-4 text-sm text-[var(--muted)]">{plan.blurb}</p>
                  <Button
                    className="mt-auto w-full"
                    disabled={pending}
                    onClick={() => choose(plan.key)}
                  >
                    {busyPlan === plan.key ? "Opening…" : `Choose ${plan.label}`}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-[var(--muted)]">
              Subscriptions aren&apos;t available just yet - check back soon.
            </p>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

        <p className="mt-4 text-center text-xs text-[var(--muted)]">
          Secure checkout by Stripe. Cancel anytime.
        </p>
      </Modal>
    </Ctx.Provider>
  );
}

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-2)]"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
