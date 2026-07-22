import { licenceStatus } from "@/lib/licence";

/**
 * The three-month clock on a whitelisting booking, shown to both sides.
 *
 * A term that only exists in the terms and conditions is a term nobody
 * observes: the brand keeps spending on ads it no longer has the right to run,
 * and the creator has no idea when they can withdraw partner access. Naming the
 * date, and counting down to it, is most of the enforcement.
 */
export function LicenceWindow({
  startsAt,
  endsAt,
  role,
  creatorName,
}: {
  startsAt: string | null;
  endsAt: string;
  role: "brand" | "creator";
  creatorName: string;
}) {
  const end = new Date(endsAt);
  const { state, days } = licenceStatus(end, new Date());

  const tone =
    state === "ended"
      ? "border-rose-400/40 bg-rose-400/5"
      : state === "ending"
        ? "border-amber-400/40 bg-amber-400/5"
        : "border-[var(--border)]";

  const dot =
    state === "ended"
      ? "bg-rose-400"
      : state === "ending"
        ? "bg-amber-400"
        : "bg-emerald-400";

  const headline =
    state === "ended"
      ? "Ad rights have ended"
      : days === 1
        ? "Ad rights end tomorrow"
        : `${days} days of ad rights left`;

  const detail =
    state === "ended"
      ? role === "brand"
        ? `Ads running from ${creatorName}'s handle should have stopped. Book them again to continue.`
        : "You can remove the brand as an approved partner in Instagram."
      : role === "brand"
        ? `Ads may run from ${creatorName}'s handle until this date.`
        : "The brand may run ads from your handle until this date.";

  return (
    <div className={`rounded-2xl border p-6 ${tone}`}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-[var(--muted)]">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
        Whitelisting term
      </h2>

      <p className="text-lg font-semibold text-[var(--foreground)]">{headline}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{detail}</p>

      <dl className="mt-4 space-y-2 border-t border-[var(--border)] pt-4 text-sm">
        {startsAt && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--muted)]">Started</dt>
            <dd className="text-[var(--foreground)]">{formatDate(startsAt)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[var(--muted)]">
            {state === "ended" ? "Ended" : "Ends"}
          </dt>
          <dd className="font-medium text-[var(--foreground)]">
            {formatDate(endsAt)}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-[var(--muted)]">
        We&apos;ll email you both a week before this date, and again when it
        passes.
      </p>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });
}
