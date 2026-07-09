/**
 * Shared Sanity project settings, read from public env vars.
 *
 * Values are sanitised (stray quotes/whitespace stripped) and the API version is
 * validated, so a malformed env var can never break the site build — the public
 * pages just fall back to their built-in copy and the Studio shows a note.
 */

function clean(v: string | undefined): string {
  return (v ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
}

const rawApiVersion = clean(process.env.NEXT_PUBLIC_SANITY_API_VERSION);

// Sanity expects "1" or a date like "2024-10-01". Fall back on anything else.
export const apiVersion = /^\d{4}-\d{2}-\d{2}$/.test(rawApiVersion)
  ? rawApiVersion
  : "2024-10-01";

export const dataset = clean(process.env.NEXT_PUBLIC_SANITY_DATASET) || "production";

export const projectId = clean(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);

export const isSanityConfigured = Boolean(projectId);
