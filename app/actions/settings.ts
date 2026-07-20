"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createBrowserlessClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/session";

export type SettingsState = { error: string } | { ok: string } | null;

/**
 * Check a password without touching the signed-in session.
 *
 * Deliberately NOT the request-scoped client: a successful signInWithPassword on
 * that one rewrites the auth cookies as a side effect. This throwaway client
 * persists nothing, so it can answer "is this the right password?" and change
 * nothing at all.
 */
async function passwordIsCorrect(email: string, password: string): Promise<boolean> {
  const probe = createBrowserlessClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await probe.auth.signInWithPassword({ email, password });
  return !error;
}

/** Which emails do you actually want? The in-app bell is unaffected either way. */
export async function updateNotificationPrefs(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const me = await getCurrentUser();
  if (!me) return { error: "Please sign in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({
      email_messages: formData.get("email_messages") === "on",
      email_bookings: formData.get("email_bookings") === "on",
    })
    .eq("id", me.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: "Saved." };
}

/**
 * Change password while signed in.
 *
 * Supabase will happily change the password of whoever holds the session, without
 * asking for the old one. That's not good enough: if someone walks up to an
 * unlocked laptop, they could take the account over silently. So we re-verify the
 * current password first, by actually signing in with it.
 */
export async function changePassword(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const me = await getCurrentUser();
  if (!me) return { error: "Please sign in." };

  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");

  if (!current) return { error: "Enter your current password." };
  if (next.length < 8) {
    return { error: "Your new password needs to be at least 8 characters." };
  }
  if (next === current) {
    return { error: "That's the password you already have." };
  }

  // Prove they know the current password.
  if (!(await passwordIsCorrect(me.email, current))) {
    return { error: "That's not your current password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: error.message };

  return { ok: "Password changed." };
}

/**
 * Change the email you sign in with.
 *
 * Supabase sends a confirmation link to the NEW address and only switches once
 * it's clicked — so a typo can't lock you out, and someone who grabs your
 * session can't quietly move your account to their own inbox.
 */
export async function changeEmail(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const me = await getCurrentUser();
  if (!me) return { error: "Please sign in." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }
  if (email === me.email.toLowerCase()) {
    return { error: "That's the address you already use." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { error: error.message };

  return {
    ok: `Check ${email} - we've sent a link to confirm the change. Your old address keeps working until you click it.`,
  };
}

/**
 * Close an account.
 *
 * NOT a real delete. `bookings` references `users` with ON DELETE RESTRICT, so
 * the database refuses to remove anyone who has ever transacted — on purpose,
 * because those are financial records. Erasing them would destroy the evidence
 * behind real payments.
 *
 * So closing an account means: strip the personal data, take them off the
 * marketplace, and lock the login. The booking rows survive with no personal
 * detail attached to them. That's also what GDPR actually asks for — the right
 * to erasure doesn't override the duty to keep records of a transaction.
 */
export async function deleteAccount(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const me = await getCurrentUser();
  if (!me) return { error: "Please sign in." };

  // Typing the word is the confirmation. A checkbox is too easy to click by
  // accident, and this cannot be undone.
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    return { error: 'Type DELETE to confirm.' };
  }

  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Enter your password to confirm." };

  if (!(await passwordIsCorrect(me.email, password))) {
    return { error: "That password isn't right." };
  }

  if (!isAdminConfigured()) {
    return { error: "Account closure isn't available right now. Please contact support." };
  }
  const admin = createAdminClient();

  // 1. Take them off the marketplace and remove the personal data. Deleting the
  //    profile rows is what makes them vanish from the site; the cascade also
  //    clears their social imports.
  await Promise.all([
    admin.from("creator_profiles").delete().eq("user_id", me.id),
    admin.from("brand_profiles").delete().eq("user_id", me.id),
    admin.from("portfolio_items").delete().eq("creator_id", me.id),
    admin.from("favorites").delete().eq("user_id", me.id),
    admin.from("brand_favorites").delete().eq("user_id", me.id),
    admin.from("creator_social_accounts").delete().eq("creator_id", me.id),
    admin.from("notifications").delete().eq("user_id", me.id),
  ]);

  // 2. Detach the identity from the rows we're legally obliged to keep. The
  //    email is replaced rather than blanked, because it's UNIQUE and NOT NULL —
  //    and freeing up the real address lets them sign up again later if they want.
  const { error: anonErr } = await admin
    .from("users")
    .update({
      email: `deleted-${me.id}@deleted.invalid`,
      deleted_at: new Date().toISOString(),
      email_messages: false,
      email_bookings: false,
    })
    .eq("id", me.id);

  if (anonErr) {
    console.error("[delete account] anonymise failed:", anonErr.message);
    return { error: "Something went wrong closing the account. Nothing was changed." };
  }

  // 3. Lock the login. A ban rather than a delete, because deleting the auth user
  //    cascades into public.users, which the bookings foreign key would refuse.
  const { error: banErr } = await admin.auth.admin.updateUserById(me.id, {
    ban_duration: "876000h", // 100 years
    email: `deleted-${me.id}@deleted.invalid`,
  });
  if (banErr) {
    console.error("[delete account] ban failed:", banErr.message);
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/?closed=1");
}
