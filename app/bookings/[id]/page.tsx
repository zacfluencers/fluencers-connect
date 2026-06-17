import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBookingDetail } from "@/lib/queries";
import {
  availableActions,
  FLOW_STEPS,
  MAX_REVISIONS,
  STATUS_META,
} from "@/lib/bookings";
import { BookingActions } from "@/components/BookingActions";
import { StatusBadge } from "@/components/StatusBadge";
import type { BookingStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const detail = await getBookingDetail(id);
  if (!detail) notFound();

  const { booking, creator, brand } = detail;
  const actions = availableActions(booking.status, me.role, booking.revision_count);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/bookings"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        ← All bookings
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)]">
          Booking
        </h1>
        <StatusBadge status={booking.status} />
      </div>

      {/* Progress */}
      <Progress status={booking.status} />

      {/* Parties + meta */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card title="Creator">
          {creator ? (
            <Link href={`/creator/${creator.user_id}`} className="hover:underline">
              <p className="font-medium text-[var(--foreground)]">{creator.name}</p>
              {creator.niche && (
                <p className="text-sm text-[var(--muted)]">{creator.niche}</p>
              )}
            </Link>
          ) : (
            <p className="text-sm text-[var(--muted)]">Profile unavailable</p>
          )}
        </Card>

        <Card title="Brand">
          <p className="font-medium text-[var(--foreground)]">
            {brand?.email ?? "Unknown"}
          </p>
        </Card>

        <Card title="Price">
          <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--foreground)]">
            {gbp.format(booking.price)}
          </p>
        </Card>

        <Card title="Revisions">
          <p className="text-[var(--foreground)]">
            {booking.revision_count} of {MAX_REVISIONS} used
          </p>
        </Card>
      </div>

      {/* Actions */}
      {actions.length > 0 ? (
        <section className="mt-8 rounded-2xl border border-[var(--foreground)]/10 p-6">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--muted)]">
            Your next step
          </h2>
          <BookingActions bookingId={booking.id} actions={actions} />
        </section>
      ) : (
        <p className="mt-8 rounded-2xl border border-dashed border-[var(--foreground)]/15 p-6 text-sm text-[var(--muted)]">
          {STATUS_META[booking.status].label} — nothing for you to do right now.
        </p>
      )}
    </main>
  );
}

function Progress({ status }: { status: BookingStatus }) {
  // Off-path states (declined/refunded) don't sit on the linear track.
  const onTrack = FLOW_STEPS.includes(status);
  const currentIdx = FLOW_STEPS.indexOf(status);

  return (
    <div className="mt-8">
      {!onTrack && (
        <p className="mb-3 text-sm text-[var(--accent)]">
          This booking was {STATUS_META[status].label.toLowerCase()}.
        </p>
      )}
      <ol className="flex items-center gap-2">
        {FLOW_STEPS.map((step, i) => {
          const done = onTrack && i <= currentIdx;
          return (
            <li key={step} className="flex flex-1 items-center gap-2">
              <span
                className={`h-2 flex-1 rounded-full ${
                  done ? "bg-[var(--accent)]" : "bg-[var(--foreground)]/10"
                }`}
              />
            </li>
          );
        })}
      </ol>
      <div className="mt-2 flex justify-between text-xs text-[var(--muted)]">
        {FLOW_STEPS.map((step) => (
          <span key={step}>{STATUS_META[step].label}</span>
        ))}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--foreground)]/10 p-4">
      <p className="mb-1 text-xs uppercase tracking-wider text-[var(--muted)]">
        {title}
      </p>
      {children}
    </div>
  );
}
