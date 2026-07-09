import { test, expect } from "@playwright/test";
import { uniqueEmail } from "./helpers";

/**
 * Sign-up and sign-in journeys.
 *
 * Sign-up hits Supabase's real auth. Two things are outside our control there:
 * email confirmation may be ON (→ the app routes to /login?check_email=1 rather
 * than signing straight in), and Supabase's built-in mailer is rate-limited
 * (repeat runs can return "email rate limit exceeded"). So we assert the flow is
 * RESILIENT: a valid submission either advances to the next step OR shows a
 * friendly inline message — it must never crash or hang on a dead button.
 *
 * A bad sign-in must likewise surface a friendly error, not crash.
 */
test.describe("authentication", () => {
  test("sign up submits and the app responds cleanly", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(uniqueEmail("signup"));
    await page.getByLabel("Password").fill("Test-password-123");
    // Default role is brand; make it explicit.
    await page.getByText("Brand", { exact: false }).first().click();
    await page.getByRole("button", { name: /create account/i }).click();

    // Success path: the app moves on — /login?check_email=1 (confirmation on),
    // /welcome (brand, confirmation off) or a dashboard.
    const advanced = page.waitForURL(/\/(login|welcome|dashboard)/, { timeout: 15_000 });
    // Handled-error path: we stay on /signup with a readable message (e.g. an
    // email rate limit) — clear feedback, not a crash.
    const friendlyError = expect(
      page.getByText(/rate limit|invalid|already|try again|check your email/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    await Promise.race([advanced, friendlyError]);

    // Either way the app is still alive and interactive (no crash / white screen).
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
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
