import { getBrandBilling } from "@/lib/queries";
import { isBrandBillingConfigured } from "@/lib/stripe/billing";
import { isSubscribed } from "@/lib/billing-plans";

/**
 * Whether a brand may transact — i.e. book creators, start conversations, and
 * send messages. Free (unsubscribed) brands can browse and admire, but must
 * subscribe to interact.
 *
 * If billing isn't configured (local/demo without Stripe), we DON'T gate, so the
 * app stays usable. This is enforced server-side in the booking/messaging
 * actions; the UI mirrors it with a "Subscribe" prompt.
 */
export async function brandCanTransact(userId: string): Promise<boolean> {
  if (!isBrandBillingConfigured()) return true;
  const billing = await getBrandBilling(userId);
  return isSubscribed(billing?.status);
}
