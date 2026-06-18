"use server";

import { getCurrentUser } from "@/lib/session";
import {
  fetchInstagramFollowers,
  fetchTiktokFollowers,
} from "@/lib/social/scrape";

export interface FetchedFollowers {
  instagram: number | null;
  tiktok: number | null;
}

/**
 * Best-effort fetch of follower counts from the given handles (unofficial — see
 * lib/social/scrape.ts). Returns null per platform when it can't be read, so the
 * UI can fall back to manual entry.
 */
export async function fetchFollowers(input: {
  instagram?: string;
  tiktok?: string;
}): Promise<FetchedFollowers> {
  const me = await getCurrentUser();
  if (!me) return { instagram: null, tiktok: null };

  const [instagram, tiktok] = await Promise.all([
    input.instagram?.trim()
      ? fetchInstagramFollowers(input.instagram)
      : Promise.resolve(null),
    input.tiktok?.trim()
      ? fetchTiktokFollowers(input.tiktok)
      : Promise.resolve(null),
  ]);

  return { instagram, tiktok };
}
