import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getMyConversations } from "@/lib/queries";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages — Influencer Connect" };

export default async function MessagesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const conversations = await getMyConversations();

  return (
    <main className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
      <h1 className="text-h1 h-display font-bold">Messages</h1>
      <p className="mt-2 text-[var(--muted)]">Your conversations.</p>

      {conversations.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center">
          <p className="text-[var(--muted)]">No conversations yet.</p>
          {me.role === "creator" && (
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
              <Link href={`/messages/${c.id}`} className="block">
                <Card interactive className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar src={c.counterpartImage} name={c.counterpartName} className="h-10 w-10" />
                      <p className="truncate font-semibold text-[var(--foreground)]">
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
                  <p className="mt-1 truncate text-sm text-[var(--muted)]">
                    {c.lastMessage ?? "No messages yet"}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
