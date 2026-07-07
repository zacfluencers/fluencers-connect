import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a running dev server (Ship Studio already keeps
 * one on http://localhost:3000). Override the target with PLAYWRIGHT_BASE_URL.
 *
 * Tests that need a signed-in account read optional seeded credentials from the
 * environment (TEST_BRAND_EMAIL / TEST_BRAND_PASSWORD) and skip themselves if
 * those aren't set — so `npm run test:e2e` is always green out of the box.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "list" : "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Reuse the dev server if one is already up; otherwise start it.
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
