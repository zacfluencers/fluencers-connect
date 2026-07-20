import Link from "next/link";
import { getAdminStats } from "@/lib/admin-queries";
import { AdminNudgePreviewButton } from "@/components/AdminNudgePreviewButton";
import { gbp } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const s = await getAdminStats();
  const money = (pence: number) => gbp.format(pence / 100);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-[var(--muted)]">
          People
        </h2>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
          <Stat
            label="Creators live"
            value={String(s.creators)}
            hint={
              s.creatorsPending > 0
                ? `+${s.creatorsPending} signed up, profile not finished`
                : undefined
            }
          />
          <Stat
            label="Brands live"
            value={String(s.brands)}
            hint={
              s.brandsPending > 0
                ? `+${s.brandsPending} signed up, profile not finished`
                : undefined
            }
          />
          <Stat
            label="Paying brands"
            value={String(s.subscribedBrands)}
            hint={
              s.brands > 0
                ? `${Math.round((s.subscribedBrands / s.brands) * 100)}% of brands`
                : undefined
            }
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-[var(--muted)]">
          Money
        </h2>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
          <Stat label="Bookings" value={String(s.bookings)} />
          <Stat
            label="Held in escrow"
            value={money(s.heldPence)}
            hint="Paid, not yet released"
          />
          <Stat
            label="Paid to creators"
            value={money(s.releasedPence)}
            hint="Released after approval"
          />
          <Stat label="Refunded" value={money(s.refundedPence)} />
        </div>
      </section>

      <AdminNudgePreviewButton
        pending={s.creatorsPending + s.brandsPending}
      />

      {s.excludedAdmins > 0 && (
        <p className="text-sm text-[var(--muted)]">
          Your own admin {s.excludedAdmins === 1 ? "account is" : "accounts are"}{" "}
          left out of the counts above - otherwise you&apos;d show up as one of
          your own paying brands.
        </p>
      )}

      <p className="text-sm text-[var(--muted)]">
        Held money is what you owe: a brand has paid, and the creator hasn&apos;t
        been paid out yet.{" "}
        <Link
          href="/admin/bookings"
          className="text-[var(--accent-2)] underline-offset-4 hover:underline"
        >
          See every booking →
        </Link>
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-[var(--background)] px-6 py-8">
      <p className="text-h3 h-display font-bold text-[var(--foreground)]">{value}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-[var(--muted)]/70">{hint}</p>}
    </div>
  );
}
