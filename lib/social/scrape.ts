/**
 * Best-effort, UNOFFICIAL follower scraping for demos.
 *
 * ⚠️ This reads public profile pages and parses the follower count out of the
 * HTML. It is fragile by nature: Instagram/TikTok change their markup, rate-limit
 * datacenter IPs, and may return a login wall — in which case we return null and
 * the creator enters the number manually. It also runs against the platforms'
 * terms of service, so it's only intended to demonstrate the product, not for
 * production. The supported path is a provider API — see ./sync.ts.
 *
 * SERVER-ONLY (uses fetch against third-party sites).
 */

/** "1.2M" → 1200000, "12.3K" → 12300, "1,234" → 1234. */
function parseCount(raw: string): number | null {
  const s = raw.trim().replace(/,/g, "");
  const m = s.match(/^([\d.]+)\s*([KMB])?$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!isFinite(n)) return null;
  const suffix = m[2]?.toUpperCase();
  const mult = suffix === "K" ? 1e3 : suffix === "M" ? 1e6 : suffix === "B" ? 1e9 : 1;
  return Math.round(n * mult);
}

const HANDLE = (h: string) => h.replace(/^@+/, "").trim();

async function getHtml(
  url: string,
  extraHeaders?: Record<string, string>,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...extraHeaders,
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function fetchInstagramFollowers(
  handle: string,
): Promise<number | null> {
  const h = HANDLE(handle);
  if (!h) return null;

  // 1) Unofficial web-profile JSON endpoint — most reliable (uses the public
  //    web app id; the HTML profile page is otherwise login-walled).
  const json = await getHtml(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(h)}`,
    { "x-ig-app-id": "936619743392459" },
  );
  if (json) {
    const m = json.match(/"edge_followed_by":\s*\{\s*"count":\s*(\d+)/);
    if (m) return parseInt(m[1], 10);
  }

  // 2) HTML meta fallback: "1,234 Followers, 56 Following, 7 Posts…"
  const html = await getHtml(`https://www.instagram.com/${encodeURIComponent(h)}/`);
  if (html) {
    const meta =
      html.match(/property="og:description"\s+content="([^"]+)"/i)?.[1] ??
      html.match(/name="description"\s+content="([^"]+)"/i)?.[1];
    if (meta) {
      const m = meta.match(/([\d.,]+\s*[KMB]?)\s+Followers/i);
      const n = m ? parseCount(m[1]) : null;
      if (n != null) return n;
    }
    const j = html.match(/"edge_followed_by":\{"count":(\d+)\}/);
    if (j) return parseInt(j[1], 10);
  }
  return null;
}

export async function fetchTiktokFollowers(
  handle: string,
): Promise<number | null> {
  const h = HANDLE(handle);
  if (!h) return null;
  const html = await getHtml(`https://www.tiktok.com/@${encodeURIComponent(h)}`);
  if (!html) return null;

  // Embedded hydration JSON: "followerCount":12345
  const j = html.match(/"followerCount":(\d+)/);
  if (j) return parseInt(j[1], 10);

  // Rendered markup fallback: data-e2e="followers-count">1.2M<
  const s = html.match(/data-e2e="followers-count"[^>]*>([\d.,]+\s*[KMB]?)</i);
  if (s) return parseCount(s[1]);
  return null;
}
