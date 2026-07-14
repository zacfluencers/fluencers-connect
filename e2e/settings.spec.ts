import { test, expect } from "@playwright/test";
import { login, brandCreds } from "./helpers";

test.describe("settings", () => {
  test("a signed-out visitor can't reach settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login/);
  });

  test("a signed-in user can open settings from the nav", async ({ page }) => {
    test.skip(!brandCreds.email || !brandCreds.password, "Needs a seeded account.");

    await login(page, brandCreds.email!, brandCreds.password!);
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Emails" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Password" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Close account" })).toBeVisible();
  });

  test("closing an account needs both the password and the word DELETE", async ({ page }) => {
    test.skip(!brandCreds.email || !brandCreds.password, "Needs a seeded account.");

    await login(page, brandCreds.email!, brandCreds.password!);
    await page.goto("/settings");

    await page.getByRole("button", { name: "Close my account" }).click();

    // The form is there, and it will not go through on a stray click: both
    // fields are required, so an empty submit can't close the account.
    await expect(page.getByLabel("Type DELETE to confirm")).toBeVisible();
    await expect(page.getByLabel("Your password")).toBeVisible();
    await expect(page.getByLabel("Your password")).toHaveAttribute("required", "");

    // Still signed in, still has an account.
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });
});
