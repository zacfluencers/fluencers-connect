"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";

export type BrandProfileState = { error: string } | { ok: true } | null;

/** Create or update the signed-in brand's profile + "looking for creators" toggle. */
export async function upsertBrandProfile(
  _prev: BrandProfileState,
  formData: FormData,
): Promise<BrandProfileState> {
  const me = await getCurrentUser();
  if (!me) return { error: "Please sign in." };
  if (me.role !== "brand") return { error: "Only brand accounts have a profile." };

  const companyName = String(formData.get("company_name") ?? "").trim();
  if (!companyName) return { error: "Company name is required." };

  const toCount = (key: string): number | null => {
    const raw = String(formData.get(key) ?? "").trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  };

  const supabase = await createClient();
  const { error } = await supabase.from("brand_profiles").upsert({
    user_id: me.id,
    company_name: companyName,
    about: String(formData.get("about") ?? "").trim() || null,
    budget_min: toCount("budget_min"),
    budget_max: toCount("budget_max"),
    looking_for_creators: formData.get("looking_for_creators") === "on",
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/brand");
  revalidatePath("/brands");
  return { ok: true };
}
