import Link from "next/link";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata = { title: "Reset password — Fluencers Connect" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <div className="relative flex min-h-[calc(100vh-60px)] items-center justify-center px-6 py-16">
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)]/80 p-8 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.9)]">
        <Link href="/login" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          ← Back to sign in
        </Link>
        <h1 className="h-display mt-4 text-3xl font-bold">Reset your password</h1>

        {sent ? (
          <>
            <p className="mb-6 mt-1 text-[var(--muted)]">
              If an account exists for that email, we&apos;ve sent a link to reset
              your password.
            </p>
            <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-2.5 text-sm text-emerald-300">
              Check your inbox (and spam) for the reset link — it expires after a
              while, so use it soon.
            </p>
          </>
        ) : (
          <>
            <p className="mb-7 mt-1 text-[var(--muted)]">
              Enter your email and we&apos;ll send you a link to set a new password.
            </p>
            <ForgotPasswordForm />
          </>
        )}
      </div>
    </div>
  );
}
