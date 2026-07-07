import { test, expect } from "@playwright/test";

/**
 * Public pages load and render their key content. These need no account and
 * run green anywhere the app is up — a fast canary that the build isn't broken
 * or unstyled.
 */
test.describe("public pages", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Influencer Connect/i);
    // A real element renders (not a blank/crashed page).
    await expect(page.getByRole("link", { name: /sign in/i }).first()).toBeVisible();
  });

  test("marketplace lists creators", async ({ page }) => {
    await page.goto("/marketplace");
    await expect(page.getByRole("heading", { name: /browse creators/i })).toBeVisible();
  });

  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /forgot password/i })).toBeVisible();
  });

  test("signup page renders with role choice", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
    await expect(page.getByText(/brand/i).first()).toBeVisible();
    await expect(page.getByText(/creator/i).first()).toBeVisible();
  });

  test("unknown URL shows the branded 404", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await expect(page.getByRole("heading", { name: /page not found/i })).toBeVisible();
  });
});
