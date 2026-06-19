import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import {
  getBookingDetail,
  getOrCreateBookingConversation,
  getConversation,
  getBookingBrief,
  getBookingAssets,
} from "@/lib/queries";
import { availableActions, MAX_REVISIONS, STATUS_META } from "@/lib/bookings";
import { Stepper } from "@/components/ui/Stepper";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { BookingActions } from "@/components/BookingActions";
import { DisputeButton } from "@/components/DisputeButton";
import { Conversation } from "@/components/Conversation";
import { ContentDelivery } from "@/components/ContentDelivery";
import { BookingBrief } from "@/components/BookingBrief";
import { gbp } from "@/lib/format";
import { serviceLabel } from "@/lib/services";

export const dynamic = "force-dynamic";

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

  // Real, persisted message thread for this booking.
  const conversationId = await getOrCreateBookingConversation(
    booking.id,
    booking.brand_id,
    booking.creator_id,
  );
  const conversation = conversationId
    ? await getConversation(conversationId)
    : null;

  const [brief, assets] = await Promise.all([
    getBookingBrief(booking.id),
    getBookingAssets(booking.id),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
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
        {/* Left: brief + delivery + messages */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Campaign brief</h2>
              {me.role === "brand" && (
                <span className="text-xs text-[var(--muted)]">Only you can edit this</span>
              )}
            </div>
            <BookingBrief
              bookingId={booking.id}
              userId={me.id}
              role={me.role}
              brief={brief}
              assets={assets}
            />
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Content delivery</h2>
            <ContentDelivery status={booking.status} role={me.role} />
          </Card>

          <Card className="flex h-[460px] flex-col p-6">
            <h2 className="mb-4 text-lg font-semibold">Messages</h2>
            {conversation ? (
              <Conversation
                conversationId={conversation.id}
                currentUserId={me.id}
                counterpartName={
                  me.role === "brand" ? creatorName : (brand?.email ?? "the brand")
                }
                messages={conversation.messages}
              />
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Messaging will be available shortly.
              </p>
            )}
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
              href={`/brand/${booking.brand_id}`}
            />
          </Card>

          <Card className="p-6">
            {serviceLabel(booking.service_type) && (
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-[var(--muted)]">Service</span>
                <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-sm font-medium text-[var(--foreground)]">
                  {serviceLabel(booking.service_type)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted)]">Agreed price</span>
              <span className="text-xl font-bold text-[var(--foreground)]">
                {gbp.format(booking.price)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">{escrowNote(booking.payment_status)}</p>

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
                <DisputeButton bookingId={booking.id} />
              </div>
            )}
          </Card>

          {/* Invoice / receipt — available once the booking is complete */}
          {booking.status === "completed" && (
            <Card className="p-6">
              <h2 className="mb-1 text-sm font-medium uppercase tracking-widest text-[var(--muted)]">
                Invoice
              </h2>
              <p className="mb-4 text-sm text-[var(--muted)]">
                A PDF receipt for your records.
              </p>
              <a
                href={`/bookings/${booking.id}/invoice`}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white/5"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
                  <path d="M5 21h14" />
                </svg>
                Download receipt (PDF)
              </a>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

function escrowNote(status: string) {
  switch (status) {
    case "held":
      return "Funds held in escrow until completion.";
    case "released":
      return "Funds released to the creator.";
    case "refunded":
      return "Funds refunded to the brand.";
    case "unpaid":
      return "Demo booking — payments are off, so no funds were taken.";
    default:
      return "Awaiting payment.";
  }
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
