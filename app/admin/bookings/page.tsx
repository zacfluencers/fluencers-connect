import Link from "next/link";
import { listAdminBookings } from "@/lib/admin-queries";
import { AdminRefundButton } from "@/components/AdminRefundButton";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { gbp } from "@/lib/format";
import { serviceLabel } from "@/lib/services";

export const dynamic = "force-dynamic";

/** Where the money is right now — the column that actually matters. */
const PAYMENT_TONE: Record<string, BadgeTone> = {
  held: "active",
  released: "success",
  refunded: "danger",
  unpaid: "neutral",
};

const PAYMENT_LABEL: Record<string, string> = {
  held: "In escrow",
  released: "Paid out",
  refunded: "Refunded",
  unpaid: "Not paid",
};

export default async function AdminBookingsPage() {
  const bookings = await listAdminBookings();

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--muted)]">
        {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}. You can
        refund a booking while its money is still in escrow.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--muted)]">
            <tr>
              <Th>Brand → Creator</Th>
              <Th>Service</Th>
              <Th>Amount</Th>
              <Th>Money</Th>
              <Th>Stage</Th>
              <Th>Date</Th>
              <Th> </Th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-[var(--border)] last:border-0">
                <Td>
                  <Link
                    href={`/bookings/${b.id}`}
                    className="font-medium text-[var(--foreground)] hover:underline"
                  >
                    {b.brandName} → {b.creatorName}
                  </Link>
                </Td>
                <Td>{serviceLabel(b.serviceType) ?? "-"}</Td>
                <Td className="font-semibold text-[var(--foreground)]">
                  {b.price != null ? gbp.format(b.price) : "-"}
                </Td>
                <Td>
                  <Badge tone={PAYMENT_TONE[b.paymentStatus] ?? "neutral"}>
                    {PAYMENT_LABEL[b.paymentStatus] ?? b.paymentStatus}
                  </Badge>
                </Td>
                <Td className="capitalize">{b.status.replace("_", " ")}</Td>
                <Td>
                  {new Date(b.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Td>
                <Td>
                  {b.refundable ? (
                    <AdminRefundButton
                      bookingId={b.id}
                      amount={b.price}
                      brandName={b.brandName}
                      creatorName={b.creatorName}
                    />
                  ) : (
                    <span className="text-xs text-[var(--muted)]">-</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>

        {bookings.length === 0 && (
          <p className="p-8 text-center text-sm text-[var(--muted)]">
            No bookings yet.
          </p>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-top text-[var(--muted)] ${className}`}>{children}</td>;
}
