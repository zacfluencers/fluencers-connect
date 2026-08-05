"use client";

import { useActionState, useState } from "react";
import {
  adminSetTemporaryPassword,
  type SetPasswordState,
} from "@/app/actions/admin";

/**
 * Give a user a temporary password when they can't receive our emails.
 *
 * Two-step on purpose: it invalidates their current password, so the first
 * click only asks, and the confirmation names the person out loud. On success it
 * shows the new password ONCE - the admin passes it on privately, and the user
 * changes it under Settings after signing in.
 */
export function AdminSetPasswordButton({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const [state, formAction, pending] = useActionState<SetPasswordState, FormData>(
    adminSetTemporaryPassword,
    null,
  );
  const [confirming, setConfirming] = useState(false);

  if (state && "ok" in state) {
    return (
      <div className="min-w-[16rem] text-xs">
        <p className="mb-1 text-[var(--foreground)]">
          Temporary password for <strong>{state.email}</strong>:
        </p>
        <code className="mb-1 inline-block select-all rounded-md border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-1 font-mono text-sm text-[var(--foreground)]">
          {state.password}
        </code>
        <p className="text-[var(--muted)]">
          Share it privately. They can change it under Settings once signed in;
          their old password no longer works.
        </p>
      </div>
    );
  }

  if (!confirming) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent-2)]/50 hover:bg-white/5"
        >
          Set temp password
        </button>
        {state && "error" in state && (
          <p className="mt-1 text-xs text-rose-300">{state.error}</p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="min-w-[16rem]">
      <input type="hidden" name="userId" value={userId} />
      <p className="mb-2 text-xs text-[var(--foreground)]">
        Set a new temporary password for {email}? Their current password stops
        working, and their email is marked confirmed.
      </p>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--accent-2)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Setting…" : "Yes, set it"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
      {state && "error" in state && (
        <p className="mt-1 text-xs text-rose-300">{state.error}</p>
      )}
    </form>
  );
}
