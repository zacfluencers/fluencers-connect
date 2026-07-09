import { test, expect } from "@playwright/test";
import { brandCreds, login } from "./helpers";

/**
 * The core money journey: a signed-in brand books a creator. With Stripe off
 * (demo mode) the booking is created directly and opens the deal room; with
 * Stripe on it would redirect to Checkout. Either way we should leave the
 * creator page toward a booking/checkout.
 *
 * Gated on seeded brand credentials so the suite stays green without them:
 *   TEST_BRAND_EMAIL=... TEST_BRAND_PASSWORD=... npm run test:e2e
 */
test.describe("booking", () => {
  test.skip(
    !brandCreds.email || !brandCreds.password,
    "Set TEST_BRAND_EMAIL / TEST_BRAND_PASSWORD to run the booking flow.",
  );

  test("a brand can book a creator", async ({ page }) => {
    await login(page, brandCreds.email!, brandCreds.password!);

    // Open the first creator from the marketplace.
    await page.goto("/marketplace");
    const firstCreator = page.locator('a[href^="/creator/"]').first();
    await expect(firstCreator).toBeVisible({ timeout: 15_000 });
    await firstCreator.click();
    await expect(page).toHaveURL(/\/creator\//);

    // Trigger a booking. On the profile the per-service button reads
    // "Request & pay"; the marketplace card uses "Auto book" / "Book".
    const bookButton = page
      .getByRole("button", { name: /request.*pay|auto book|book/i })
      .first();
    await expect(bookButton).toBeVisible();
    await bookButton.click();

    // Demo mode → deal room (/bookings/[id]); Stripe on → checkout.stripe.com.
    await expect(page).toHaveURL(/\/bookings\/|checkout\.stripe\.com/, {
      timeout: 20_000,
    });
  });
});
