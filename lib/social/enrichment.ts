/**
 * Creator social enrichment orchestration — SERVER ONLY.
 *
 * Ties the ScrapeCreators client to the database: fetch → normalise → upsert
 * into `creator_social_accounts` (source of truth) → mirror a few display fields
 * onto `creator_profiles` so the marketplace cards show them without joins.
 *
 * All writes use the service-role admin client, so callers MUST authorise the
 * request first (the route checks the signed-in creator owns `creatorId`; the
 * cron entry point checks a shared secret).
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMirroredAvatar, mirrorSocialAvatar } from "@/lib/social/avatar-mirror";
import {
  fetchSocialProfile,
  cleanHandle,
  type SocialPlatform,
  type NormalizedSocialProfile,
} from "@/lib/social/scrapecreators";

export type EnrichResult =
  | { ok: true; profile: NormalizedSocialProfile; cached?: boolean }
  | { ok: false; error: string };

/**
 * How long to reuse a just-fetched result for the SAME handle instead of
 * calling the paid provider again. Guards against rapid re-clicks / abuse
 * without affecting normal use (the weekly cron always fetches fresh).
 */
const MANUAL_COOLDOWN_MS = 60_000;

/** Rebuild the normalised shape from a stored creator_social_accounts row. */
function rowToNormalized(
  platform: SocialPlatform,
  row: Record<string, unknown>,
): NormalizedSocialProfile {
  const n = (v: unknown) => (v == null ? undefined : Number(v));
  return {
    platform,
    handle: String(row.handle ?? ""),
    profileUrl: (row.profile_url as string) ?? undefined,
    displayName: (row.display_name as string) ?? undefined,
    bio: (row.bio as string) ?? undefined,
    avatarUrl: (row.avatar_url as string) ?? undefined,
    followerCount: n(row.follower_count),
    followingCount: n(row.following_count),
    postCount: n(row.post_count),
    averageLikes: n(row.average_likes),
    averageViews: n(row.average_views),
    engagementRate: n(row.engagement_rate),
    lastSyncedAt: String(row.last_synced_at ?? new Date().toISOString()),
  };
}

/**
 * Enrich ONE platform for a creator: fetch public data, save it, refresh the
 * denormalised card fields. Never throws — returns `{ ok:false }` on failure so
 * the profile page keeps working.
 *
 * `force` (used by the scheduled cron) bypasses the manual cooldown so a
 * scheduled refresh always fetches fresh data.
 */
export async function enrichCreatorSocial(
  creatorId: string,
  platform: SocialPlatform,
  handleInput: string,
  opts: { force?: boolean } = {},
): Promise<EnrichResult> {
  const handle = cleanHandle(handleInput);
  if (!handle) return { ok: false, error: "No handle provided." };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("creator_social_accounts")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("platform", platform)
    .maybeSingle();

  // Cooldown: if the SAME handle was just synced, reuse it instead of paying
  // for another provider call. A changed handle always re-fetches.
  if (
    !opts.force &&
    existing &&
    cleanHandle(String(existing.handle ?? "")) === handle &&
    existing.last_synced_at &&
    Date.now() - new Date(existing.last_synced_at as string).getTime() < MANUAL_COOLDOWN_MS
  ) {
    return { ok: true, profile: rowToNormalized(platform, existing), cached: true };
  }

  const result = await fetchSocialProfile(platform, handle);
  if (!result.ok) {
    console.error(`[social] enrich ${platform} @${handle} failed:`, result.error);
    return { ok: false, error: result.error };
  }

  const { normalized, raw } = result;
  const now = new Date().toISOString();

  // Store a copy of the profile picture rather than the provider's expiring,
  // frequently ad-blocked CDN link. If the copy fails we keep the original —
  // a photo that works for a few days beats no photo (see avatar-mirror.ts).
  const avatarUrl = normalized.avatarUrl
    ? ((await mirrorSocialAvatar(creatorId, platform, normalized.avatarUrl)) ??
      normalized.avatarUrl)
    : null;

  // Source of truth: one row per creator+platform (upsert, never duplicate).
  const { error: upsertError } = await admin
    .from("creator_social_accounts")
    .upsert(
      {
        creator_id: creatorId,
        platform,
        handle,
        profile_url: normalized.profileUrl ?? null,
        display_name: normalized.displayName ?? null,
        bio: normalized.bio ?? null,
        avatar_url: avatarUrl,
        follower_count: normalized.followerCount ?? null,
        following_count: normalized.followingCount ?? null,
        post_count: normalized.postCount ?? null,
        average_likes: normalized.averageLikes ?? null,
        average_views: normalized.averageViews ?? null,
        engagement_rate: normalized.engagementRate ?? null,
        last_synced_at: normalized.lastSyncedAt,
        raw_api_response: raw as object,
        updated_at: now,
      },
      { onConflict: "creator_id,platform" },
    );
  if (upsertError) {
    console.error("[social] upsert creator_social_accounts failed:", upsertError.message);
    return { ok: false, error: "Couldn't save the imported profile." };
  }

  // Mirror the display fields onto creator_profiles. This is a no-op when the
  // creator hasn't saved their profile row yet (a brand-new creator who imports
  // before their first save) — which is exactly why saving the profile calls
  // syncProfileFromSocialAccounts() again. Nothing is lost either way:
  // creator_social_accounts above is the source of truth.
  await syncProfileFromSocialAccounts(creatorId);

  return { ok: true, profile: normalized };
}

/**
 * Copy the stored social stats onto `creator_profiles` so the marketplace cards
 * can render them without a join. Reads creator_social_accounts (the source of
 * truth) and writes the denormalised columns.
 *
 * Safe and free to call any time — it's a pure database operation and never hits
 * the paid provider. Call it after ANY write to creator_profiles that might have
 * raced the import, and after every enrichment.
 *
 * Returns true when a profile row was actually updated (false when the creator
 * has no profile row yet, or has no imported stats).
 *
 * Non-destructive to `profile_image`: an imported avatar is stored separately in
 * instagram_avatar/tiktok_avatar and only used as a fallback when the creator
 * hasn't uploaded their own photo.
 */
export async function syncProfileFromSocialAccounts(creatorId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: accounts } = await admin
    .from("creator_social_accounts")
    .select("platform, follower_count, engagement_rate, avatar_url, last_synced_at")
    .eq("creator_id", creatorId);

  if (!accounts || accounts.length === 0) return false;

  const denorm: Record<string, unknown> = {};
  let latestSync: string | null = null;

  for (const acct of accounts) {
    const isIg = acct.platform === "instagram";
    if (acct.follower_count != null) {
      denorm[isIg ? "instagram_followers" : "tiktok_followers"] = acct.follower_count;
    }
    if (acct.avatar_url) {
      denorm[isIg ? "instagram_avatar" : "tiktok_avatar"] = acct.avatar_url;
    }
    const synced = acct.last_synced_at as string | null;
    if (synced && (!latestSync || synced > latestSync)) latestSync = synced;
  }

  // One card shows one engagement figure, so pick the creator's biggest platform
  // that actually has a rate — that's the audience a brand is really buying.
  const withRate = accounts.filter((a) => a.engagement_rate != null);
  if (withRate.length > 0) {
    const primary = withRate.reduce((best, a) =>
      Number(a.follower_count ?? 0) > Number(best.follower_count ?? 0) ? a : best,
    );
    denorm.engagement_rate = primary.engagement_rate;
  }

  if (latestSync) denorm.followers_synced_at = latestSync;
  if (Object.keys(denorm).length === 0) return false;

  const { data: updated, error } = await admin
    .from("creator_profiles")
    .update(denorm)
    .eq("user_id", creatorId)
    .select("user_id");

  if (error) {
    console.error("[social] mirror to creator_profiles failed:", error.message);
    return false;
  }
  // No rows matched → the creator hasn't saved a profile yet. Not an error: the
  // stats are safely stored and the next profile save will pick them up.
  return (updated?.length ?? 0) > 0;
}

/**
 * Refresh every platform we have a handle for on a single creator. Reads the
 * handles off creator_profiles and enriches each. Returns how many succeeded.
 */
export async function refreshCreatorSocialData(creatorId: string): Promise<number> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("creator_profiles")
    .select("instagram, tiktok")
    .eq("user_id", creatorId)
    .maybeSingle();
  if (!profile) return 0;

  // Scheduled/bulk refresh always fetches fresh (bypasses the manual cooldown).
  const jobs: Array<Promise<EnrichResult>> = [];
  if (profile.instagram)
    jobs.push(enrichCreatorSocial(creatorId, "instagram", profile.instagram, { force: true }));
  if (profile.tiktok)
    jobs.push(enrichCreatorSocial(creatorId, "tiktok", profile.tiktok, { force: true }));

  const results = await Promise.all(jobs);
  return results.filter((r) => r.ok).length;
}

// ---------------------------------------------------------------------------
// Scheduled refresh cohorts.
//
// These are the reusable building blocks for a future cron. They are NOT
// scheduled anywhere yet — wire them to Vercel Cron via /api/cron/refresh-social
// (see that route + the README "Social enrichment" note). Cadence intent:
//   • On signup / handle change → refreshCreatorSocialData() immediately (done
//     from the enrichment route when the creator clicks the button).
//   • Active creators   → weekly
//   • Featured creators → daily
//   • Inactive creators → monthly
//   • Manual refresh    → admin only
//
// To avoid hammering the provider, cohorts refresh sequentially with a small
// gap. Keep batches modest until a queue is introduced.
// ---------------------------------------------------------------------------

async function refreshCohort(creatorIds: string[]): Promise<number> {
  let ok = 0;
  for (const id of creatorIds) {
    ok += await refreshCreatorSocialData(id);
  }
  return ok;
}

/** Active creators (available for bookings) — intended cadence: weekly. */
export async function refreshActiveCreatorsSocialData(): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("creator_profiles")
    .select("user_id")
    .eq("availability", true)
    .or("instagram.not.is.null,tiktok.not.is.null");
  return refreshCohort((data ?? []).map((r) => r.user_id));
}

/**
 * Featured creators — intended cadence: daily.
 * There is no "featured" flag in the schema yet, so this is a documented stub:
 * add a `featured boolean` column to creator_profiles and filter on it here.
 */
export async function refreshFeaturedCreatorsSocialData(): Promise<number> {
  console.warn(
    "[social] refreshFeaturedCreatorsSocialData: no 'featured' flag exists yet - add creator_profiles.featured and filter here.",
  );
  return 0;
}

/**
 * Creators who have a handle but have NEVER been synced — cadence: daily.
 *
 * The safety net. A creator who fills in their handles but never triggers an
 * import (e.g. they typed follower counts in by hand, or signed up before the
 * profile-save auto-fetch existed) would otherwise sit with no real stats
 * indefinitely: the weekly `active` cohort would eventually catch them, but a
 * blank/typed-in engagement rate is exactly what a browsing brand sees first.
 *
 * Cheap by construction — a creator only ever qualifies once, because a
 * successful sync sets followers_synced_at.
 */
export async function refreshUnsyncedCreatorsSocialData(): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("creator_profiles")
    .select("user_id")
    .is("followers_synced_at", null)
    .or("instagram.not.is.null,tiktok.not.is.null");
  return refreshCohort((data ?? []).map((r) => r.user_id));
}

/**
 * Repair pass: copy any still-external social avatar into our own storage.
 *
 * Creators synced before avatar mirroring existed are holding provider CDN
 * links that expire within days. This walks them and mirrors each one — no
 * paid provider calls, just a download and an upload.
 *
 * Idempotent and self-retiring: an already-mirrored URL is skipped, so once
 * everyone is converted this costs one small query and nothing else. Runs daily
 * so a creator whose mirror failed (provider hiccup, link already dead) gets
 * another attempt on the next sync rather than sitting broken for a week.
 */
export async function mirrorPendingSocialAvatars(): Promise<number> {
  const admin = createAdminClient();
  const { data: accounts } = await admin
    .from("creator_social_accounts")
    .select("creator_id, platform, avatar_url")
    .not("avatar_url", "is", null);

  let mirrored = 0;
  for (const acct of accounts ?? []) {
    const url = acct.avatar_url as string;
    if (isMirroredAvatar(url)) continue;

    const stored = await mirrorSocialAvatar(
      acct.creator_id as string,
      acct.platform as SocialPlatform,
      url,
    );
    if (!stored) continue;

    const { error } = await admin
      .from("creator_social_accounts")
      .update({ avatar_url: stored })
      .eq("creator_id", acct.creator_id)
      .eq("platform", acct.platform);
    if (error) {
      console.error("[social] avatar backfill update failed:", error.message);
      continue;
    }

    // Push it onto the card fields too, or the marketplace keeps showing the
    // old external link until the creator's next full sync.
    await syncProfileFromSocialAccounts(acct.creator_id as string);
    mirrored++;
  }
  return mirrored;
}

/** Inactive creators (not available) — intended cadence: monthly. */
export async function refreshInactiveCreatorsSocialData(): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("creator_profiles")
    .select("user_id")
    .eq("availability", false)
    .or("instagram.not.is.null,tiktok.not.is.null");
  return refreshCohort((data ?? []).map((r) => r.user_id));
}
