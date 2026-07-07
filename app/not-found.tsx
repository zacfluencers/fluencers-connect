import Link from "next/link";

/**
 * Branded 404 — shown for unknown URLs and whenever a page calls notFound()
 * (e.g. a booking or profile that doesn't exist or you can't access).
 */
export default function NotFound() {
  return (
    <div className="relative flex min-h-[calc(100vh-60px)] items-center justify-center px-6 py-16">
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)]/80 p-8 text-center shadow-[0_24px_70px_-40px_rgba(0,0,0,0.9)]">
        <p className="text-sm font-medium text-[var(--accent-2)]">404</p>
        <h1 className="h-display mt-1 text-3xl font-bold">Page not found</h1>
        <p className="mb-7 mt-2 text-[var(--muted)]">
          That link may be broken, or the page may have moved or no longer be
          available to you.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl bg-[var(--accent-2)] px-4 py-2.5 font-medium text-black transition-opacity hover:opacity-90"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
