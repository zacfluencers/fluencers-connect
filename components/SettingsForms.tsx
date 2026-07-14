"use client";

import { useActionState, useState } from "react";
import {
  updateNotificationPrefs,
  changePassword,
  changeEmail,
  deleteAccount,
  type SettingsState,
} from "@/app/actions/settings";

const FIELD =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent-2)]/60";

const BUTTON =
  "rounded-full bg-[var(--foreground)] px-5 py-2 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90 disabled:opacity-50";

/** Shows whatever the action came back with. */
function Result({ state }: { state: SettingsState }) {
  if (!state) return null;
  return "error" in state ? (
    <p className="mt-3 text-sm text-rose-300">{state.error}</p>
  ) : (
    <p className="mt-3 text-sm text-emerald-300">{state.ok}</p>
  );
}

export function NotificationPrefsForm({
  emailMessages,
  emailBookings,
}: {
  emailMessages: boolean;
  emailBookings: boolean;
}) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateNotificationPrefs,
    null,
  );
  const [messages, setMessages] = useState(emailMessages);
  const [bookings, setBookings] = useState(emailBookings);

  return (
    <form action={formAction}>
      <div className="space-y-4">
        <Toggle
          name="email_messages"
          checked={messages}
          onChange={setMessages}
          label="New messages"
          hint="An email each time someone messages you. Turn this off if it's too chatty — you'll still see them in the app."
        />
        <Toggle
          name="email_bookings"
          checked={bookings}
          onChange={setBookings}
          label="Booking updates"
          hint="Requests, acceptances, delivered content, payments. Worth keeping on — these are the ones with money attached."
        />
      </div>
      <button type="submit" disabled={pending} className={`${BUTTON} mt-5`}>
        {pending ? "Saving…" : "Save preferences"}
      </button>
      <Result state={state} />
    </form>
  );
}

function Toggle({
  name,
  checked,
  onChange,
  label,
  hint,
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer gap-3">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent-2)]"
      />
      <span>
        <span className="block text-sm font-medium text-[var(--foreground)]">
          {label}
        </span>
        <span className="mt-0.5 block text-sm text-[var(--muted)]">{hint}</span>
      </span>
    </label>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    changePassword,
    null,
  );

  return (
    <form action={formAction} className="max-w-sm space-y-3">
      <Labelled label="Current password">
        <input type="password" name="current_password" required autoComplete="current-password" className={FIELD} />
      </Labelled>
      <Labelled label="New password">
        <input type="password" name="new_password" required minLength={8} autoComplete="new-password" className={FIELD} />
      </Labelled>
      <button type="submit" disabled={pending} className={BUTTON}>
        {pending ? "Changing…" : "Change password"}
      </button>
      <Result state={state} />
    </form>
  );
}

export function ChangeEmailForm({ current }: { current: string }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    changeEmail,
    null,
  );

  return (
    <form action={formAction} className="max-w-sm space-y-3">
      <p className="text-sm text-[var(--muted)]">
        You currently sign in as{" "}
        <span className="text-[var(--foreground)]">{current}</span>.
      </p>
      <Labelled label="New email address">
        <input type="email" name="email" required autoComplete="email" className={FIELD} />
      </Labelled>
      <button type="submit" disabled={pending} className={BUTTON}>
        {pending ? "Sending…" : "Send confirmation link"}
      </button>
      <Result state={state} />
    </form>
  );
}

/**
 * Closing an account is irreversible, so it asks for two things that can't both
 * happen by accident: the password, and the word DELETE typed out.
 */
export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    deleteAccount,
    null,
  );
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-rose-400/30 px-5 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-400/10"
      >
        Close my account
      </button>
    );
  }

  return (
    <form action={formAction} className="max-w-sm space-y-3">
      <div className="rounded-xl border border-rose-400/25 bg-rose-400/5 p-4 text-sm text-[var(--muted)]">
        <p className="font-medium text-[var(--foreground)]">This can&apos;t be undone.</p>
        <p className="mt-1.5">
          Your profile, photos and portfolio are deleted, and you&apos;re removed
          from the marketplace. You won&apos;t be able to sign in again.
        </p>
        <p className="mt-1.5">
          Records of bookings you&apos;ve paid for or been paid for are kept, with
          your personal details stripped out — we&apos;re required to keep those.
        </p>
      </div>
      <Labelled label="Your password">
        <input type="password" name="password" required autoComplete="current-password" className={FIELD} />
      </Labelled>
      <Labelled label="Type DELETE to confirm">
        <input name="confirm" required placeholder="DELETE" className={FIELD} />
      </Labelled>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-rose-500/90 px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Closing…" : "Close my account"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="rounded-full border border-[var(--border-strong)] px-5 py-2 text-sm transition-colors hover:bg-white/5"
        >
          Keep my account
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}

function Labelled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      {children}
    </label>
  );
}
