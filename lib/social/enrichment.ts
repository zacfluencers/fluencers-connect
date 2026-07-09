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
        avatar_url: normalized.avatarUrl ?? null,
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

  // Mirror display fields onto creator_profiles (best-effort: a no-op if the
  // creator hasn't saved their profile row yet). Non-destructive to
  // profile_image — the imported avatar is stored separately and only used as a
  // fallback when the creator hasn't uploaded their own.
  const denorm: Record<string, unknown> = { followers_synced_at: now };
  if (normalized.followerCount != null) {
    denorm[platform === "instagram" ? "instagram_followers" : "tiktok_followers"] =
      normalized.followerCount;
  }
  if (normalized.avatarUrl) {
    denorm[platform === "instagram" ? "instagram_avatar" : "tiktok_avatar"] =
      normalized.avatarUrl;
  }
  if (normalized.engagementRate != null) {
    denorm.engagement_rate = normalized.engagementRate;
  }
  const { error: profileError } = await admin
    .from("creator_profiles")
    .update(denorm)
    .eq("user_id", creatorId);
  if (profileError) {
    // Don't fail the whole enrichment just because the mirror didn't stick.
    console.error("[social] mirror to creator_profiles failed:", profileError.message);
  }

  return { ok: true, profile: normalized };
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
    "[social] refreshFeaturedCreatorsSocialData: no 'featured' flag exists yet — add creator_profiles.featured and filter here.",
  );
  return 0;
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
