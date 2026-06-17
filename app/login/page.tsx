import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Sign in — Influencer Connect" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ check_email?: string }>;
}) {
  const { check_email } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="mb-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)]">
        Welcome back
      </h1>
      <p className="mb-8 text-[var(--muted)]">
        Sign in to manage your bookings.
      </p>

      {check_email && (
        <p className="mb-6 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Check your email to confirm your account, then sign in.
        </p>
      )}

      <AuthForm mode="login" />
    </div>
  );
}
