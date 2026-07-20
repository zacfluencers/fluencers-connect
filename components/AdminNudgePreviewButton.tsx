"use client";

import { useActionState } from "react";
import {
  adminPreviewProfileNudge,
  type AdminActionState,
} from "@/app/actions/admin";

/**
 * Sends the admin a sample of both "finish your profile" nudge emails.
 *
 * Deliberately a real send rather than an on-screen preview: how an email
 * actually renders in Gmail or Outlook is the only version that matters.
 */
export function AdminNudgePreviewButton({ pending }: { pending: number }) {
  const [state, formAction, submitting] = useActionState<
    AdminActionState,
    FormData
  >(async () => adminPreviewProfileNudge(), null);

  return (
    <div className="rounded-2xl border border-[var(--border)] p-6">
      <p className="font-medium text-[var(--foreground)]">
        Profile reminder emails
      </p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {pending === 0
          ? "Nobody is waiting on a reminder right now."
          : `${pending} ${pending === 1 ? "person has" : "people have"} signed up without finishing a profile.`}{" "}
        Send yourself both sample emails to see how they read.
      </p>

      <form action={formAction} className="mt-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white/5 disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Email me a sample"}
        </button>
      </form>

      {state && "ok" in state && (
        <p className="mt-3 text-sm text-emerald-400">{state.ok}</p>
      )}
      {state && "error" in state && (
        <p className="mt-3 text-sm text-red-400">{state.error}</p>
      )}
    </div>
  );
}
