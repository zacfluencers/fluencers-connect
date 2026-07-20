"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { brandCanTransact } from "@/lib/subscription";
import { notify } from "@/lib/notifications";

/**
 * Look up the existing direct (non-booking) thread between a brand and a
 * creator, if there is one.
 */
async function findDirectConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  brandId: string,
  creatorId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("conversations")
    .select("id")
    .eq("brand_id", brandId)
    .eq("creator_id", creatorId)
    .is("booking_id", null)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Creator taps "Message brand": jump into the existing thread if there is one,
 * otherwise land on the compose screen. Nothing is created here — a
 * conversation only comes into existence when the first message is actually
 * sent, so changing your mind leaves no empty thread in the brand's inbox.
 */
export async function startDirectConversation(brandId: string) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "creator") {
    return { error: "Only creators can start a conversation here." };
  }

  const supabase = await createClient();
  const existing = await findDirectConversation(supabase, brandId, me.id);
  redirect(existing ? `/messages/${existing}` : `/messages/new?to=${brandId}`);
}

/**
 * Brand taps "Chat" on a creator: same deal — existing thread or the compose
 * screen, never an empty conversation.
 */
export async function startCreatorConversation(creatorId: string) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "brand") {
    return { error: "Only brands can message creators here." };
  }
  // Gate: only subscribed brands can message creators.
  if (!(await brandCanTransact(me.id))) {
    return { error: "Subscribe to message creators - see Membership on your dashboard." };
  }

  const supabase = await createClient();
  const existing = await findDirectConversation(supabase, me.id, creatorId);
  redirect(existing ? `/messages/${existing}` : `/messages/new?to=${creatorId}`);
}

/**
 * First message to someone you've never talked to: create the conversation and
 * the message together. This is the ONLY place a direct conversation gets
 * created, which is what guarantees no thread ever exists without at least one
 * message in it.
 */
export async function sendFirstMessage(
  counterpartId: string,
  body: string,
): Promise<{ error: string } | void> {
  const me = await getCurrentUser();
  if (!me) return { error: "Please sign in." };

  const text = body.trim();
  if (!text) return { error: "Message can't be empty." };
  if (text.length > 4000) return { error: "Message is too long." };
  // Gate: a free brand can't send messages (creators are never gated).
  if (me.role === "brand" && !(await brandCanTransact(me.id))) {
    return { error: "Subscribe to message creators - see Membership on your dashboard." };
  }

  const brandId = me.role === "brand" ? me.id : counterpartId;
  const creatorId = me.role === "brand" ? counterpartId : me.id;

  const supabase = await createClient();

  // Reuse an existing thread if one appeared since the compose screen loaded
  // (same person in two tabs, or the counterpart wrote first).
  let conversationId = await findDirectConversation(supabase, brandId, creatorId);

  if (!conversationId) {
    const inserted = await supabase
      .from("conversations")
      .insert({ brand_id: brandId, creator_id: creatorId })
      .select("id")
      .maybeSingle();
    conversationId = inserted.data?.id ?? null;

    if (!conversationId) {
      // Race or error — try to read it back.
      conversationId = await findDirectConversation(supabase, brandId, creatorId);
    }
  }

  if (!conversationId) return { error: "Could not start the conversation." };

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: me.id,
    body: text,
  });
  if (error) return { error: error.message };

  await notifyNewMessage(supabase, me, counterpartId, conversationId, text);

  redirect(`/messages/${conversationId}`);
}

/** Tell the other party a message arrived (in-app bell + maybe email). */
async function notifyNewMessage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  me: { id: string; role: string },
  recipientId: string,
  conversationId: string,
  text: string,
) {
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
    return { error: "Subscribe to message creators - see Membership on your dashboard." };
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
    await notifyNewMessage(supabase, me, recipientId, conversationId, text);
  }

  revalidatePath(`/messages/${conversationId}`);
  return { ok: true };
}
