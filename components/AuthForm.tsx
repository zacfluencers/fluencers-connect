"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
      />

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
        <p className="rounded-lg bg-[var(--accent)]/10 px-3 py-2 text-sm text-[var(--accent)]">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending
          ? "Please wait…"
          : mode === "login"
            ? "Sign in"
            : "Create account"}
      </button>

      <p className="text-center text-sm text-[var(--muted)]">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/signup" className="text-[var(--accent)] underline-offset-4 hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--accent)] underline-offset-4 hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        className="w-full rounded-lg border border-[var(--foreground)]/15 bg-[var(--background)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/40"
      />
    </label>
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
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--foreground)]/15 px-3 py-2 has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent)]/5">
      <input
        type="radio"
        name="role"
        value={value}
        defaultChecked={defaultChecked}
        className="accent-[var(--accent)]"
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
