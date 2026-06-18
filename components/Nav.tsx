import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getMyNotifications, getUnreadNotificationCount } from "@/lib/queries";
import { signOut } from "@/app/actions/auth";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileNav } from "@/components/MobileNav";

export async function Nav() {
  const me = await getCurrentUser();
  const dashboardHref =
    me?.role === "creator" ? "/dashboard/creator" : "/dashboard/brand";

  const [notifications, unread] = me
    ? await Promise.all([getMyNotifications(), getUnreadNotificationCount()])
    : [[], 0];

  // Shared link set — drives both the desktop bar and the mobile menu.
  const links: { href: string; label: string }[] = [
    me?.role === "creator"
      ? { href: "/brands", label: "Brands" }
      : { href: "/marketplace", label: "Browse" },
  ];
  if (me) {
    links.push(
      { href: "/favorites", label: "Favourites" },
      { href: "/messages", label: "Messages" },
      { href: "/bookings", label: "Bookings" },
      { href: dashboardHref, label: "Dashboard" },
    );
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 py-3.5 sm:px-6">
        <Link href="/" className="flex items-center" aria-label="Influencer Connect — home">
          <Logo className="h-5 w-auto text-[var(--foreground)]" />
        </Link>

        {/* Signed-in: full link bar at lg+ (hamburger below). Signed-out: just
            Browse from sm+ (the CTAs stay visible on the right). */}
        {me ? (
          <div className="ml-2 hidden items-center gap-1 text-sm lg:flex">
            {links.map((l) => (
              <NavLink key={l.href} href={l.href}>
                {l.label}
              </NavLink>
            ))}
          </div>
        ) : (
          <div className="ml-2 hidden items-center gap-1 text-sm sm:flex">
            <NavLink href={links[0].href}>{links[0].label}</NavLink>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2 text-sm sm:gap-3">
          {me ? (
            <>
              <NotificationBell notifications={notifications} unread={unread} />

              {/* Account actions — desktop only; the hamburger covers below lg */}
              <div className="hidden items-center gap-3 lg:flex">
                <span className="flex items-center gap-2 text-[var(--muted)]">
                  {/* Email is the longest item — only show it when there's room. */}
                  <span className="hidden max-w-[160px] truncate xl:block">{me.email}</span>
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
              </div>

              <MobileNav me={{ email: me.email, role: me.role }} links={links} />
            </>
          ) : (
            /* Signed-out: primary CTAs always visible — never hidden behind a menu */
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
