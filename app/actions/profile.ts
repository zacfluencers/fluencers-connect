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
  const priceRaw = String(formData.get("price") ?? "").trim();
  const price = Number(priceRaw);

  if (!name) return { error: "Name is required." };
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Enter a valid price." };
  }

  // Optional follower counts (manual for now). Blank → null.
  const toCount = (key: string): number | null => {
    const raw = String(formData.get(key) ?? "").trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  };

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
    instagram_followers: toCount("instagram_followers"),
    tiktok_followers: toCount("tiktok_followers"),
    price,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/creator");
  revalidatePath("/marketplace");
  return { ok: true };
}
