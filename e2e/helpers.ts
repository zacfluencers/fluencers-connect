import { type Page, expect } from "@playwright/test";

/** A fresh, unique email for signup tests (no collisions across runs). */
export function uniqueEmail(prefix = "e2e"): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}+${Date.now()}-${rand}@example.com`;
}

/** Seeded credentials for the signed-in flows (set in the environment). */
export const brandCreds = {
  email: process.env.TEST_BRAND_EMAIL,
  password: process.env.TEST_BRAND_PASSWORD,
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
