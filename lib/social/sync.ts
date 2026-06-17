/**
 * Social follower sync — integration seam.
 *
 * Follower counts are entered manually today (see the creator profile form).
 * Live syncing real counts from Instagram/TikTok is NOT wired up yet because it
 * requires external setup that can't be done from code alone:
 *
 *   • Instagram Graph API — a Meta Developer app, Business/Creator accounts,
 *     Meta app review, and each creator OAuth-connecting their account.
 *   • TikTok — a registered TikTok developer app + per-creator OAuth.
 *   • Or a creator-data aggregator (Modash, Phyllo, HypeAuditor) — one paid API.
 *
 * When a provider + API key are available, implement `fetchFollowerCounts` below
 * and call `syncCreatorFollowers` from a cron/route. The DB already has the
 * columns (instagram_followers, tiktok_followers, followers_synced_at).
 */

export interface FollowerCounts {
  instagram: number | null;
  tiktok: number | null;
}

/**
 * Placeholder. Replace the body with a real provider call, reading the API key
 * from an env var (e.g. process.env.MODASH_API_KEY).
 */
export async function fetchFollowerCounts(handles: {
  instagram: string | null;
  tiktok: string | null;
}): Promise<FollowerCounts> {
  void handles; // used once a provider is implemented
  throw new Error(
    "Live follower sync isn't configured. Add a provider (e.g. Modash/Phyllo) " +
      "and implement fetchFollowerCounts(), then set the API key env var.",
  );
}

export function isSyncConfigured(): boolean {
  // Flip this on once a provider key is set, e.g.:
  // return Boolean(process.env.MODASH_API_KEY);
  return false;
}
