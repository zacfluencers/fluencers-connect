import { test, expect } from "@playwright/test";
import { uniqueEmail } from "./helpers";

/**
 * Sign-up and sign-in journeys. Sign-up doesn't require confirming the email —
 * we assert the app reaches the expected next step. A bad sign-in must surface
 * a friendly error, not crash.
 */
test.describe("authentication", () => {
  test("sign up creates an account and moves to the next step", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(uniqueEmail("signup"));
    await page.getByLabel("Password").fill("Test-password-123");
    // Default role is brand; make it explicit.
    await page.getByText("Brand", { exact: false }).first().click();
    await page.getByRole("button", { name: /create account/i }).click();

    // Depending on the project's email-confirmation setting, the app either
    // asks the user to confirm their email (→ /login?check_email=1) or signs
    // them straight in (→ /welcome for a brand). Accept either.
    await expect(page).toHaveURL(/\/(login|welcome)/, { timeout: 15_000 });
    const confirmBanner = page.getByText(/check your email/i);
    const welcomeHeading = page.getByRole("heading", { level: 1 });
    await expect(confirmBanner.or(welcomeHeading).first()).toBeVisible();
  });

  test("wrong password shows an error, not a crash", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody-" + Date.now() + "@example.com");
    await page.getByLabel("Password").fill("definitely-wrong");
    await page.getByRole("button", { name: /sign in/i }).click();

    // An inline error appears and we stay on the login page.
    await expect(page.getByText(/invalid|incorrect|credentials|email|password/i).first())
      .toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
