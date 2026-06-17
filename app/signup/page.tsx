import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Join — Influencer Connect" };

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="mb-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)]">
        Create your account
      </h1>
      <p className="mb-8 text-[var(--muted)]">
        Join as a brand to book creators, or as a creator to get booked.
      </p>
      <AuthForm mode="signup" />
    </div>
  );
}
