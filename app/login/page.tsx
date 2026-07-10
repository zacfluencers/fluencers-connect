import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Sign in — Fluencers Connect" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ check_email?: string; reset_error?: string }>;
}) {
  const { check_email, reset_error } = await searchParams;

  return (
    <div className="relative flex min-h-[calc(100vh-60px)] items-center justify-center px-6 py-16">      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)]/80 p-8 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.9)]">
        <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          ← Home
        </Link>
        <h1 className="h-display mt-4 text-3xl font-bold">Welcome back</h1>
        <p className="mb-7 mt-1 text-[var(--muted)]">
          Sign in to manage your bookings.
        </p>

        {check_email && (
          <p className="mb-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-2.5 text-sm text-emerald-300">
            Check your email to confirm your account, then sign in.
          </p>
        )}

        {reset_error && (
          <p className="mb-6 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3.5 py-2.5 text-sm text-rose-300">
            That reset link was invalid or has expired. Please request a new one.
          </p>
        )}

        <AuthForm mode="login" />
      </div>
    </div>
  );
}
