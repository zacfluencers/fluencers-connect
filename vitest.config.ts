import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Unit tests for pure logic — the money, gating and formatting rules that don't
 * need a browser or a database. They run in about a second, so CI can gate every
 * push on them.
 *
 * The end-to-end tests (e2e/, Playwright) are a separate thing entirely: they
 * drive a real browser against a real Supabase, so they are NOT run in CI.
 */
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
