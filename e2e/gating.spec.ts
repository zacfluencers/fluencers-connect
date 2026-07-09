import { test, expect } from "@playwright/test";
import { brandCreds, unsubscribedBrand, login } from "./helpers";

/**
 * Subscription gating — the money-protecting behaviour.
 *
 * An unsubscribed brand is browse-only: no booking, messaging, favouriting, and
 * it cannot list itself in the creator directory. A subscribed brand gets all
 * of that back. Both halves are proven here so the suite catches a regression in
 * EITHER direction (a leak that lets free brands act, or a gate that wrongly
 * locks paying brands out).
 *
 * Gated on seeded credentials so the suite stays green without them:
 *   TEST_UNSUB_BRAND_EMAIL / TEST_UNSUB_BRAND_PASSWORD  (browse-only brand)
 *   TEST_BRAND_EMAIL       / TEST_BRAND_PASSWORD        (subscribed brand)
 */
test.describe("unsubscribed brand is browse-only", () => {
  test.skip(
    !unsubscribedBrand.email || !unsubscribedBrand.password,
    "Set TEST_UNSUB_BRAND_EMAIL / TEST_UNSUB_BRAND_PASSWORD to run the gating flow.",
  );

  test.beforeEach(async ({ page }) => {
    await login(page, unsubscribedBrand.email!, unsubscribedBrand.password!);
  });

  test("marketplace cards show a Subscribe prompt, not book/message", async ({ page }) => {
    await page.goto("/marketplace");

    // Each creator card collapses to a single full-width Subscribe CTA.
    const subscribeCta = page.getByRole("link", { name: /subscribe to see more/i });
    await expect(subscribeCta.first()).toBeVisible({ timeout: 15_000 });

    // The paid actions are gone entirely — not merely disabled.
    await expect(page.getByRole("button", { name: /auto book|book/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /message|chat/i })).toHaveCount(0);
  });

  test("creator profile hides booking + messaging behind a Subscribe prompt", async ({ page }) => {
    await page.goto("/marketplace");
    const firstCreator = page.locator('a[href^="/creator/"]').first();
    await expect(firstCreator).toBeVisible({ timeout: 15_000 });
    await firstCreator.click();
    await expect(page).toHaveURL(/\/creator\//);

    await expect(page.getByRole("link", { name: /subscribe to see more/i }).first())
      .toBeVisible();
    await expect(page.getByRole("button", { name: /message|chat/i })).toHaveCount(0);
  });

  test("nav drops the locked links and shows Subscribe", async ({ page }) => {
    await page.goto("/marketplace");

    // Subscribe CTA present in the nav.
    await expect(page.getByRole("link", { name: /^subscribe$/i }).first())
      .toBeVisible();

    // Favourites / Messages / Bookings are removed from navigation entirely.
    await expect(page.getByRole("link", { name: /^favourites$/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^messages$/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^bookings$/i })).toHaveCount(0);
  });

  test('the "Looking for creators" toggle is disabled', async ({ page }) => {
    await page.goto("/dashboard/brand");

    const toggle = page.getByRole("checkbox", { name: /looking for creators/i });
    await expect(toggle).toBeVisible({ timeout: 15_000 });
    await expect(toggle).toBeDisabled();

    // Quick links only offer the one thing a locked brand can do.
    await expect(page.getByRole("link", { name: /browse creators/i }).first())
      .toBeVisible();
    await expect(page.getByRole("link", { name: /saved creators/i })).toHaveCount(0);
  });
});

test.describe("subscribed brand keeps full access", () => {
  test.skip(
    !brandCreds.email || !brandCreds.password,
    "Set TEST_BRAND_EMAIL / TEST_BRAND_PASSWORD to run the subscribed-brand check.",
  );

  test("marketplace shows booking, and no Subscribe prompt", async ({ page }) => {
    await login(page, brandCreds.email!, brandCreds.password!);
    await page.goto("/marketplace");

    // A real booking button is available…
    await expect(page.getByRole("button", { name: /auto book|book/i }).first())
      .toBeVisible({ timeout: 15_000 });
    // …and the locked-state CTA is nowhere on the page.
    await expect(page.getByRole("link", { name: /subscribe to see more/i })).toHaveCount(0);
  });

  test("nav exposes the paid links", async ({ page }) => {
    await login(page, brandCreds.email!, brandCreds.password!);
    await page.goto("/marketplace");

    await expect(page.getByRole("link", { name: /^favourites$/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^messages$/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^bookings$/i }).first()).toBeVisible();
  });
});
