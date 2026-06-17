import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBookingDetail } from "@/lib/queries";
import { availableActions, MAX_REVISIONS, STATUS_META } from "@/lib/bookings";
import { Stepper } from "@/components/ui/Stepper";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { BookingActions } from "@/components/BookingActions";
import { DisputeButton } from "@/components/DisputeButton";
import { MessageThread } from "@/components/MessageThread";
import { ContentDelivery } from "@/components/ContentDelivery";
import { gbp } from "@/lib/format";
import type { BookingStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type SeedMessage = {
  id: string;
  author: "me" | "them" | "system";
  name: string;
  text: string;
  time: string;
};

function seedMessages(status: BookingStatus, creatorName: string): SeedMessage[] {
  const msgs: SeedMessage[] = [
    { id: "s0", author: "system", name: "", text: "Booking request sent", time: "" },
  ];
  if (!["requested", "declined"].includes(status)) {
    msgs.push({
      id: "m1",
      author: "them",
      name: creatorName,
      text: "Thanks for the booking! I'll get started and share a first cut soon.",
      time: "earlier",
    });
  }
  if (["in_review", "completed"].includes(status)) {
    msgs.push({
      id: "m2",
      author: "them",
      name: creatorName,
      text: "Content delivered above — let me know if you'd like any tweaks.",
      time: "earlier",
    });
  }
  return msgs;
}

export default async function DealRoomPage({
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
  const creatorName = creator?.name ?? "Creator";
  const canDispute =
    me.role === "brand" &&
    ["accepted", "in_progress", "in_review"].includes(booking.status);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href={me.role === "brand" ? "/dashboard/brand" : "/bookings"}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        ← Back
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">Deal room</p>
          <h1 className="h-display text-3xl font-bold">
            {creatorName}{" "}
            <span className="text-[var(--muted)]">·</span>{" "}
            <span className="text-[var(--muted)]">#{booking.id.slice(0, 8)}</span>
          </h1>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* Status tracker */}
      <Card className="mt-6 p-6">
        <Stepper status={booking.status} />
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: delivery + messages */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Content delivery</h2>
            <ContentDelivery status={booking.status} role={me.role} />
          </Card>

          <Card className="flex h-[460px] flex-col p-6">
            <h2 className="mb-4 text-lg font-semibold">Messages</h2>
            <MessageThread
              selfName="You"
              otherName={me.role === "brand" ? creatorName : (brand?.email ?? "the brand")}
              seed={seedMessages(booking.status, creatorName)}
            />
          </Card>
        </div>

        {/* Right: parties, price, revisions, actions */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-[var(--muted)]">
              Participants
            </h2>
            <Party
              initials={creatorName.charAt(0)}
              name={creatorName}
              sub={creator?.niche ?? "Creator"}
              href={creator ? `/creator/${creator.user_id}` : undefined}
            />
            <div className="my-4 h-px bg-[var(--border)]" />
            <Party
              initials={(brand?.email ?? "B").charAt(0).toUpperCase()}
              name={brand?.email ?? "Brand"}
              sub="Brand"
            />
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted)]">Agreed price</span>
              <span className="text-xl font-bold text-[var(--foreground)]">
                {gbp.format(booking.price)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">Held in escrow until completion.</p>

            {/* Revision counter */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Revisions</span>
                <span className="text-[var(--foreground)]">
                  {booking.revision_count} / {MAX_REVISIONS}
                </span>
              </div>
              <div className="mt-2 flex gap-1.5">
                {Array.from({ length: MAX_REVISIONS }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      i < booking.revision_count
                        ? "bg-[var(--accent-2)]"
                        : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card className="p-6">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-[var(--muted)]">
              Actions
            </h2>
            {actions.length > 0 ? (
              <BookingActions bookingId={booking.id} actions={actions} />
            ) : (
              <p className="text-sm text-[var(--muted)]">
                {STATUS_META[booking.status].label} — nothing to do right now.
              </p>
            )}
            {canDispute && (
              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <DisputeButton />
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}

function Party({
  initials,
  name,
  sub,
  href,
}: {
  initials: string;
  name: string;
  sub: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-sm font-semibold text-white">
        {initials.toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-[var(--foreground)]">{name}</p>
        <p className="truncate text-sm text-[var(--muted)]">{sub}</p>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-80">
      {inner}
    </Link>
  ) : (
    inner
  );
}
