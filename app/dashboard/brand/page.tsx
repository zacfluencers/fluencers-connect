import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listMyBookings, getBrandProfile } from "@/lib/queries";
import { BookingCard } from "@/components/BookingCard";
import { BrandProfileForm } from "@/components/BrandProfileForm";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/motion";
import { gbp } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Brand Dashboard — Influencer Connect" };

export default async function BrandDashboard() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "brand") redirect("/dashboard/creator");

  const [bookings, brandProfile] = await Promise.all([
    listMyBookings(),
    getBrandProfile(me.id),
  ]);
  const active = bookings.filter(
    (b) => !["completed", "declined", "refunded"].includes(b.status),
  );
  const past = bookings.filter((b) =>
    ["completed", "declined", "refunded"].includes(b.status),
  );

  const liveSpend = active.reduce((sum, b) => sum + Number(b.price), 0);

  return (
    <main className="mx-auto max-w-7xl px-6 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
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
      </div>

      {/* Summary stats */}
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active bookings" value={String(active.length)} />
        <StatCard label="In escrow (active)" value={gbp.format(liveSpend)} />
        <StatCard label="Completed" value={String(
          past.filter((b) => b.status === "completed").length,
        )} />
      </div>

      {/* Brand profile */}
      <section className="mt-12 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7">
        <h2 className="text-h3 font-semibold">Brand profile</h2>
        <p className="mb-5 mt-1 text-sm text-[var(--muted)]">
          Turn on “Looking for creators” to appear in the creator directory and
          get messages from creators.
        </p>
        <BrandProfileForm profile={brandProfile} />
      </section>

      {/* Active */}
      <section className="mt-12">
        <h2 className="mb-6 text-h3 font-semibold">Active</h2>
        {active.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center">
            <p className="text-[var(--muted)]">No active bookings yet.</p>
            <ButtonLink href="/marketplace" variant="secondary" size="sm" className="mt-4">
              Browse creators
            </ButtonLink>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-6 text-h3 font-semibold">History</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
        </section>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{value}</p>
    </div>
  );
}
