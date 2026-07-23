import Link from "next/link";

/**
 * Page links that carry the current query string with them - landing on page 2
 * of a filtered marketplace and losing the filters would be worse than no
 * paging at all. Pages other than the first drop back to no `page` param so the
 * first page has one canonical URL.
 */
export function Pagination({
  page,
  pageCount,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  /** Other query params to preserve across page links (e.g. filters). */
  params?: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  const href = (n: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v && k !== "page") q.set(k, v);
    }
    if (n > 1) q.set("page", String(n));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const box =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm transition-colors";

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex flex-wrap items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          rel="prev"
          className={`${box} border-[var(--border-strong)] text-[var(--foreground)] hover:bg-white/5`}
        >
          ← Previous
        </Link>
      ) : (
        <span className={`${box} border-[var(--border)] text-[var(--muted)] opacity-40`}>
          ← Previous
        </span>
      )}

      <span className="px-2 text-sm text-[var(--muted)]">
        Page {page} of {pageCount}
      </span>

      {page < pageCount ? (
        <Link
          href={href(page + 1)}
          rel="next"
          className={`${box} border-[var(--border-strong)] text-[var(--foreground)] hover:bg-white/5`}
        >
          Next →
        </Link>
      ) : (
        <span className={`${box} border-[var(--border)] text-[var(--muted)] opacity-40`}>
          Next →
        </span>
      )}
    </nav>
  );
}
