"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type AuthState } from "@/app/actions/auth";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    requestPasswordReset,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>

      {state?.error && (
        <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3.5 py-2.5 text-sm text-rose-300">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-center text-sm text-[var(--muted)]">
        Remembered it?{" "}
        <Link href="/login" className="text-[var(--accent-2)] underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
