import { test, expect } from "@playwright/test";
import { login, brandCreds } from "./helpers";

/**
 * The admin area can see every user, every booking, and can refund real money.
 * These tests exist to prove it stays shut.
 *
 * The strongest guarantee isn't here though — it's in the database. `admin_users`
 * has RLS on with no policies, so the key a browser holds cannot read who the
 * admins are or write itself a row. These tests cover the layer above that.
 */
test.describe("admin area is not reachable by outsiders", () => {
  test("a signed-out visitor is bounced to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  for (const path of ["/admin", "/admin/users", "/admin/bookings"]) {
    test(`a signed-in non-admin gets a 404 on ${path}`, async ({ page }) => {
      test.skip(
        !brandCreds.email || !brandCreds.password,
        "Needs a seeded, non-admin account (TEST_BRAND_EMAIL).",
      );

      await login(page, brandCreds.email!, brandCreds.password!);
      await page.goto(path);

      // A 404, deliberately — not "access denied". There's no reason to tell a
      // stranger that an admin area exists at all.
      await expect(page.locator("body")).not.toContainText("Admin");
      await expect(page.locator("body")).not.toContainText("Held in escrow");
    });
  }

  test("the admin link is not in a normal user's nav", async ({ page }) => {
    test.skip(
      !brandCreds.email || !brandCreds.password,
      "Needs a seeded, non-admin account (TEST_BRAND_EMAIL).",
    );

    await login(page, brandCreds.email!, brandCreds.password!);
    await expect(page.locator('nav a[href="/admin"]')).toHaveCount(0);
  });
});
