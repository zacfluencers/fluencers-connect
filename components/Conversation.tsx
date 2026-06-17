"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { sendMessage } from "@/app/actions/messages";
import type { Message } from "@/lib/types";

/** Real, persisted conversation thread + composer. */
export function Conversation({
  conversationId,
  currentUserId,
  counterpartName,
  messages,
}: {
  conversationId: string;
  currentUserId: string;
  counterpartName: string;
  messages: Message[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  // Each pending bubble remembers the server count when it was sent, so it
  // hides itself (computed at render — no effect) once the server catches up.
  const [optimistic, setOptimistic] = useState<{ text: string; base: number }[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, optimistic.length]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setError(null);
    setDraft("");
    setOptimistic((o) => [
      ...o.filter((x) => messages.length <= x.base),
      { text, base: messages.length },
    ]);
    startTransition(async () => {
      const result = await sendMessage(conversationId, text);
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  }

  const pendingBubbles = optimistic.filter((o) => messages.length <= o.base);
  const empty = messages.length === 0 && pendingBubbles.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-1 pb-2">
        {empty && (
          <p className="py-10 text-center text-sm text-[var(--muted)]">
            No messages yet. Say hello to {counterpartName}.
          </p>
        )}

        {messages.map((m) => (
          <Bubble key={m.id} mine={m.sender_id === currentUserId} text={m.body} />
        ))}
        {pendingBubbles.map((o, i) => (
          <Bubble key={`opt-${i}`} mine text={o.text} pending />
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={send}
        className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${counterpartName}…`}
          className="h-11 flex-1 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 outline-none focus:border-[var(--accent-2)]/70"
        />
        <Button type="submit" size="sm" disabled={pending || !draft.trim()}>
          Send
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
    </div>
  );
}

function Bubble({
  mine,
  text,
  pending,
}: {
  mine: boolean;
  text: string;
  pending?: boolean;
}) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
          mine
            ? "bg-[var(--accent-2)] text-white"
            : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)]"
        } ${pending ? "opacity-60" : ""}`}
      >
        {text}
      </div>
    </div>
  );
}
