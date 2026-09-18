import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBrandProfile } from "@/lib/queries";
import { BrandProfileForm } from "@/components/BrandProfileForm";
import { SubscribeButton } from "@/components/subscribe/SubscribeButton";
import { BRAND_SUBSCRIBER_BENEFITS } from "@/lib/billing-plans";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome - Fluencers Connect" };

export default async function WelcomePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  // Creators set up on their dashboard; this welcome step is for brands.
  if (me.role !== "brand") redirect("/dashboard/creator");

  const profile = await getBrandProfile(me.id);

  return (
    <main className="mx-auto max-w-xl px-6 py-14 sm:py-20">
      <p className="text-eyebrow mb-2 text-[var(--accent-2)]">Welcome</p>
      <h1 className="text-h1 h-display font-bold text-[var(--foreground)]">
        Set up your brand
      </h1>
      <p className="text-lead mt-3 text-[var(--muted)]">
        Tell creators who you are and what you&apos;re after. You can change any
        of this later from your dashboard.
      </p>

      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-6">
        <BrandProfileForm
          profile={profile}
          userId={me.id}
          redirectTo="/marketplace"
        />
      </div>

      <div className="mt-5 text-center">
        <Link
          href="/marketplace"
          className="text-sm text-[var(--muted)] underline-offset-4 hover:text-[var(--foreground)] hover:underline"
        >
          Skip for now - browse creators →
        </Link>
      </div>

      {/* What subscribing unlocks - set the expectation up front, with a way to
          start right away. Browsing stays free; this is the next step, not a wall. */}
      <div className="mt-10 rounded-2xl border border-[var(--border-strong)] bg-gradient-to-br from-[var(--accent)]/20 to-[var(--surface-2)] p-6 sm:p-8">
        <p className="text-eyebrow mb-2 text-[var(--accent-2)]">When you&apos;re ready to book</p>
        <h2 className="text-h3 h-display font-bold text-[var(--foreground)]">
          Unlock the full platform
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Browsing creators is free. Subscribe when you want to reach out - then
          you can:
        </p>
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {BRAND_SUBSCRIBER_BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-2)]"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                  clipRule="evenodd"
                />
              </svg>
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <SubscribeButton
            size="md"
            reason="Subscribe to book creators, message them and save shortlists."
          >
            See plans
          </SubscribeButton>
        </div>
      </div>
    </main>
  );
}
