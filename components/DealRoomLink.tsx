import Link from "next/link";

/**
 * The single, clearly-labelled way into a booking's deal room. Used on every
 * booking surface (lists, cards, dashboards) so the entry point is consistent.
 */
export function DealRoomLink({
  id,
  full = false,
  label = "Open deal room",
}: {
  id: string;
  full?: boolean;
  label?: string;
}) {
  return (
    <Link
      href={`/bookings/${id}`}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--accent-2)]/40 bg-[var(--accent-2)]/10 px-4 py-2 text-sm font-semibold text-[var(--accent-2)] transition-colors hover:bg-[var(--accent-2)]/20 ${
        full ? "w-full" : ""
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {label}
    </Link>
  );
}
