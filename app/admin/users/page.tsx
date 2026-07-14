import Link from "next/link";
import { listAdminUsers } from "@/lib/admin-queries";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const users = await listAdminUsers(q);

  return (
    <div>
      {/* A plain GET form — no JavaScript needed, and the search survives a refresh. */}
      <form className="mb-6 flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name or email…"
          className="w-full max-w-sm rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent-2)]/60"
        />
        <button
          type="submit"
          className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5"
        >
          Search
        </button>
        {q && (
          <Link
            href="/admin/users"
            className="self-center text-sm text-[var(--muted)] underline-offset-4 hover:underline"
          >
            Clear
          </Link>
        )}
      </form>

      <p className="mb-3 text-sm text-[var(--muted)]">
        {users.length} {users.length === 1 ? "person" : "people"}
        {q ? ` matching “${q}”` : ""}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--muted)]">
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Subscription</Th>
              <Th>Joined</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--border)] last:border-0">
                <Td>
                  <span className="font-medium text-[var(--foreground)]">
                    {u.name ?? <span className="text-[var(--muted)]">No profile yet</span>}
                  </span>
                  {u.isAdmin && (
                    <span className="ml-2 inline-block align-middle">
                      <Badge tone="info">Admin</Badge>
                    </span>
                  )}
                </Td>
                <Td>{u.email}</Td>
                <Td className="capitalize">{u.role}</Td>
                <Td>
                  {u.role !== "brand" ? (
                    <span className="text-[var(--muted)]">—</span>
                  ) : u.subscription ? (
                    <span className="capitalize">{u.subscription.replace("_", " ")}</span>
                  ) : (
                    <span className="text-[var(--muted)]">Never subscribed</span>
                  )}
                </Td>
                <Td>
                  {u.createdAt
                    ? new Date(u.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <p className="p-8 text-center text-sm text-[var(--muted)]">
            Nobody matches that search.
          </p>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 text-[var(--muted)] ${className}`}>{children}</td>;
}
