import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import {
  getMyConversations,
  getMessageCounts,
  type ConversationView,
} from "@/lib/queries";
import {
  archiveConversationAction,
  unarchiveConversationAction,
  acceptMessageRequestAction,
  declineMessageRequestAction,
  restoreMessageRequestAction,
} from "@/app/actions/messages";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages - Fluencers Connect" };

const VIEWS: { key: ConversationView; label: string }[] = [
  { key: "inbox", label: "Inbox" },
  { key: "requests", label: "Requests" },
  { key: "archived", label: "Archived" },
  // Declined is listed last and only appears once something is in it, so it
  // stays out of the way without ever being a dead end.
  { key: "declined", label: "Declined" },
];

const EMPTY: Record<ConversationView, string> = {
  inbox: "No conversations yet.",
  requests: "No new requests. People who message you first land here.",
  archived: "Nothing archived. Threads you put away appear here.",
  declined: "Nothing declined.",
};

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const { view: raw } = await searchParams;
  const view: ConversationView =
    raw === "requests" || raw === "archived" || raw === "declined"
      ? raw
      : "inbox";

  const [conversations, counts] = await Promise.all([
    getMyConversations(view),
    getMessageCounts(),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
      <h1 className="text-h1 h-display font-bold">Messages</h1>
      <p className="mt-2 text-[var(--muted)]">Your conversations.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {VIEWS.filter(
          (v) => v.key !== "declined" || counts.declined > 0 || view === "declined",
        ).map((v) => {
          const active = v.key === view;
          // Only surface a count where it means "something needs you".
          const badge =
            v.key === "inbox"
              ? counts.unread
              : v.key === "requests"
                ? counts.requests
                : 0;
          return (
            <Link
              key={v.key}
              href={v.key === "inbox" ? "/messages" : `/messages?view=${v.key}`}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                active
                  ? "border-[var(--accent-2)] bg-[var(--accent-2)]/15 text-[var(--foreground)]"
                  : "border-[var(--border-strong)] text-[var(--muted)] hover:border-[var(--accent-2)]/50"
              }`}
            >
              {v.label}
              {badge > 0 && (
                <span className="rounded-full bg-[var(--accent-2)] px-1.5 text-xs font-semibold text-white">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {conversations.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center">
          <p className="text-[var(--muted)]">{EMPTY[view]}</p>
          {me.role === "creator" && view === "inbox" && (
            <Link
              href="/brands"
              className="mt-4 inline-block text-sm font-medium text-[var(--accent-2)] underline-offset-4 hover:underline"
            >
              Find brands looking for creators
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {conversations.map((c) => (
            <li key={c.id}>
              <Card className="p-5">
                <Link href={`/messages/${c.id}`} className="block">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {/* The unread dot sits before the name, where the eye
                          lands first when scanning a long list. */}
                      {c.unread && (
                        <span
                          aria-label="Unread"
                          className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-2)]"
                        />
                      )}
                      <Avatar src={c.counterpartImage} name={c.counterpartName} className="h-10 w-10" />
                      <p
                        className={`truncate ${
                          c.unread
                            ? "font-bold text-[var(--foreground)]"
                            : "font-semibold text-[var(--foreground)]"
                        }`}
                      >
                        {c.counterpartName}
                      </p>
                    </div>
                    {c.bookingStatus ? (
                      <span className="flex items-center gap-2">
                        <span className="hidden text-xs font-medium uppercase tracking-wide text-[var(--accent-2)] sm:inline">
                          Deal room
                        </span>
                        <StatusBadge status={c.bookingStatus} />
                      </span>
                    ) : (
                      <span className="rounded-full border border-[var(--border-strong)] px-2.5 py-0.5 text-xs text-[var(--muted)]">
                        Direct message
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-1 truncate text-sm ${
                      c.unread ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                    }`}
                  >
                    {c.lastMessage ?? "No messages yet"}
                  </p>
                </Link>

                {/* Outside the Link: a form nested inside an anchor is invalid
                    HTML, and the click targets would fight each other. */}
                <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                  {view === "requests" ? (
                    <>
                      <StateButton
                        action={acceptMessageRequestAction}
                        id={c.id}
                        label="Accept"
                        primary
                      />
                      <StateButton
                        action={declineMessageRequestAction}
                        id={c.id}
                        label="Decline"
                      />
                    </>
                  ) : view === "declined" ? (
                    <StateButton
                      action={restoreMessageRequestAction}
                      id={c.id}
                      label="Undo decline"
                    />
                  ) : view === "archived" ? (
                    <StateButton
                      action={unarchiveConversationAction}
                      id={c.id}
                      label="Move back to inbox"
                    />
                  ) : (
                    <StateButton
                      action={archiveConversationAction}
                      id={c.id}
                      label="Archive"
                    />
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function StateButton({
  action,
  id,
  label,
  primary,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="conversationId" value={id} />
      <button
        type="submit"
        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
          primary
            ? "border-[var(--accent-2)] bg-[var(--accent-2)]/15 text-[var(--foreground)] hover:bg-[var(--accent-2)]/25"
            : "border-[var(--border-strong)] text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
