"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createBooking } from "@/app/actions/bookings";

/**
 * The "Request Booking" CTA on a creator profile.
 * - signed-out → links to login
 * - brand → creates a "requested" booking and redirects to it
 * - creator → can't book (disabled with a hint)
 */
export function RequestBookingButton({
  creatorId,
  available,
  viewerRole,
}: {
  creatorId: string;
  available: boolean;
  viewerRole: "brand" | "creator" | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (viewerRole === null) {
    return (
      <Link
        href="/login"
        className="ml-auto rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Sign in to book
      </Link>
    );
  }

  if (viewerRole === "creator") {
    return (
      <span className="ml-auto text-sm text-[var(--muted)]">
        Creators can&apos;t book other creators.
      </span>
    );
  }

  function request() {
    setError(null);
    startTransition(async () => {
      const result = await createBooking(creatorId);
      // On success the action redirects; we only get here on error.
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <div className="ml-auto text-right">
      <button
        type="button"
        onClick={request}
        disabled={!available || pending}
        className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Requesting…" : "Request Booking"}
      </button>
      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
    </div>
  );
}
