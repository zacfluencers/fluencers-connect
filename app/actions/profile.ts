"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import {
  refreshCreatorSocialData,
  syncProfileFromSocialAccounts,
} from "@/lib/social/enrichment";
import { isScrapeCreatorsConfigured, cleanHandle } from "@/lib/social/scrapecreators";
import { isAdminConfigured } from "@/lib/supabase/admin";

export type ProfileState = { error: string } | { ok: true } | null;

/**
 * Create or update the signed-in creator's marketplace profile. A creator must
 * have a profile to appear in the marketplace and receive bookings.
 */
export async function upsertCreatorProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const me = await getCurrentUser();
  if (!me) return { error: "Please sign in." };
  if (me.role !== "creator") {
    return { error: "Only creator accounts have a profile." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  // Required: brands filter the marketplace by niche, so a creator without one
  // is effectively unlisted (and leaves a gap on their card).
  const niche = String(formData.get("niche") ?? "").trim();
  if (!niche) return { error: "Pick a niche so brands can find you." };

  // Optional whole-number count. Blank → null.
  const toCount = (key: string): number | null => {
    const raw = String(formData.get(key) ?? "").trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  };

  // Optional money rate (2dp). Blank → null.
  const toRate = (key: string): number | null => {
    const raw = String(formData.get(key) ?? "").trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const ugc_rate = toRate("ugc_rate");
  const event_rate = toRate("event_rate");
  const broll_rate = toRate("broll_rate");

  const rates = [ugc_rate, event_rate, broll_rate].filter(
    (r): r is number => r != null,
  );
  if (rates.length === 0) {
    return { error: "Set at least one rate (UGC, Event Day, or B-Roll)." };
  }

  const age = toCount("age");
  if (age != null && (age < 13 || age > 120)) {
    return { error: "Enter a valid age." };
  }

  const instagram = String(formData.get("instagram") ?? "").trim() || null;
  const tiktok = String(formData.get("tiktok") ?? "").trim() || null;

  const supabase = await createClient();

  // What did we have before this save? Used to decide whether the social stats
  // need (re-)fetching, so a routine profile edit doesn't cost a provider call.
  const { data: before } = await supabase
    .from("creator_profiles")
    .select("instagram, tiktok, followers_synced_at")
    .eq("user_id", me.id)
    .maybeSingle();

  const { error } = await supabase.from("creator_profiles").upsert({
    user_id: me.id,
    name,
    bio: String(formData.get("bio") ?? "").trim() || null,
    niche,
    instagram,
    tiktok,
    profile_image: String(formData.get("profile_image") ?? "").trim() || null,
    availability: formData.get("availability") === "on",
    // Follower counts are entered manually (or filled via the "Auto-fill" button
    // on the form before saving).
    instagram_followers: toCount("instagram_followers"),
    tiktok_followers: toCount("tiktok_followers"),
    ugc_rate,
    event_rate,
    broll_rate,
    gender: String(formData.get("gender") ?? "").trim() || null,
    age,
    country: String(formData.get("country") ?? "").trim() || null,
    // Keep the legacy single price in sync with the lowest set rate so
    // backward-compatible flows still work.
    price: Math.min(...rates),
  });

  if (error) return { error: error.message };

  if (isAdminConfigured()) {
    // 1. Free + instant: fold in any stats already imported. This is what rescues
    //    a creator who pressed "Auto-fill" BEFORE their first save — at that
    //    point they had no profile row for the import to write to.
    try {
      await syncProfileFromSocialAccounts(me.id);
    } catch (e) {
      console.error("[profile] social mirror failed:", e);
    }

    // 2. Paid + slow: actually fetch from the provider, but only when there's
    //    something new to fetch — a handle was added/changed, or we've never
    //    synced this creator. Runs after the response so saving stays instant.
    const changed = (a: string | null, b: string | null) =>
      cleanHandle(a ?? "").toLowerCase() !== cleanHandle(b ?? "").toLowerCase();
    const needsFetch =
      (instagram || tiktok) &&
      (!before?.followers_synced_at ||
        changed(before.instagram, instagram) ||
        changed(before.tiktok, tiktok));

    if (needsFetch && isScrapeCreatorsConfigured()) {
      after(async () => {
        try {
          await refreshCreatorSocialData(me.id);
          revalidatePath("/dashboard/creator");
          revalidatePath("/marketplace");
          revalidatePath(`/creator/${me.id}`);
        } catch (e) {
          console.error("[profile] social enrichment failed:", e);
        }
      });
    }
  }

  revalidatePath("/dashboard/creator");
  revalidatePath("/marketplace");
  revalidatePath(`/creator/${me.id}`);
  return { ok: true };
}
