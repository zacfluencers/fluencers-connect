"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { brandCanTransact } from "@/lib/subscription";
import { notify } from "@/lib/notifications";

/**
 * Creator opens (or reuses) a direct conversation with a brand, then lands in it.
 */
export async function startDirectConversation(brandId: string) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "creator") {
    return { error: "Only creators can start a conversation here." };
  }

  const supabase = await createClient();

  const existing = await supabase
    .from("conversations")
    .select("id")
    .eq("brand_id", brandId)
    .eq("creator_id", me.id)
    .is("booking_id", null)
    .maybeSingle();

  let conversationId = existing.data?.id ?? null;

  if (!conversationId) {
    const inserted = await supabase
      .from("conversations")
      .insert({ brand_id: brandId, creator_id: me.id })
      .select("id")
      .maybeSingle();
    conversationId = inserted.data?.id ?? null;

    if (!conversationId) {
      // Race or error — try to read it back.
      const retry = await supabase
        .from("conversations")
        .select("id")
        .eq("brand_id", brandId)
        .eq("creator_id", me.id)
        .is("booking_id", null)
        .maybeSingle();
      conversationId = retry.data?.id ?? null;
    }
  }

  if (!conversationId) return { error: "Could not start the conversation." };
  redirect(`/messages/${conversationId}`);
}

/**
 * Brand opens (or reuses) a direct conversation with a creator, then lands in it.
 */
export async function startCreatorConversation(creatorId: string) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "brand") {
    return { error: "Only brands can message creators here." };
  }
  // Gate: only subscribed brands can message creators.
  if (!(await brandCanTransact(me.id))) {
    return { error: "Subscribe to message creators — see Membership on your dashboard." };
  }

  const supabase = await createClient();

  const existing = await supabase
    .from("conversations")
    .select("id")
    .eq("brand_id", me.id)
    .eq("creator_id", creatorId)
    .is("booking_id", null)
    .maybeSingle();

  let conversationId = existing.data?.id ?? null;

  if (!conversationId) {
    const inserted = await supabase
      .from("conversations")
      .insert({ brand_id: me.id, creator_id: creatorId })
      .select("id")
      .maybeSingle();
    conversationId = inserted.data?.id ?? null;

    if (!conversationId) {
      // Race or error — try to read it back.
      const retry = await supabase
        .from("conversations")
        .select("id")
        .eq("brand_id", me.id)
        .eq("creator_id", creatorId)
        .is("booking_id", null)
        .maybeSingle();
      conversationId = retry.data?.id ?? null;
    }
  }

  if (!conversationId) return { error: "Could not start the conversation." };
  redirect(`/messages/${conversationId}`);
}

/** Post a message into a conversation. RLS enforces sender + membership. */
export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<{ ok: true } | { error: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Please sign in." };

  const text = body.trim();
  if (!text) return { error: "Message can't be empty." };
  if (text.length > 4000) return { error: "Message is too long." };
  // Gate: a free brand can't send messages (creators are never gated).
  if (me.role === "brand" && !(await brandCanTransact(me.id))) {
    return { error: "Subscribe to message creators — see Membership on your dashboard." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: me.id,
    body: text,
  });
  if (error) return { error: error.message };

  // Notify the other party in the conversation.
  const { data: convo } = await supabase
    .from("conversations")
    .select("brand_id, creator_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (convo) {
    const recipientId =
      convo.brand_id === me.id ? convo.creator_id : convo.brand_id;
    const senderName =
      me.role === "brand"
        ? (await supabase.from("brand_profiles").select("company_name").eq("user_id", me.id).maybeSingle()).data?.company_name ?? "A brand"
        : (await supabase.from("creator_profiles").select("name").eq("user_id", me.id).maybeSingle()).data?.name ?? "A creator";
    await notify(supabase, {
      userId: recipientId,
      type: "message",
      title: `New message from ${senderName}`,
      body: text.slice(0, 140),
      link: `/messages/${conversationId}`,
    });
  }

  revalidatePath(`/messages/${conversationId}`);
  return { ok: true };
}
