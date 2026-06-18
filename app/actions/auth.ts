"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
