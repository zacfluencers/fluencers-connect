import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  listMyBookings,
  getPortfolio,
  getMyConversations,
  CREATOR_PROFILE_COLUMNS,
} from "@/lib/queries";
import { availableActions } from "@/lib/bookings";
import { BookingActions } from "@/components/BookingActions";
import { CreatorProfileForm } from "@/components/CreatorProfileForm";
import { CreatorCard } from "@/components/CreatorCard";
import { PortfolioManager } from "@/components/PortfolioManager";
import { PayoutSetup } from "@/components/PayoutSetup";
import { StatusBadge } from "@/components/StatusBadge";
import { DealRoomLink } from "@/components/DealRoomLink";
import { Panel, Stat } from "@/components/ui/DashboardPanel";
import { gbp } from "@/lib/format";
import type { CreatorProfile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Creator Dashboard — Influencer Connect" };

export default async function CreatorDashboard() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "creator") redirect("/marketplace");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("creator_profiles")
    .select(`${CREATOR_PROFILE_COLUMNS}, stripe_account_id, payouts_enabled`)
    .eq("user_id", me.id)
    .maybeSingle();

  const [portfolio, bookings, conversations] = await Promise.all([
    getPortfolio(me.id),
    listMyBookings(me.id),
    getMyConversations(),
  ]);

  const incoming = bookings.filter((b) => b.status === "requested");
  const active = bookings.filter(
    (b) => !["requested", "completed", "declined"].includes(b.status),
  );
  const closed = bookings.filter((b) =>
    ["completed", "declined"].includes(b.status),
  );
  const completed = bookings.filter((b) => b.status === "completed");

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <header>
        <h1 className="text-h1 h-display font-bold text-[var(--foreground)]">
          Creator Dashboard
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Manage your profile and respond to booking requests.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* ----------------------------------------------------- Left rail */}
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Panel
            title="Your card"
            subtitle="Exactly how brands see you in the marketplace"
          >
            {profile ? (
              <>
                <CreatorCard
                  creator={profile as CreatorProfile}
                  initialFavorited={false}
                  canFavorite={false}
                  viewerRole="creator"
                />
                <Link
                  href={`/creator/${me.id}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-[var(--accent-2)] underline-offset-4 hover:underline"
                >
                  View your public profile →
                </Link>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-6 text-center text-sm text-[var(--muted)]">
                Fill in your profile below and your card will appear here —
                this is what brands will see.
              </div>
            )}
          </Panel>

          <Panel title="Payouts" subtitle="Get paid when bookings complete">
            <PayoutSetup
              hasAccount={Boolean(profile?.stripe_account_id)}
              payoutsEnabled={Boolean(profile?.payouts_enabled)}
            />
          </Panel>
        </aside>

        {/* ----------------------------------------------------- Main panels */}
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4">
            <Stat label="New requests" value={incoming.length} accent />
            <Stat label="Active" value={active.length} />
            <Stat label="Completed" value={completed.length} />
          </div>

          {/* Booking requests */}
          <Panel
            title="Booking requests"
            subtitle="Accept or decline new requests"
            count={incoming.length}
          >
            {incoming.length === 0 ? (
              <Empty>No new requests right now.</Empty>
            ) : (
              <div className="space-y-3">
                {incoming.map((b) => (
                  <BookingLine key={b.id} who={b.brandEmail ?? "A brand"} price={b.price} status={b.status} id={b.id}>
                    <BookingActions
                      bookingId={b.id}
                      actions={availableActions(b.status, me.role, b.revision_count)}
                    />
                  </BookingLine>
                ))}
              </div>
            )}
          </Panel>

          {/* Active work */}
          <Panel title="Active bookings" count={active.length}>
            {active.length === 0 ? (
              <Empty>Nothing in progress.</Empty>
            ) : (
              <div className="space-y-3">
                {active.map((b) => (
                  <BookingLine key={b.id} who={b.brandEmail ?? "A brand"} price={b.price} status={b.status} id={b.id}>
                    <BookingActions
                      bookingId={b.id}
                      actions={availableActions(b.status, me.role, b.revision_count)}
                    />
                  </BookingLine>
                ))}
              </div>
            )}
          </Panel>

          {/* Messages */}
          <Panel
            title="Messages"
            count={conversations.length}
            action={{ href: "/messages", label: "Open inbox →" }}
          >
            {conversations.length === 0 ? (
              <Empty>No conversations yet.</Empty>
            ) : (
              <div className="space-y-2">
                {conversations.slice(0, 4).map((c) => (
                  <Link
                    key={c.id}
                    href={`/messages/${c.id}`}
                    className="block rounded-xl border border-[var(--border)] p-3.5 transition-colors hover:border-[var(--accent-2)]/50 hover:bg-white/5"
                  >
                    <p className="font-medium text-[var(--foreground)]">
                      {c.counterpartName}
                    </p>
                    {c.lastMessage && (
                      <p className="mt-0.5 truncate text-sm text-[var(--muted)]">
                        {c.lastMessage}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          {/* Profile editor */}
          <Panel
            title="Your profile"
            subtitle={
              profile
                ? "Edit the details brands see when they find you."
                : "Create your profile so brands can find and book you."
            }
          >
            <CreatorProfileForm profile={(profile as CreatorProfile) ?? null} />
          </Panel>

          {/* Portfolio */}
          <Panel
            title="Portfolio"
            subtitle="Upload 9:16 videos — these appear on your public profile."
          >
            <PortfolioManager userId={me.id} items={portfolio} />
          </Panel>

          {/* History */}
          {closed.length > 0 && (
            <Panel title="Past bookings" count={closed.length}>
              <div className="space-y-3">
                {closed.map((b) => (
                  <BookingLine key={b.id} who={b.brandEmail ?? "A brand"} price={b.price} status={b.status} id={b.id} />
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </main>
  );
}

function BookingLine({
  who,
  price,
  status,
  id,
  children,
}: {
  who: string;
  price: number;
  status: Parameters<typeof StatusBadge>[0]["status"];
  id: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/bookings/${id}`} className="font-medium text-[var(--foreground)] hover:underline">
            {who}
          </Link>
          <p className="text-sm text-[var(--muted)]">{gbp.format(price)}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DealRoomLink id={id} />
        {children}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--muted)]">
      {children}
    </p>
  );
}
