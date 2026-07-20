"use client";

import { useActionState } from "react";
import type { AdminActionState } from "@/app/actions/admin";

/**
 * One-click admin maintenance: a title, an explanation, and a button that runs
 * a server action and reports back. Shared by the jobs that also run nightly,
 * for when waiting until morning isn't good enough.
 */
export function AdminMaintenanceButton({
  title,
  description,
  label,
  pendingLabel,
  action,
}: {
  title: string;
  description: string;
  label: string;
  pendingLabel: string;
  action: () => Promise<AdminActionState>;
}) {
  const [state, formAction, submitting] = useActionState<
    AdminActionState,
    FormData
  >(async () => action(), null);

  return (
    <div className="rounded-2xl border border-[var(--border)] p-6">
      <p className="font-medium text-[var(--foreground)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>

      <form action={formAction} className="mt-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white/5 disabled:opacity-60"
        >
          {submitting ? pendingLabel : label}
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
