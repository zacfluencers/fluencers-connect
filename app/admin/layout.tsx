import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * Every page under /admin is gated here. A non-admin gets a 404 — the area
 * doesn't announce itself.
 *
 * This layout is a guard, not the only guard: each server action re-checks admin
 * independently, because a layout protects a page render, not an HTTP endpoint.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 h-display font-semibold">Admin</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Everything on the platform. Only you can see this.
          </p>
        </div>
        <nav className="flex items-center gap-1 rounded-full border border-[var(--border)] p-1">
          <AdminTab href="/admin">Overview</AdminTab>
          <AdminTab href="/admin/users">People</AdminTab>
          <AdminTab href="/admin/bookings">Bookings</AdminTab>
        </nav>
      </div>
      {children}
    </main>
  );
}

function AdminTab({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-4 py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--foreground)]"
    >
      {children}
    </Link>
  );
}
