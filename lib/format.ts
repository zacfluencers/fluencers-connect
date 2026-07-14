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

/**
 * Ask Supabase for an image at the size we actually display it.
 *
 * Uploads are stored untouched, so a creator's phone photo can be a 4MB PNG
 * that we then render in a 290px box. Swapping the storage URL for the render
 * endpoint hands back a resized WebP instead (1.3MB → 27KB), which is the
 * difference between a fast page and a slow one.
 *
 * `width` is the CSS width of the slot; we request 2× for retina screens.
 * Anything not in Supabase storage (Instagram/TikTok avatars, which are already
 * thumbnail-sized) passes straight through.
 *
 * `resize=contain` is essential, not a nicety. Supabase defaults to `cover`,
 * which — given a width and no height — narrows the image to that width but
 * keeps every pixel of the original height, so a 4284x5712 portrait comes back
 * as 720x5712. Our `object-cover` then crops that sliver to a square and the
 * photo looks wildly zoomed in. `contain` scales it down whole, and the CSS
 * frames it exactly as it always did.
 */
export function sizedImage(
  url: string | null | undefined,
  width: number,
): string | null {
  if (!url) return null;
  const [base] = url.split("?");
  if (!base.includes("/storage/v1/object/public/")) return url;
  const render = base.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/",
  );
  return `${render}?width=${width * 2}&quality=75&resize=contain`;
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
