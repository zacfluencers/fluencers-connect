import Link from "next/link";

/** A modular dashboard card: title, optional subtitle / count / corner action. */
export function Panel({
  title,
  subtitle,
  count,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-h3 font-semibold text-[var(--foreground)]">
            {title}
            {count != null && (
              <span className="ml-2 text-base font-normal text-[var(--muted)]">
                ({count})
              </span>
            )}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
          )}
        </div>
        {action && (
          <Link
            href={action.href}
            className="shrink-0 text-sm text-[var(--accent-2)] underline-offset-4 hover:underline"
          >
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** A compact stat tile for the dashboard stat strips. */
export function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  const highlight = accent && Number(value) > 0;
  return (
    <div
      className={`min-w-0 rounded-2xl border p-3 sm:p-4 ${
        highlight
          ? "border-[var(--accent-2)]/40 bg-[var(--accent-2)]/10"
          : "border-[var(--border)] bg-[var(--surface)]/40"
      }`}
    >
      <p className="truncate text-xl font-bold text-[var(--foreground)] tabular-nums sm:text-2xl">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{label}</p>
    </div>
  );
}
