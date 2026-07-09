/**
 * Shared Sanity project settings, read from public env vars.
 *
 * These fall back to empty/default values rather than throwing, so a missing
 * env var never breaks the site build — the public pages simply fall back to
 * their built-in copy, and the Studio shows a "not configured" note.
 */
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-10-01";

export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "";

export const isSanityConfigured = Boolean(projectId);
