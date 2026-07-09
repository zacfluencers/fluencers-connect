/**
 * The Sanity read token, sanitised — stray quotes/whitespace from a mis-paste
 * are stripped so the token isn't silently rejected as invalid. Empty →
 * undefined. This is a non-public env var, so it resolves to undefined in the
 * browser bundle (server-only in practice) while staying importable by the
 * shared live module.
 */
const raw = (process.env.SANITY_API_READ_TOKEN || "")
  .trim()
  .replace(/^["']+|["']+$/g, "")
  .trim();

export const readToken = raw || undefined;
