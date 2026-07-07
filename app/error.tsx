"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * App-wide error boundary. Catches any unhandled error thrown while rendering a
 * page (a Supabase outage, a Stripe timeout, a bad response) and shows a calm,
 * branded "something went wrong" screen with a retry — instead of the raw
 * Next.js crash page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface it in logs for debugging; the user sees the friendly card below.
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-[calc(100vh-60px)] items-center justify-center px-6 py-16">
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)]/80 p-8 text-center shadow-[0_24px_70px_-40px_rgba(0,0,0,0.9)]">
        <h1 className="h-display text-3xl font-bold">Something went wrong</h1>
        <p className="mb-7 mt-2 text-[var(--muted)]">
          A hiccup on our side stopped that from loading. It&apos;s usually
          temporary — please try again.
        </p>
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="w-full rounded-xl bg-[var(--accent-2)] px-4 py-2.5 font-medium text-black transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="text-sm text-[var(--muted)] underline-offset-4 hover:text-[var(--foreground)] hover:underline"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
