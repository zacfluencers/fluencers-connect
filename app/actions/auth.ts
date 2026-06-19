"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export type AuthState = { error: string } | null;

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "brand") as UserRole;

  if (!email || !password) return { error: "Email and password are required." };
  if (role !== "brand" && role !== "creator") return { error: "Pick a role." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role } },
  });
  if (error) return { error: error.message };

  // If email confirmation is on, there's no session yet.
  if (!data.session) {
    redirect("/login?check_email=1");
  }

  revalidatePath("/", "layout");
  // First run: brands fill in their profile (then land on the marketplace);
  // creators land on their dashboard to set up their bookable profile.
  redirect(role === "creator" ? "/dashboard/creator" : "/welcome");
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  // Send creators to their dashboard, brands to the marketplace.
  const { data } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user?.id ?? "")
    .maybeSingle();

  revalidatePath("/", "layout");
  redirect(profile?.role === "creator" ? "/dashboard/creator" : "/marketplace");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/** Step 1: email the user a password-reset link. */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email address." };

  const h = await headers();
  const origin =
    h.get("origin") ?? (h.get("host") ? `https://${h.get("host")}` : "");

  const supabase = await createClient();
  // The link lands on /auth/callback, which exchanges it for a session and
  // forwards to /reset-password where they choose a new password.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  // Don't reveal whether an account exists — always show the same confirmation.
  if (error && !/rate|limit/i.test(error.message)) {
    return { error: error.message };
  }

  redirect("/forgot-password?sent=1");
}

/** Step 2: set a new password (the user arrives here with a recovery session). */
export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords don't match." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your reset link has expired — request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  // They're signed in via the recovery session — route them like a sign-in.
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  redirect(profile?.role === "creator" ? "/dashboard/creator" : "/marketplace");
}
