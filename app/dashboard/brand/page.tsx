import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import {
  listMyBookings,
  getBrandProfile,
  getMyConversations,
  getBrandBilling,
} from "@/lib/queries";
import { getBrandPlanOptions } from "@/lib/stripe/billing";
import { isSubscribed } from "@/lib/billing-plans";
import { brandCanTransact } from "@/lib/subscription";
import { syncBrandSubscriptionFromSession } from "@/app/actions/billing";
import { BookingCard } from "@/components/BookingCard";
import { BrandCard } from "@/components/BrandCard";
import { BrandProfileForm } from "@/components/BrandProfileForm";
import { BrandSubscription } from "@/components/BrandSubscription";
import { Panel, Stat } from "@/components/ui/DashboardPanel";
import { Avatar } from "@/components/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/motion";
import { gbp } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Brand Dashboard — Fluencers Connect" };

export default async function BrandDashboard({
  searchParams,
}: {
  searchParams: Promise<{ subscription?: string; session_id?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "brand") redirect("/dashboard/creator");

  // Just returned from Stripe Checkout? Sync the new subscription immediately
  // (the webhook is the source of truth, but this avoids a lag on the dashboard).
  const sp = await searchParams;
  if (sp.subscription === "success" && sp.session_id) {
    await syncBrandSubscriptionFromSession(sp.session_id);
  }

  const [bookings, brandProfile, conversations, billing] = await Promise.all([
    listMyBookings(),
    getBrandProfile(me.id),
    getMyConversations(),
    getBrandBilling(me.id),
  ]);

  const subscribed = isSubscribed(billing?.status);
  // Only fetch plan prices from Stripe when we actually need to show them.
  const planOptions = subscribed ? [] : await getBrandPlanOptions();
  // Whether the brand may list in the creator directory (subscribers only;
  // always allowed when billing isn't configured, e.g. local/demo).
  const canList = await brandCanTransact(me.id);
  const active = bookings.filter(
    (b) => !["completed", "declined", "refunded"].includes(b.status),
  );
  const past = bookings.filter((b) =>
    ["completed", "declined", "refunded"].includes(b.status),
  );
  const completed = past.filter((b) => b.status === "completed");
  const liveSpend = active.reduce((sum, b) => sum + Number(b.price), 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[var(--accent-2)]">
            Dashboard
          </p>
          <h1 className="text-h1 h-display font-bold">Your bookings</h1>
          <p className="mt-2 text-[var(--muted)]">
            Track every collaboration from request to delivery.
          </p>
        </div>
        <ButtonLink href="/marketplace">Book a creator</ButtonLink>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* ----------------------------------------------------- Left rail */}
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Panel
            title="Your brand card"
            subtitle="How creators see you in the directory"
          >
            {brandProfile ? (
              <>
                <BrandCard brand={brandProfile} canMessage={false} />
                <p className="mt-4 text-sm">
                  {brandProfile.looking_for_creators ? (
                    <span className="text-emerald-300">
                      ● Visible to creators
                    </span>
                  ) : (
                    <span className="text-[var(--muted)]">
                      ○ Hidden — turn on “Looking for creators” below to appear.
                    </span>
                  )}
                </p>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-6 text-center text-sm text-[var(--muted)]">
                Fill in your brand profile below and your card will appear here
                — this is what creators will see.
              </div>
            )}
          </Panel>

          <Panel title="Quick links">
            <div className="space-y-2">
              <QuickLink href="/marketplace" label="Browse creators" />
              {/* Favourites, messages and bookings are locked until the brand
                  subscribes — only show links that actually work for them. */}
              {canList && (
                <>
                  <QuickLink href="/favorites" label="Saved creators" />
                  <QuickLink href="/messages" label="Messages" />
                  <QuickLink href="/bookings" label="All bookings" />
                </>
              )}
            </div>
          </Panel>
        </aside>

        {/* ----------------------------------------------------- Main panels */}
        <div className="min-w-0 space-y-6">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <Stat label="Active bookings" value={active.length} accent />
            <Stat label="In escrow (active)" value={gbp.format(liveSpend)} />
            <Stat label="Completed" value={completed.length} />
          </div>

          {/* Active */}
          <Panel title="Active bookings" count={active.length}>
            {active.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center">
                <p className="text-[var(--muted)]">No active bookings yet.</p>
                <ButtonLink href="/marketplace" variant="secondary" size="sm" className="mt-4">
                  Browse creators
                </ButtonLink>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {active.map((b, i) => (
                  <Reveal key={b.id} index={i}>
                    <BookingCard
                      id={b.id}
                      counterparty={b.creatorName ?? "Creator"}
                      sublabel="Booking"
                      price={b.price}
                      status={b.status}
                    />
                  </Reveal>
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
              <p className="rounded-xl border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--muted)]">
                No conversations yet.
              </p>
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

          {/* Subscription */}
          <Panel
            title="Membership"
            subtitle="Subscribe for full access to the platform."
          >
            <BrandSubscription
              plans={planOptions}
              status={billing?.status ?? null}
              planKey={billing?.plan ?? null}
              currentPeriodEnd={billing?.current_period_end ?? null}
              cancelAtPeriodEnd={billing?.cancel_at_period_end ?? false}
            />
          </Panel>

          {/* Brand profile */}
          <Panel
            title="Brand profile"
            subtitle="Turn on “Looking for creators” to appear in the creator directory and get messages from creators."
          >
            <BrandProfileForm profile={brandProfile} userId={me.id} canList={canList} />
          </Panel>

          {/* History */}
          {past.length > 0 && (
            <Panel title="History" count={past.length}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {past.map((b, i) => (
                  <Reveal key={b.id} index={i}>
                    <BookingCard
                      id={b.id}
                      counterparty={b.creatorName ?? "Creator"}
                      sublabel="Booking"
                      price={b.price}
                      status={b.status}
                    />
                  </Reveal>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </main>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground)] transition-colors hover:border-[var(--accent-2)]/50 hover:bg-white/5"
    >
      {label}
      <span className="text-[var(--accent-2)]">→</span>
    </Link>
  );
}
