/**
 * ScrapeCreators API client — SERVER ONLY.
 *
 * Fetches public Instagram/TikTok profile data through ScrapeCreators and
 * normalises it into one shape (NormalizedSocialProfile). The API key is read
 * from `process.env.SCRAPECREATORS_API_KEY` and sent in the `x-api-key` header —
 * it is never exposed to the browser (no NEXT_PUBLIC_).
 *
 * The provider returns the platforms' raw profile JSON, whose exact shape can
 * shift, so the normaliser probes several candidate paths and we always keep the
 * full `raw` response in the database (creator_social_accounts.raw_api_response)
 * so nothing is lost and the mapping can be adjusted without re-fetching.
 */

import "server-only";

export type SocialPlatform = "instagram" | "tiktok";

export interface NormalizedSocialProfile {
  platform: SocialPlatform;
  handle: string;
  profileUrl?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  averageLikes?: number;
  averageViews?: number;
  engagementRate?: number; // percentage, e.g. 3.42
  lastSyncedAt: string;
}

const BASE_URL = "https://api.scrapecreators.com";

/** ScrapeCreators profile endpoints, by platform. */
const ENDPOINT: Record<SocialPlatform, string> = {
  instagram: "/v1/instagram/profile",
  tiktok: "/v1/tiktok/profile",
};

export function isScrapeCreatorsConfigured(): boolean {
  return Boolean(process.env.SCRAPECREATORS_API_KEY);
}

/** Strip leading @/spaces from a handle. */
export function cleanHandle(handle: string): string {
  return handle.replace(/^@+/, "").trim();
}

type Json = Record<string, unknown>;

/** Coerce a value that may be a number or numeric string to a finite number. */
function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function str(v: unknown): string | undefined {
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? undefined : t;
  }
  return undefined;
}

/** Read a nested value by dotted path, e.g. get(obj, "data.user.full_name"). */
function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Json)) {
      return (acc as Json)[key];
    }
    return undefined;
  }, obj);
}

/** First defined value across a list of candidate paths. */
function pick(obj: unknown, paths: string[]): unknown {
  for (const p of paths) {
    const v = get(obj, p);
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function normalizeInstagram(handle: string, raw: unknown): NormalizedSocialProfile {
  // ScrapeCreators wraps Instagram's web_profile_info, so most fields live under
  // data.user / user. We probe both plus a couple of flatter fallbacks.
  const followerCount = num(pick(raw, [
    "data.user.edge_followed_by.count",
    "user.edge_followed_by.count",
    "data.follower_count",
    "follower_count",
    "followers",
  ]));
  const followingCount = num(pick(raw, [
    "data.user.edge_follow.count",
    "user.edge_follow.count",
    "following_count",
  ]));
  const postCount = num(pick(raw, [
    "data.user.edge_owner_to_timeline_media.count",
    "user.edge_owner_to_timeline_media.count",
    "media_count",
  ]));
  return dropUndefined({
    platform: "instagram",
    handle,
    profileUrl: `https://instagram.com/${handle}`,
    displayName: str(pick(raw, ["data.user.full_name", "user.full_name", "full_name"])),
    bio: str(pick(raw, ["data.user.biography", "user.biography", "biography"])),
    avatarUrl: str(pick(raw, [
      "data.user.profile_pic_url_hd",
      "user.profile_pic_url_hd",
      "data.user.profile_pic_url",
      "user.profile_pic_url",
      "profile_pic_url",
    ])),
    followerCount,
    followingCount,
    postCount,
    lastSyncedAt: nowIso(),
  });
}

function normalizeTiktok(handle: string, raw: unknown): NormalizedSocialProfile {
  // TikTok: user object + a stats/statsV2 block (statsV2 values are strings).
  const followerCount = num(pick(raw, [
    "user.stats.followerCount",
    "stats.followerCount",
    "statsV2.followerCount",
    "userInfo.stats.followerCount",
    "data.stats.followerCount",
    "followerCount",
  ]));
  const followingCount = num(pick(raw, [
    "user.stats.followingCount",
    "stats.followingCount",
    "statsV2.followingCount",
    "userInfo.stats.followingCount",
    "followingCount",
  ]));
  const postCount = num(pick(raw, [
    "user.stats.videoCount",
    "stats.videoCount",
    "statsV2.videoCount",
    "userInfo.stats.videoCount",
    "videoCount",
  ]));
  const heartCount = num(pick(raw, [
    "user.stats.heartCount",
    "stats.heartCount",
    "statsV2.heartCount",
    "userInfo.stats.heartCount",
    "heartCount",
    "heart",
  ]));

  // Rough engagement signals from the profile totals (no per-post data here):
  // average likes ≈ total hearts / videos, engagement ≈ avg likes / followers.
  const averageLikes =
    heartCount && postCount ? Math.round(heartCount / postCount) : undefined;
  const engagementRate =
    averageLikes && followerCount
      ? Number(((averageLikes / followerCount) * 100).toFixed(3))
      : undefined;

  return dropUndefined({
    platform: "tiktok",
    handle,
    profileUrl: `https://tiktok.com/@${handle}`,
    displayName: str(pick(raw, ["user.nickname", "userInfo.user.nickname", "nickname"])),
    bio: str(pick(raw, ["user.signature", "userInfo.user.signature", "signature"])),
    avatarUrl: str(pick(raw, [
      "user.avatarLarger",
      "userInfo.user.avatarLarger",
      "user.avatarMedium",
      "avatarLarger",
      "avatarMedium",
    ])),
    followerCount,
    followingCount,
    postCount,
    averageLikes,
    engagementRate,
    lastSyncedAt: nowIso(),
  });
}

/**
 * Fetch + normalise a public profile. Returns the normalised data and the raw
 * response, or an `error` string on any failure (never throws to the caller).
 */
export async function fetchSocialProfile(
  platform: SocialPlatform,
  handleInput: string,
): Promise<
  | { ok: true; normalized: NormalizedSocialProfile; raw: unknown }
  | { ok: false; error: string }
> {
  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  if (!apiKey) return { ok: false, error: "Social enrichment isn't configured." };

  const handle = cleanHandle(handleInput);
  if (!handle) return { ok: false, error: "No handle provided." };

  const url = `${BASE_URL}${ENDPOINT[platform]}?handle=${encodeURIComponent(handle)}`;

  let raw: unknown;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(url, {
      method: "GET",
      headers: { "x-api-key": apiKey, accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, error: `Provider returned ${res.status}.` };
    }
    raw = await res.json();
  } catch {
    return { ok: false, error: "Couldn't reach the enrichment provider." };
  }

  const normalized =
    platform === "instagram"
      ? normalizeInstagram(handle, raw)
      : normalizeTiktok(handle, raw);

  // Guard against a 200 with empty/garbage body (e.g. a not-found profile).
  if (normalized.followerCount == null && !normalized.displayName && !normalized.avatarUrl) {
    return { ok: false, error: "No profile data found for that handle." };
  }

  return { ok: true, normalized, raw };
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Remove undefined keys so we store clean rows. */
function dropUndefined(obj: NormalizedSocialProfile): NormalizedSocialProfile {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as unknown as NormalizedSocialProfile;
}
