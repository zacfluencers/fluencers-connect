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
