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

  // New uploads append to the end of the current order. Older rows may still
  // carry the legacy default of 0 (order was never written before reorder
  // shipped); taking max + 1 keeps a new video after everything already there,
  // and stays correct once a creator has dragged things around.
  const { data: last } = await supabase
    .from("portfolio_items")
    .select("sort_order")
    .eq("creator_id", me.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (last?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("portfolio_items").insert({
    creator_id: me.id,
    image_url: input.imageUrl,
    storage_path: input.storagePath,
    sort_order: nextOrder,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/creator");
  revalidatePath(`/creator/${me.id}`);
  return { ok: true };
}

/**
 * Save a new display order for the creator's portfolio. `orderedIds` is the
 * full list of item ids in the order they should appear (first = position 1).
 * Each item's `sort_order` is set to its index, so every read of the portfolio
 * - the dashboard editor and the public profile alike - shows the new order.
 */
export async function reorderPortfolioItems(
  orderedIds: string[],
): Promise<{ ok: true } | { error: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Please sign in." };
  if (me.role !== "creator") return { error: "Only creators have a portfolio." };

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { error: "Nothing to reorder." };
  }
  // De-dupe (preserving order) and cap the payload as a safety net.
  const ids = [...new Set(orderedIds)].slice(0, 500);

  const supabase = await createClient();

  // One small update per item, each scoped to the caller's own rows (RLS
  // double-checks ownership). Portfolios are tiny, so a few parallel writes
  // are quicker than a round-trip-per-item loop and plenty fast.
  const results = await Promise.all(
    ids.map((id, index) =>
      supabase
        .from("portfolio_items")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("creator_id", me.id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

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
