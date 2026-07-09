import { type Page, expect } from "@playwright/test";

/**
 * A fresh, unique email for signup tests (no collisions across runs).
 *
 * NOTE: Supabase rejects reserved domains like `example.com` as "invalid", so
 * we use a normal-looking domain. Override with TEST_SIGNUP_DOMAIN if you have
 * a mailbox/catch-all you'd rather use.
 */
export function uniqueEmail(prefix = "e2e"): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const domain = process.env.TEST_SIGNUP_DOMAIN ?? "e2e-fluencers.dev";
  return `${prefix}-${Date.now()}-${rand}@${domain}`;
}

/**
 * Seeded credentials for the signed-in flows (set in the environment).
 *
 * - brandCreds:        a SUBSCRIBED brand (can book, message, favourite, list).
 * - unsubscribedBrand: a brand with NO active subscription (browse-only) — used
 *                      by the gating suite to prove the paid features are locked.
 */
export const brandCreds = {
  email: process.env.TEST_BRAND_EMAIL,
  password: process.env.TEST_BRAND_PASSWORD,
};

export const unsubscribedBrand = {
  email: process.env.TEST_UNSUB_BRAND_EMAIL,
  password: process.env.TEST_UNSUB_BRAND_PASSWORD,
};

/** Log in through the real login form and wait for the post-login redirect. */
export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Brands land on /marketplace, creators on /dashboard/creator.
  await expect(page).toHaveURL(/\/(marketplace|dashboard)/, { timeout: 15_000 });
}
