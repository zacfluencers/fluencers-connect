import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  NotificationPrefsForm,
  ChangePasswordForm,
  ChangeEmailForm,
  DeleteAccountForm,
} from "@/components/SettingsForms";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const supabase = await createClient();
  const { data: prefs } = await supabase
    .from("users")
    .select("email_messages, email_bookings")
    .eq("id", me.id)
    .maybeSingle();

  const profileHref =
    me.role === "creator" ? "/dashboard/creator" : "/dashboard/brand";

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="text-h2 h-display font-semibold">Settings</h1>
      <p className="mt-2 text-[var(--muted)]">
        Your account. To edit your public profile,{" "}
        <Link
          href={profileHref}
          className="text-[var(--accent-2)] underline-offset-4 hover:underline"
        >
          go to your dashboard
        </Link>
        .
      </p>

      <div className="mt-12 space-y-12">
        <Section
          title="Emails"
          blurb="What lands in your inbox. You'll always see everything in the app — this only controls the emails."
        >
          <NotificationPrefsForm
            emailMessages={prefs?.email_messages ?? true}
            emailBookings={prefs?.email_bookings ?? true}
          />
        </Section>

        <Section title="Password" blurb="Change the password you sign in with.">
          <ChangePasswordForm />
        </Section>

        <Section
          title="Email address"
          blurb="We'll send a link to the new address. Your current one keeps working until you click it."
        >
          <ChangeEmailForm current={me.email} />
        </Section>

        <Section
          title="Close account"
          blurb="Delete your profile and stop being able to sign in."
        >
          <DeleteAccountForm />
        </Section>
      </div>
    </main>
  );
}

function Section({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[var(--border)] pt-8">
      <h2 className="text-h3 h-display font-semibold">{title}</h2>
      <p className="mb-6 mt-1.5 max-w-xl text-sm text-[var(--muted)]">{blurb}</p>
      {children}
    </section>
  );
}
