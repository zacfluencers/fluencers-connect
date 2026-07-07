"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createBookingCheckout } from "@/app/actions/payments";
import { gbp } from "@/lib/format";
import type { ServiceType } from "@/lib/services";

type Offered = { key: ServiceType; label: string; unit: string; rate: number };

/**
 * The booking panel on a creator profile: one transparent price per service,
 * each with its own "Request & pay" button. Pays into escrow at request time;
 * the creator still accepts or declines.
 */
export function ServiceBooking({
  creatorId,
  services,
  available,
  viewerRole,
  locked = false,
}: {
  creatorId: string;
  services: Offered[];
  available: boolean;
  viewerRole: "brand" | "creator" | null;
  /** Brand is signed in but not subscribed — show a Subscribe prompt. */
  locked?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<ServiceType | null>(null);
  const [pending, startTransition] = useTransition();

  function book(service: ServiceType) {
    setError(null);
    setBusy(service);
    startTransition(async () => {
      const result = await createBookingCheckout(creatorId, service);
      if (result && "error" in result) {
        setError(result.error);
        setBusy(null);
      }
    });
  }

  if (services.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] p-5 text-sm text-[var(--muted)]">
        This creator hasn&apos;t published their rates yet.
      </div>
    );
  }

  // Signed-out visitors see what's offered, but pricing + booking are gated.
  if (viewerRole === null) {
    return (
      <div className="rounded-2xl border border-[var(--border)] p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
          Services offered
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {services.map((s) => (
            <span
              key={s.key}
              className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-sm text-[var(--foreground)]"
            >
              {s.label}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Sign up to see transparent pricing and send a booking request.
        </p>
        <Link
          href="/signup"
          className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[var(--accent-2)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9079f0]"
        >
          Sign up to see pricing &amp; book
        </Link>
      </div>
    );
  }

  // Unsubscribed brand — browse only. Pricing + booking are behind the plan.
  if (viewerRole === "brand" && locked) {
    return (
      <div className="rounded-2xl border border-[var(--border)] p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
          Services offered
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {services.map((s) => (
            <span
              key={s.key}
              className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-sm text-[var(--foreground)]"
            >
              {s.label}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Subscribe to see pricing, book, and message creators.
        </p>
        <Link
          href="/dashboard/brand"
          className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[var(--accent-2)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9079f0]"
        >
          Subscribe to see more
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] p-5">
      <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
        Transparent pricing
      </p>

      <div className="mt-3 divide-y divide-[var(--border)]">
        {services.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="font-medium text-[var(--foreground)]">{s.label}</p>
              <p className="text-xs text-[var(--muted)]">{s.unit}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-[var(--foreground)]">
                {gbp.format(s.rate)}
              </span>
              {viewerRole === null ? (
                <Link
                  href="/login"
                  className="rounded-full bg-[var(--accent-2)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#9079f0]"
                >
                  Sign in to book
                </Link>
              ) : viewerRole === "brand" ? (
                <button
                  type="button"
                  onClick={() => book(s.key)}
                  disabled={!available || pending}
                  className="rounded-full bg-[var(--accent-2)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#9079f0] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy === s.key ? "Redirecting…" : "Request & pay"}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {viewerRole === "creator" && (
        <p className="mt-3 text-sm text-[var(--muted)]">
          Creators can&apos;t book other creators.
        </p>
      )}
      {viewerRole === "brand" && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Paid into escrow — released only when you approve the work.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
    </div>
  );
}
