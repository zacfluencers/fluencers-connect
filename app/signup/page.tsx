import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Join - Fluencers Connect" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const defaultRole = role === "creator" ? "creator" : "brand";

  return (
    <div className="relative flex min-h-[calc(100vh-60px)] items-center justify-center px-6 py-16">      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)]/80 p-8 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.9)]">
        <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          ← Home
        </Link>
        <h1 className="h-display mt-4 text-3xl font-bold">Create your account</h1>
        <p className="mb-7 mt-1 text-[var(--muted)]">
          Join as a brand to book creators, or as a creator to get booked.
        </p>
        <AuthForm mode="signup" defaultRole={defaultRole} />
        <p className="mt-5 text-center text-xs leading-relaxed text-[var(--muted)]">
          By creating an account you agree to our{" "}
          <Link
            href="/terms"
            className="text-[var(--accent-2)] underline-offset-4 hover:underline"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-[var(--accent-2)] underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
