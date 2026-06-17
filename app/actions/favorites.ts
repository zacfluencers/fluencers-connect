"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";

/**
 * Add or remove a creator from the current user's favourites.
 * Returns the new state so the button can update instantly.
 */
export async function toggleFavorite(
  creatorId: string,
): Promise<{ favorited: boolean } | { error: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Please sign in to save favourites." };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("favorites")
    .select("creator_id")
    .eq("user_id", me.id)
    .eq("creator_id", creatorId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", me.id)
      .eq("creator_id", creatorId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: me.id, creator_id: creatorId });
    if (error) return { error: error.message };
  }

  revalidatePath("/favorites");
  revalidatePath("/marketplace");
  return { favorited: !existing };
}
