import Link from "next/link";
import { redirect } from "next/navigation";
import { stripe, isStripeConfigured } from "@/lib/stripe/server";
import { ensureBookingForSession } from "@/lib/stripe/escrow";

export const dynamic = "force-dynamic";

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (session_id && isStripeConfigured()) {
    const session = await stripe().checkout.sessions.retrieve(session_id);
    if (session.payment_status === "paid") {
      const bookingId = await ensureBookingForSession({
        id: session.id,
        payment_intent: session.payment_intent,
        metadata: session.metadata,
      });
      if (bookingId) redirect(`/bookings/${bookingId}`);
    }
  }

  // Fallback if we couldn't resolve the booking immediately.
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-h2 h-display font-bold">Payment received</h1>
      <p className="mt-3 text-[var(--muted)]">
        Your booking request is being created and funds are held safely in escrow.
      </p>
      <Link
        href="/bookings"
        className="mt-6 text-sm font-medium text-[var(--accent-2)] underline-offset-4 hover:underline"
      >
        Go to my bookings →
      </Link>
    </main>
  );
}
