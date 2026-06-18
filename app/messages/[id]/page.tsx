import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getConversation } from "@/lib/queries";
import { Card } from "@/components/ui/Card";
import { Conversation } from "@/components/Conversation";
import { StatusBadge } from "@/components/StatusBadge";
import { DealRoomLink } from "@/components/DealRoomLink";
import { ButtonLink } from "@/components/ui/Button";

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

      {(() => {
        const profileHref =
          convo.counterpartRole === "creator"
            ? `/creator/${convo.counterpartId}`
            : `/brand/${convo.counterpartId}`;
        return (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href={profileHref} className="text-h3 font-semibold hover:underline">
                {convo.counterpartName}
              </Link>
              {convo.bookingStatus && <StatusBadge status={convo.bookingStatus} />}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ButtonLink href={profileHref} variant="secondary" size="sm">
                View profile
              </ButtonLink>
              {convo.bookingId ? (
                <DealRoomLink id={convo.bookingId} />
              ) : (
                me.role === "brand" && (
                  <ButtonLink href={`/creator/${convo.counterpartId}`} size="sm">
                    Book now
                  </ButtonLink>
                )
              )}
            </div>
          </div>
        );
      })()}

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
