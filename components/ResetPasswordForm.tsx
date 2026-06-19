"use client";

import { useActionState } from "react";
import { updatePassword, type AuthState } from "@/app/actions/auth";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    updatePassword,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field label="New password" hint="At least 8 characters.">
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>
      <Field label="Confirm new password">
        <Input
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>

      {state?.error && (
        <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3.5 py-2.5 text-sm text-rose-300">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
