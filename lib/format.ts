export const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/** 1_240 → "1.2k", 3_400_000 → "3.4M". */
export function formatFollowers(n: number | null | undefined): string | null {
  if (n == null) return null;
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${trim(n / 1000)}k`;
  return `${trim(n / 1_000_000)}M`;
}

function trim(v: number): string {
  // One decimal, but drop a trailing ".0".
  return v.toFixed(1).replace(/\.0$/, "");
}

/**
 * Best avatar for a creator, honouring the priority:
 * uploaded photo → Instagram avatar → TikTok avatar → null (placeholder).
 * A manually uploaded image is never overwritten — the imported ones are only
 * a fallback.
 */
export function creatorAvatar(c: {
  profile_image?: string | null;
  instagram_avatar?: string | null;
  tiktok_avatar?: string | null;
}): string | null {
  return c.profile_image || c.instagram_avatar || c.tiktok_avatar || null;
}

/** "3.4%" engagement label, or null when there's nothing meaningful to show. */
export function formatEngagement(rate: number | null | undefined): string | null {
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return null;
  return `${Math.min(rate, 100).toFixed(1)}%`;
}

/** Strip a leading @ from a handle. */
export function cleanHandle(handle: string): string {
  return handle.replace(/^@+/, "").trim();
}

/** Public profile URL for a handle (accepts a full URL too). */
export function instagramUrl(handle: string): string {
  if (/^https?:\/\//i.test(handle)) return handle;
  return `https://instagram.com/${cleanHandle(handle)}`;
}

export function tiktokUrl(handle: string): string {
  if (/^https?:\/\//i.test(handle)) return handle;
  return `https://tiktok.com/@${cleanHandle(handle)}`;
}

/** Compact "time ago" label, e.g. "just now", "5m", "3h", "2d". */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return `${Math.floor(d / 30)}mo`;
}
