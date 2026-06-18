import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBrandProfile } from "@/lib/queries";
import { BrandProfileForm } from "@/components/BrandProfileForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome — Influencer Connect" };

export default async function WelcomePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  // Creators set up on their dashboard; this welcome step is for brands.
  if (me.role !== "brand") redirect("/dashboard/creator");

  const profile = await getBrandProfile(me.id);

  return (
    <main className="mx-auto max-w-xl px-6 py-16 sm:py-20">
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
          Skip for now — browse creators →
        </Link>
      </div>
    </main>
  );
}
