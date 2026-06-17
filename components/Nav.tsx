import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { signOut } from "@/app/actions/auth";

export async function Nav() {
  const me = await getCurrentUser();

  return (
    <nav className="border-b border-[var(--foreground)]/10">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
        <Link
          href="/marketplace"
          className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[var(--foreground)]"
        >
          Influencer<span className="text-[var(--accent)]">Connect</span>
        </Link>

        <div className="flex items-center gap-5 text-sm">
          <Link href="/marketplace" className="text-[var(--muted)] hover:text-[var(--foreground)]">
            Browse
          </Link>
          {me && (
            <Link href="/bookings" className="text-[var(--muted)] hover:text-[var(--foreground)]">
              My bookings
            </Link>
          )}
          {me?.role === "creator" && (
            <Link href="/dashboard/creator" className="text-[var(--muted)] hover:text-[var(--foreground)]">
              Dashboard
            </Link>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3 text-sm">
          {me ? (
            <>
              <span className="hidden text-[var(--muted)] sm:inline">
                {me.email}
                <span className="ml-1 rounded-full bg-[var(--foreground)]/5 px-2 py-0.5 text-xs capitalize">
                  {me.role}
                </span>
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-full border border-[var(--foreground)]/15 px-4 py-1.5 text-[var(--foreground)] hover:border-[var(--foreground)]/40"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-[var(--muted)] hover:text-[var(--foreground)]">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[var(--foreground)] px-4 py-1.5 font-medium text-[var(--background)] hover:opacity-90"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
