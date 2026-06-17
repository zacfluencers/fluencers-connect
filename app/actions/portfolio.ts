"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";

/**
 * Record a portfolio image after it's been uploaded to storage by the browser.
 * The file itself is uploaded client-side (under the creator's own folder);
 * this just saves the row so it shows on their profile.
 */
export async function addPortfolioItem(input: {
  imageUrl: string;
  storagePath: string;
}): Promise<{ ok: true } | { error: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Please sign in." };
  if (me.role !== "creator") return { error: "Only creators have a portfolio." };

  const supabase = await createClient();
  const { error } = await supabase.from("portfolio_items").insert({
    creator_id: me.id,
    image_url: input.imageUrl,
    storage_path: input.storagePath,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/creator");
  revalidatePath(`/creator/${me.id}`);
  return { ok: true };
}

/** Remove a portfolio image (both the DB row and the stored file). */
export async function deletePortfolioItem(
  itemId: string,
): Promise<{ ok: true } | { error: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Please sign in." };

  const supabase = await createClient();

  const { data: item } = await supabase
    .from("portfolio_items")
    .select("id, creator_id, storage_path")
    .eq("id", itemId)
    .maybeSingle();

  if (!item || item.creator_id !== me.id) {
    return { error: "Item not found." };
  }

  // Remove the row (RLS double-checks ownership)…
  const { error } = await supabase
    .from("portfolio_items")
    .delete()
    .eq("id", itemId);
  if (error) return { error: error.message };

  // …then the underlying file.
  if (item.storage_path) {
    await supabase.storage.from("portfolio").remove([item.storage_path]);
  }

  revalidatePath("/dashboard/creator");
  revalidatePath(`/creator/${me.id}`);
  return { ok: true };
}
