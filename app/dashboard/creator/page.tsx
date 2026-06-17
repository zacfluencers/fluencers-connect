import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { listMyBookings } from "@/lib/queries";
import { availableActions } from "@/lib/bookings";
import { BookingActions } from "@/components/BookingActions";
import { CreatorProfileForm } from "@/components/CreatorProfileForm";
import { StatusBadge } from "@/components/StatusBadge";
import type { CreatorProfile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Creator Dashboard — Influencer Connect" };

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export default async function CreatorDashboard() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "creator") redirect("/marketplace");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("user_id, name, bio, niche, instagram, tiktok, availability, price, profile_image")
    .eq("user_id", me.id)
    .maybeSingle();

  const bookings = await listMyBookings(me.id);
  const incoming = bookings.filter((b) => b.status === "requested");
  const active = bookings.filter(
    (b) => !["requested", "completed", "declined"].includes(b.status),
  );
  const closed = bookings.filter((b) =>
    ["completed", "declined"].includes(b.status),
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)]">
        Creator Dashboard
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Manage your profile and respond to booking requests.
      </p>

      {/* Profile */}
      <section className="mt-10 rounded-2xl border border-[var(--foreground)]/10 p-6">
        <h2 className="mb-1 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
          Your profile
        </h2>
        <p className="mb-5 text-sm text-[var(--muted)]">
          {profile
            ? "This is what brands see in the marketplace."
            : "Create your profile so brands can find and book you."}
        </p>
        <CreatorProfileForm profile={(profile as CreatorProfile) ?? null} />
      </section>

      {/* Incoming requests */}
      <Section title="Incoming requests" count={incoming.length}>
        {incoming.length === 0 ? (
          <Empty>No new requests right now.</Empty>
        ) : (
          incoming.map((b) => (
            <BookingLine key={b.id} who={b.brandEmail ?? "A brand"} price={b.price} status={b.status} id={b.id}>
              <BookingActions
                bookingId={b.id}
                actions={availableActions(b.status, me.role, b.revision_count)}
              />
            </BookingLine>
          ))
        )}
      </Section>

      {/* Active work */}
      <Section title="Active bookings" count={active.length}>
        {active.length === 0 ? (
          <Empty>Nothing in progress.</Empty>
        ) : (
          active.map((b) => (
            <BookingLine key={b.id} who={b.brandEmail ?? "A brand"} price={b.price} status={b.status} id={b.id}>
              <BookingActions
                bookingId={b.id}
                actions={availableActions(b.status, me.role, b.revision_count)}
              />
            </BookingLine>
          ))
        )}
      </Section>

      {/* History */}
      {closed.length > 0 && (
        <Section title="Past" count={closed.length}>
          {closed.map((b) => (
            <BookingLine key={b.id} who={b.brandEmail ?? "A brand"} price={b.price} status={b.status} id={b.id} />
          ))}
        </Section>
      )}
    </main>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
        {title}{" "}
        <span className="text-base font-normal text-[var(--muted)]">({count})</span>
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
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
    <div className="rounded-xl border border-[var(--foreground)]/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/bookings/${id}`} className="font-medium text-[var(--foreground)] hover:underline">
            {who}
          </Link>
          <p className="text-sm text-[var(--muted)]">{gbp.format(price)}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--foreground)]/15 p-4 text-sm text-[var(--muted)]">
      {children}
    </p>
  );
}
