"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { sendFirstMessage } from "@/app/actions/messages";

/**
 * Composer for a conversation that doesn't exist yet. The first send creates
 * the thread and the message together (see `sendFirstMessage`), then the
 * server redirects into the real thread.
 */
export function NewConversation({
  counterpartId,
  counterpartName,
}: {
  counterpartId: string;
  counterpartName: string;
}) {
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setError(null);
    setSent(text);
    startTransition(async () => {
      const result = await sendFirstMessage(counterpartId, text);
      // On success the action redirects into the new thread; we only come back
      // here when something went wrong.
      if (result && "error" in result) {
        setError(result.error);
        setSent(null);
        setDraft(text);
      }
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-1 pb-2">
        {sent ? (
          <div className="flex justify-end">
            <div className="max-w-[78%] rounded-2xl bg-[var(--accent-2)] px-4 py-2.5 text-sm text-white opacity-60">
              {sent}
            </div>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-[var(--muted)]">
            No messages yet. Say hello to {counterpartName}.
          </p>
        )}
      </div>

      <form
        onSubmit={send}
        className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3"
      >
        <input
          value={sent ? "" : draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={pending}
          placeholder={`Message ${counterpartName}…`}
          className="h-11 flex-1 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 outline-none focus:border-[var(--accent-2)]/70"
        />
        <Button type="submit" size="sm" disabled={pending || !draft.trim()}>
          {pending ? "Sending…" : "Send"}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
    </div>
  );
}
