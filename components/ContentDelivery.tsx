import type { BookingStatus } from "@/lib/types";

/**
 * Content delivery panel (UI). Shows the right empty/preview state for the
 * booking stage. Actual file upload/storage wires into Supabase Storage later
 * (kept out of scope per brief — this is the deal-room presentation).
 */
export function ContentDelivery({
  status,
  role,
}: {
  status: BookingStatus;
  role: "brand" | "creator";
}) {
  const delivered = ["in_review", "completed"].includes(status);

  if (delivered) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]"
          >
            <div className="flex h-full w-full items-center justify-center text-[var(--muted)]">
              <span className="text-2xl">▦</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/40 px-2.5 py-1.5 text-[11px] text-white/90 backdrop-blur">
              <span>asset_{i + 1}.mp4</span>
              <span className="opacity-0 transition-opacity group-hover:opacity-100">
                ↓
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center">
      <p className="text-sm text-[var(--foreground)]">
        {role === "creator"
          ? status === "accepted" || status === "in_progress"
            ? "Upload your content here when it's ready for review."
            : "Delivery opens once the booking is accepted."
          : "No content delivered yet."}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Files appear here for review and download.
      </p>
    </div>
  );
}
