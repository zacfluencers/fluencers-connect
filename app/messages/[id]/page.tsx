import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getConversation } from "@/lib/queries";
import { Card } from "@/components/ui/Card";
import { Conversation } from "@/components/Conversation";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const convo = await getConversation(id);
  if (!convo) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/messages"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        ← Messages
      </Link>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-h3 font-semibold">{convo.counterpartName}</h1>
        {convo.bookingId && (
          <Link
            href={`/bookings/${convo.bookingId}`}
            className="text-sm text-[var(--accent-2)] hover:underline"
          >
            View booking →
          </Link>
        )}
      </div>

      <Card className="flex h-[60vh] flex-col p-5">
        <Conversation
          conversationId={convo.id}
          currentUserId={me.id}
          counterpartName={convo.counterpartName}
          messages={convo.messages}
        />
      </Card>
    </main>
  );
}
