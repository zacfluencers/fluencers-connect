import { test, expect } from "@playwright/test";

/**
 * Creator photos: right shape, right size.
 *
 * Both halves of this file are regressions from 2026-07-14, when a change meant
 * to speed the site up shipped two real bugs to the live homepage in one day:
 *
 *  - Photos were served at their full upload size — 9MB of images on one page,
 *    one of them a 3.7MB photo shown in a 290px box.
 *  - The fix for that then asked Supabase for a width but not a resize mode, so
 *    it kept the original height. A 4284x5712 portrait came back 720x5712, and
 *    object-cover cropped that sliver into a wild zoom.
 *
 * The unit tests in lib/format.test.ts check the URL we build. These check what
 * the browser actually receives — which is what was wrong, and what a test
 * asserting my own assumptions would have missed.
 */
test.describe("creator photos", () => {
  test("are not distorted, and are not megabytes wide", async ({ page }) => {
    await page.goto("/marketplace");

    const photos = page.locator("img").filter({ hasNot: page.locator("[aria-hidden]") });
    await expect(photos.first()).toBeVisible({ timeout: 15_000 });

    // Wait for the browser to have decoded them, so naturalWidth/Height are real.
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("img")]
          .filter((i) => i.src.includes("/avatars/"))
          .every((i) => i.complete && i.naturalWidth > 0),
      undefined,
      { timeout: 15_000 },
    );

    const rendered = await page.evaluate(() =>
      [...document.querySelectorAll("img")]
        .filter((i) => i.src.includes("/avatars/"))
        .map((i) => ({
          src: i.src,
          naturalWidth: i.naturalWidth,
          naturalHeight: i.naturalHeight,
        })),
    );

    test.skip(rendered.length === 0, "No creator photos on the page to check.");

    for (const img of rendered) {
      // A sane photo. The zoom bug produced things like 720x5712 — an aspect
      // ratio no camera on earth produces.
      const aspect = img.naturalWidth / img.naturalHeight;
      expect(
        aspect,
        `${img.src} is ${img.naturalWidth}x${img.naturalHeight} — that aspect ratio means it was cropped, not scaled`,
      ).toBeGreaterThan(0.2);
      expect(aspect).toBeLessThan(5);

      // Nothing enormous. We display these in a ~290px box; anything far past
      // retina for that slot is wasted bandwidth on a phone.
      expect(
        img.naturalWidth,
        `${img.src} is ${img.naturalWidth}px wide — it's being served far larger than it's shown`,
      ).toBeLessThanOrEqual(1200);
    }
  });

  test("uploaded photos are resized by Supabase, not served raw", async ({ page }) => {
    await page.goto("/marketplace");
    await expect(page.locator("img").first()).toBeVisible({ timeout: 15_000 });

    const raw = await page.evaluate(() =>
      [...document.querySelectorAll("img")]
        .map((i) => i.src)
        // The raw object endpoint hands back the original upload untouched.
        .filter((src) => src.includes("/storage/v1/object/public/avatars/")),
    );

    expect(
      raw,
      "These photos bypass the resizing endpoint and will be served at full upload size",
    ).toEqual([]);
  });
});
