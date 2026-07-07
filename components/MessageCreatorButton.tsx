"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startCreatorConversation } from "@/app/actions/messages";

/** Brand-only: open (or resume) a direct chat with a creator. */
export function MessageCreatorButton({
  creatorId,
  viewerRole,
  className = "",
  full = false,
  locked = false,
}: {
  creatorId: string;
  viewerRole: "brand" | "creator" | null;
  className?: string;
  full?: boolean;
  /** Brand is signed in but not subscribed — route to plans instead of chat. */
  locked?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Hidden for creators and for unsubscribed brands (messaging is a paid feature).
  if (viewerRole === "creator" || locked) return null;

  function chat(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (viewerRole === null) {
      router.push("/login");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await startCreatorConversation(creatorId);
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <div className={full ? "" : "relative"}>
      <button
        type="button"
        onClick={chat}
        disabled={pending}
        className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-strong)] px-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white/5 disabled:opacity-50 ${
          full ? "w-full" : ""
        } ${className}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
        </svg>
        {pending ? "Opening…" : "Chat"}
      </button>
      {error && <p className="mt-1.5 text-xs text-rose-300">{error}</p>}
    </div>
  );
}
