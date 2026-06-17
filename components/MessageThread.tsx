"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

interface Message {
  id: string;
  author: "me" | "them" | "system";
  name: string;
  text: string;
  time: string;
}

/**
 * Deal-room message thread (UI). Composing adds to local state only — wire this
 * to a `messages` table + realtime to persist (kept out of scope per brief).
 */
export function MessageThread({
  selfName,
  otherName,
  seed,
}: {
  selfName: string;
  otherName: string;
  seed: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(seed);
  const [draft, setDraft] = useState("");

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { id: `local-${m.length}`, author: "me", name: selfName, text, time: "now" },
    ]);
    setDraft("");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-1 pb-2">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {m.author === "system" ? (
                <p className="text-center text-xs text-[var(--muted)]">{m.text}</p>
              ) : (
                <div className={`flex ${m.author === "me" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[78%]">
                    <p className="mb-1 px-1 text-[11px] text-[var(--muted)]">
                      {m.author === "me" ? "You" : m.name} · {m.time}
                    </p>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm ${
                        m.author === "me"
                          ? "bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-white"
                          : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)]"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <form onSubmit={send} className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${otherName}…`}
          className="h-11 flex-1 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 outline-none focus:border-[var(--accent-2)]/70"
        />
        <Button type="submit" size="sm" disabled={!draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
