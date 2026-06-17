"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password">
        <Input
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
      </Field>

      {mode === "signup" && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-[var(--foreground)]">
            I&apos;m joining as a…
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <RoleOption value="brand" label="Brand" hint="Book creators" defaultChecked />
            <RoleOption value="creator" label="Creator" hint="Get booked" />
          </div>
        </fieldset>
      )}

      {state?.error && (
        <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3.5 py-2.5 text-sm text-rose-300">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending
          ? "Please wait…"
          : mode === "login"
            ? "Sign in"
            : "Create account"}
      </Button>

      <p className="text-center text-sm text-[var(--muted)]">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/signup" className="text-[var(--accent-2)] underline-offset-4 hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--accent-2)] underline-offset-4 hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function RoleOption({
  value,
  label,
  hint,
  defaultChecked,
}: {
  value: string;
  label: string;
  hint: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3.5 py-3 transition-colors has-[:checked]:border-[var(--accent-2)]/70 has-[:checked]:bg-[var(--accent)]/15">
      <input
        type="radio"
        name="role"
        value={value}
        defaultChecked={defaultChecked}
        className="accent-[var(--accent-2)]"
      />
      <span>
        <span className="block text-sm font-medium text-[var(--foreground)]">
          {label}
        </span>
        <span className="block text-xs text-[var(--muted)]">{hint}</span>
      </span>
    </label>
  );
}
