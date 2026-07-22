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
import { refreshPayoutStatus } from "@/app/actions/payments";
import { platformFeeBps } from "@/lib/stripe/server";
import { BookingActions } from "@/components/BookingActions";
import { CreatorProfileForm } from "@/components/CreatorProfileForm";
import { CreatorCard } from "@/components/CreatorCard";
import { PortfolioManager } from "@/components/PortfolioManager";
import { PayoutSetup } from "@/components/PayoutSetup";
import { StatusBadge } from "@/components/StatusBadge";
import { DealRoomLink } from "@/components/DealRoomLink";
import { Avatar } from "@/components/Avatar";
import { Panel, Stat } from "@/components/ui/DashboardPanel";
import { gbp } from "@/lib/format";
import type { CreatorProfile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Creator Dashboard - Fluencers Connect" };

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

  // If an account exists but payouts aren't enabled yet, sync the flag straight
  // from Stripe (don't wait on the account.updated webhook, which may lag or be
  // unsubscribed). Only runs while in the incomplete state, so it's self-limiting.
  let payoutsEnabled = Boolean(profile?.payouts_enabled);
  if (profile?.stripe_account_id && !payoutsEnabled) {
    payoutsEnabled = await refreshPayoutStatus();
  }

  // Work that's been approved but can't be sent until payout setup is done.
  // Naming the amount is the whole point - "connect an account" is ignorable,
  // "£250 is waiting for you" is not.
  const { data: owedRows } = await supabase
    .from("bookings")
    .select("price")
    .eq("creator_id", me.id)
    .eq("payment_status", "pending_payout");
  const owed = (owedRows ?? []).reduce((sum, b) => sum + Number(b.price), 0);

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
    <main className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
      <header>
        <h1 className="text-h1 h-display font-bold text-[var(--foreground)]">
          Creator Dashboard
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Manage your profile and respond to booking requests.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* ----------------------------------------------------- Left rail */}
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-20 lg:self-start">
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
                Fill in your profile below and your card will appear here -
                this is what brands will see.
              </div>
            )}
          </Panel>

          <Panel title="Payouts" subtitle="Get paid when bookings complete">
            <PayoutSetup
              hasAccount={Boolean(profile?.stripe_account_id)}
              payoutsEnabled={payoutsEnabled}
              owed={owed}
              feeBps={platformFeeBps()}
            />
          </Panel>
        </aside>

        {/* ----------------------------------------------------- Main panels */}
        <div className="min-w-0 space-y-6">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
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
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3.5 transition-colors hover:border-[var(--accent-2)]/50 hover:bg-white/5"
                  >
                    <Avatar src={c.counterpartImage} name={c.counterpartName} className="h-9 w-9" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-[var(--foreground)]">
                        {c.counterpartName}
                      </span>
                      {c.lastMessage && (
                        <span className="mt-0.5 block truncate text-sm text-[var(--muted)]">
                          {c.lastMessage}
                        </span>
                      )}
                    </span>
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
            <CreatorProfileForm
              profile={(profile as CreatorProfile) ?? null}
              userId={me.id}
              feeBps={platformFeeBps()}
            />
          </Panel>

          {/* Portfolio */}
          <Panel
            title="Portfolio"
            subtitle="Upload 9:16 videos - these appear on your public profile."
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
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/bookings/${id}`} className="block truncate font-medium text-[var(--foreground)] hover:underline">
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
