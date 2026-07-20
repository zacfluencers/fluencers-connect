/**
 * Mirror imported social profile pictures into our own storage — SERVER ONLY.
 *
 * Instagram and TikTok hand back *signed, expiring* CDN links (an Instagram
 * avatar URL dies after a few days; TikTok's after about one). We only refresh
 * a creator's socials weekly, so hotlinking those URLs guarantees broken photos
 * for most of the week. They're also served from `fbcdn.net`, which most
 * ad-blockers and Safari/Brave privacy modes block outright — so even a
 * still-valid link often renders as a broken image.
 *
 * So: download once at sync time, store it in the public `avatars` bucket, and
 * hand the marketplace a permanent URL we control. As a bonus that URL then
 * flows through Supabase's image transform (see `sizedImage`), which the
 * external ones never could.
 *
 * Uses the service-role client, so callers MUST authorise the request first.
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SocialPlatform } from "@/lib/social/scrapecreators";

/** Give up on a slow provider CDN rather than hold up the whole sync. */
const FETCH_TIMEOUT_MS = 10_000;

/** Profile pictures are small; anything larger is not one. */
const MAX_BYTES = 5 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Already ours? Then it's mirrored and re-downloading would be pointless. */
export function isMirroredAvatar(url: string): boolean {
  return url.includes("/storage/v1/object/public/");
}

/**
 * Download `sourceUrl` and store it as this creator's avatar for `platform`.
 *
 * Returns our permanent public URL, or `null` if anything went wrong — callers
 * should fall back to the original link, since a soon-to-expire photo still
 * beats no photo at all. Never throws.
 *
 * The storage path is stable (one slot per creator per platform) and written
 * with `upsert`, so re-syncing overwrites in place instead of littering the
 * bucket with a new file every week.
 */
export async function mirrorSocialAvatar(
  creatorId: string,
  platform: SocialPlatform,
  sourceUrl: string,
): Promise<string | null> {
  if (!sourceUrl || isMirroredAvatar(sourceUrl)) return null;

  try {
    const res = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[social] avatar download failed (${res.status}) for ${platform}`);
      return null;
    }

    const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    const ext = EXT_BY_TYPE[contentType];
    if (!ext) {
      console.error(`[social] avatar not an image (${contentType || "unknown"}) for ${platform}`);
      return null;
    }

    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
      console.error(`[social] avatar size ${bytes.byteLength} out of range for ${platform}`);
      return null;
    }

    // Under the creator's own folder, so it's swept up with the rest of their
    // uploads if their files are ever cleared by prefix.
    const path = `${creatorId}/social-${platform}.${ext}`;
    const admin = createAdminClient();

    const { error } = await admin.storage.from("avatars").upload(path, bytes, {
      contentType,
      // A day: the path is stable and the file changes when socials re-sync, so
      // this trades a little freshness for not re-fetching on every card view.
      cacheControl: "86400",
      upsert: true,
    });
    if (error) {
      console.error("[social] avatar upload failed:", error.message);
      return null;
    }

    const {
      data: { publicUrl },
    } = admin.storage.from("avatars").getPublicUrl(path);
    return publicUrl;
  } catch (err) {
    console.error("[social] avatar mirror error:", err instanceof Error ? err.message : err);
    return null;
  }
}
