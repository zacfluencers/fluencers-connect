"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBookingCheckout } from "@/app/actions/payments";
import { gbp } from "@/lib/format";
import type { ServiceType } from "@/lib/services";

type Offered = { key: ServiceType; label: string; rate: number };

/**
 * "Auto book" — a fast, pre-filled booking request. Brands pick which service
 * they want; the chosen service + rate are pre-filled and they pay into escrow
 * in one step. The creator still accepts or declines, as normal.
 */
export function AutoBookButton({
  creatorId,
  services,
  viewerRole,
  available,
  locked = false,
}: {
  creatorId: string;
  services: Offered[];
  viewerRole: "brand" | "creator" | null;
  available: boolean;
  /** Brand is signed in but not subscribed — route to plans instead of booking. */
  locked?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (viewerRole === "creator" || services.length === 0) return null;

  function book(service: ServiceType) {
    if (viewerRole === null) {
      router.push("/login");
      return;
    }
    if (locked) {
      router.push("/dashboard/brand");
      return;
    }
    setError(null);
    setOpen(false);
    startTransition(async () => {
      const result = await createBookingCheckout(creatorId, service);
      // On success the action redirects to Stripe Checkout; only errors return.
      if (result && "error" in result) setError(result.error);
    });
  }

  // One service → book it directly; several → small picker.
  const single = services.length === 1 ? services[0] : null;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={pending || (!locked && !available)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (locked) {
            router.push("/dashboard/brand");
            return;
          }
          if (single) book(single.key);
          else setOpen((v) => !v);
        }}
        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-2)] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#9079f0] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
        </svg>
        {pending
          ? "Opening…"
          : locked
            ? "Subscribe to book"
            : single
              ? `Auto book · ${gbp.format(single.rate)}`
              : "Auto book"}
      </button>

      {open && !single && !locked && (
        <div
          className="absolute bottom-full left-0 z-20 mb-2 w-full overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] shadow-xl"
          onClick={(e) => e.preventDefault()}
        >
          {services.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                book(s.key);
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5"
            >
              <span className="text-[var(--foreground)]">{s.label}</span>
              <span className="font-semibold text-[var(--accent-2)]">
                {gbp.format(s.rate)}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-rose-300">{error}</p>}
    </div>
  );
}
