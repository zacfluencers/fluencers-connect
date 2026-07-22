import { licenceStatus } from "@/lib/licence";
import { termFor } from "@/lib/services";

/**
 * The countdown on a booking that runs for a period, shown to both sides.
 *
 * A term that only exists in the terms and conditions is a term nobody
 * observes. Naming the date, and counting down to it, is most of the
 * enforcement.
 *
 * The two terms bind opposite people, so every line here branches on it. On a
 * whitelist the *brand's* rights run out; on a post the *creator* is the one
 * committed. Getting that backwards would tell the wrong person they're free.
 */
export function LicenceWindow({
  serviceType,
  startsAt,
  endsAt,
  role,
  creatorName,
}: {
  serviceType: string | null;
  startsAt: string | null;
  endsAt: string;
  role: "brand" | "creator";
  creatorName: string;
}) {
  const term = termFor(serviceType);
  const { state, days } = licenceStatus(new Date(endsAt), new Date());
  const isLicence = term?.kind !== "commitment";

  const tone =
    state === "ended"
      ? isLicence
        ? "border-rose-400/40 bg-rose-400/5"
        : // A finished commitment is nobody's problem - the creator has done
          // what they agreed. Red would read as a fault.
          "border-[var(--border)]"
      : state === "ending"
        ? "border-amber-400/40 bg-amber-400/5"
        : "border-[var(--border)]";

  const dot =
    state === "ended"
      ? isLicence
        ? "bg-rose-400"
        : "bg-[var(--muted)]"
      : state === "ending"
        ? "bg-amber-400"
        : "bg-emerald-400";

  const headline = isLicence
    ? state === "ended"
      ? "Ad rights have ended"
      : days === 1
        ? "Ad rights end tomorrow"
        : `${days} days of ad rights left`
    : state === "ended"
      ? "The post can now come down"
      : days === 1
        ? "Post must stay live until tomorrow"
        : `${days} days left to keep the post live`;

  const detail = isLicence
    ? state === "ended"
      ? role === "brand"
        ? `Ads running from ${creatorName}'s handle should have stopped. Book again to continue.`
        : "You can remove the brand as an approved partner in Instagram."
      : role === "brand"
        ? `Ads may run from ${creatorName}'s handle until this date.`
        : "The brand may run ads from your handle until this date."
    : state === "ended"
      ? role === "brand"
        ? `${creatorName} has met the 30 days and may now remove the post.`
        : "You've met the agreed 30 days and can remove the post whenever you like."
      : role === "brand"
        ? `${creatorName} has agreed to keep the post live until this date.`
        : "Please keep the post live until this date.";

  return (
    <div className={`rounded-2xl border p-6 ${tone}`}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-[var(--muted)]">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
        {term?.label ?? "Term"}
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
