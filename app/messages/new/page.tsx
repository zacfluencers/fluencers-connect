import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { brandCanTransact } from "@/lib/subscription";
import { Card } from "@/components/ui/Card";
import { NewConversation } from "@/components/NewConversation";
import { ButtonLink } from "@/components/ui/Button";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";
export const metadata = { title: "New message - Fluencers Connect" };

/**
 * Compose screen for a conversation that doesn't exist yet. Looks like a
 * thread, but nothing is created in the database until the first message is
 * sent — so backing out of this page leaves no trace in anyone's inbox.
 */
export default async function NewMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!to || to === me.id) redirect("/messages");

  // The buttons that lead here are hidden from free brands, but a URL can be
  // typed — enforce the same paywall the send action does.
  if (me.role === "brand" && !(await brandCanTransact(me.id))) {
    redirect("/dashboard/brand");
  }

  const supabase = await createClient();

  // If a thread with this person already exists, go there instead.
  const brandId = me.role === "brand" ? me.id : to;
  const creatorId = me.role === "brand" ? to : me.id;
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("brand_id", brandId)
    .eq("creator_id", creatorId)
    .is("booking_id", null)
    .maybeSingle();
  if (existing?.id) redirect(`/messages/${existing.id}`);

  // Brands message creators; creators message brands.
  const counterpartRole = me.role === "brand" ? "creator" : "brand";
  const counterpart =
    counterpartRole === "creator"
      ? await supabase
          .from("creator_profiles")
          .select("name, profile_image")
          .eq("user_id", to)
          .maybeSingle()
          .then((r) =>
            r.data ? { name: r.data.name, image: r.data.profile_image } : null,
          )
      : await supabase
          .from("brand_profiles")
          .select("company_name, logo_url")
          .eq("user_id", to)
          .maybeSingle()
          .then((r) =>
            r.data ? { name: r.data.company_name, image: r.data.logo_url } : null,
          );
  if (!counterpart) notFound();

  const profileHref =
    counterpartRole === "creator" ? `/creator/${to}` : `/brand/${to}`;

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <Link
        href="/messages"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        ← Messages
      </Link>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={profileHref} aria-label={counterpart.name}>
            <Avatar src={counterpart.image} name={counterpart.name} className="h-11 w-11" />
          </Link>
          <Link href={profileHref} className="text-h3 font-semibold hover:underline">
            {counterpart.name}
          </Link>
        </div>
        <ButtonLink href={profileHref} variant="secondary" size="sm">
          View profile
        </ButtonLink>
      </div>

      <Card className="flex h-[60vh] flex-col p-5">
        <NewConversation counterpartId={to} counterpartName={counterpart.name} />
      </Card>
    </main>
  );
}
