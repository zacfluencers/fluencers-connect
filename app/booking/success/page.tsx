import Link from "next/link";
import { redirect } from "next/navigation";
import { stripe, isStripeConfigured } from "@/lib/stripe/server";
import { ensureBookingForSession } from "@/lib/stripe/escrow";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const me = await getCurrentUser();

  let bookingId: string | null = null;
  if (session_id && isStripeConfigured() && me) {
    try {
      const session = await stripe().checkout.sessions.retrieve(session_id);
      // Only the brand who actually paid may resolve/redirect into the booking
      // here. (The webhook is the source of truth and creates it regardless.)
      if (session.payment_status === "paid" && session.metadata?.brand_id === me.id) {
        bookingId = await ensureBookingForSession({
          id: session.id,
          payment_intent: session.payment_intent,
          metadata: session.metadata,
        });
      }
    } catch (e) {
      // Stripe unreachable — fall through to the reassuring "Payment received"
      // screen. The webhook is the source of truth and will create the booking.
      console.error("booking success: could not resolve session", e);
    }
  }
  if (bookingId) redirect(`/bookings/${bookingId}`);

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
