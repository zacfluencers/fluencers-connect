/**
 * Slice a list into a single page.
 *
 * Rendering an entire list at once is what white-screened mobile Safari on the
 * marketplace: 157 creator cards held roughly 300MB of decoded images, over
 * the per-tab memory cap. Any page that shows an unbounded list of cards runs
 * the same risk, so they all page through this.
 *
 * The page number is clamped, so a hand-typed `?page=99` or a stale bookmark
 * lands on the last real page rather than an empty grid that reads as "nothing
 * here".
 */
export interface Page<T> {
  visible: T[];
  page: number;
  pageCount: number;
  /** Zero-based index of the first visible item, for "showing 25-48" copy. */
  start: number;
}

export function paginate<T>(
  items: T[],
  pageParam: string | undefined,
  pageSize: number,
): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const requested = Math.floor(Number(pageParam));
  const page = Number.isFinite(requested)
    ? Math.min(Math.max(1, requested), pageCount)
    : 1;
  const start = (page - 1) * pageSize;
  return { visible: items.slice(start, start + pageSize), page, pageCount, start };
}
