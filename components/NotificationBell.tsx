"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";
import { timeAgo } from "@/lib/format";
import type { AppNotification } from "@/lib/types";

/** Bell with an unread badge + dropdown of recent notifications. */
export function NotificationBell({
  notifications,
  unread,
}: {
  notifications: AppNotification[];
  unread: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function markAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  function openItem(n: AppNotification) {
    setOpen(false);
    startTransition(async () => {
      if (!n.read) await markNotificationRead(n.id);
      if (n.link) router.push(n.link);
      else router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--foreground)]"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-2)] px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-2)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                Notifications
              </span>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  className="text-xs text-[var(--accent-2)] hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                  You&apos;re all caught up.
                </p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openItem(n)}
                    className={`flex w-full gap-3 border-b border-[var(--border)] px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                      n.read ? "" : "bg-[var(--accent-2)]/8"
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        n.read ? "bg-transparent" : "bg-[var(--accent-2)]"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-[var(--foreground)]">
                          {n.title}
                        </span>
                        <span className="shrink-0 text-xs text-[var(--muted)]">
                          {timeAgo(n.created_at)}
                        </span>
                      </span>
                      {n.body && (
                        <span className="mt-0.5 line-clamp-2 block text-sm text-[var(--muted)]">
                          {n.body}
                        </span>
                      )}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
