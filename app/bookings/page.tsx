import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listMyBookings } from "@/lib/queries";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Bookings — Influencer Connect" };

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export default async function BookingsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const bookings = await listMyBookings();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-h1 h-display font-bold text-[var(--foreground)]">
        My Bookings
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        {me.role === "brand"
          ? "Bookings you've requested with creators."
          : "Bookings brands have requested with you."}
      </p>

      {bookings.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center">
          <p className="text-[var(--muted)]">No bookings yet.</p>
          <Link
            href="/marketplace"
            className="mt-4 inline-block text-sm font-medium text-[var(--accent-2)] underline-offset-4 hover:underline"
          >
            Browse creators
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {bookings.map((b) => {
            const counterparty =
              me.role === "brand"
                ? b.creatorName ?? "Creator"
                : b.brandEmail ?? "Brand";
            return (
              <li key={b.id}>
                <Link
                  href={`/bookings/${b.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--foreground)]/25"
                >
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      {counterparty}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {gbp.format(b.price)}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
