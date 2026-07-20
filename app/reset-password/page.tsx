import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Choose a new password - Fluencers Connect" };

export default async function ResetPasswordPage() {
  // The auth callback set a short-lived recovery session before forwarding here.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative flex min-h-[calc(100vh-60px)] items-center justify-center px-6 py-16">
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)]/80 p-8 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.9)]">
        <h1 className="h-display text-3xl font-bold">Choose a new password</h1>

        {user ? (
          <>
            <p className="mb-7 mt-1 text-[var(--muted)]">
              Set a new password for <strong>{user.email}</strong>.
            </p>
            <ResetPasswordForm />
          </>
        ) : (
          <>
            <p className="mb-6 mt-1 text-[var(--muted)]">
              This reset link is invalid or has expired.
            </p>
            <Link
              href="/forgot-password"
              className="text-[var(--accent-2)] underline-offset-4 hover:underline"
            >
              Request a new reset link →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
