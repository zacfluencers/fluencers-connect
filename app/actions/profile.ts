"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";

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

  const supabase = await createClient();
  const { error } = await supabase.from("creator_profiles").upsert({
    user_id: me.id,
    name,
    bio: String(formData.get("bio") ?? "").trim() || null,
    niche: String(formData.get("niche") ?? "").trim() || null,
    instagram: String(formData.get("instagram") ?? "").trim() || null,
    tiktok: String(formData.get("tiktok") ?? "").trim() || null,
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

  revalidatePath("/dashboard/creator");
  revalidatePath("/marketplace");
  return { ok: true };
}
