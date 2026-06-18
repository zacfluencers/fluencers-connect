import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getMyNotifications, getUnreadNotificationCount } from "@/lib/queries";
import { signOut } from "@/app/actions/auth";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";

export async function Nav() {
  const me = await getCurrentUser();
  const dashboardHref =
    me?.role === "creator" ? "/dashboard/creator" : "/dashboard/brand";

  const [notifications, unread] = me
    ? await Promise.all([getMyNotifications(), getUnreadNotificationCount()])
    : [[], 0];

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3.5">
        <Link href="/" className="flex items-center" aria-label="Influencer Connect — home">
          <Logo className="h-5 w-auto text-[var(--foreground)]" />
        </Link>

        <div className="ml-2 hidden items-center gap-1 text-sm md:flex">
          {me?.role === "creator" ? (
            <NavLink href="/brands">Brands</NavLink>
          ) : (
            <NavLink href="/marketplace">Browse</NavLink>
          )}
          {me && <NavLink href="/favorites">Favourites</NavLink>}
          {me && <NavLink href="/messages">Messages</NavLink>}
          {me && <NavLink href="/bookings">Bookings</NavLink>}
          {me && <NavLink href={dashboardHref}>Dashboard</NavLink>}
        </div>

        <div className="ml-auto flex items-center gap-3 text-sm">
          {me ? (
            <>
              <NotificationBell notifications={notifications} unread={unread} />
              <span className="hidden items-center gap-2 text-[var(--muted)] sm:flex">
                <span className="max-w-[160px] truncate">{me.email}</span>
                <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs capitalize text-[var(--foreground)]">
                  {me.role}
                </span>
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-xl px-3 py-1.5 text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--foreground)]"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl px-3 py-1.5 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              >
                Sign in
              </Link>
              <ButtonLink href="/signup" size="sm">
                Get started
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-xl px-3 py-1.5 text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--foreground)]"
    >
      {children}
    </Link>
  );
}
