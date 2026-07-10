// TEMPORARY — verifies Sentry captures server errors. Delete after confirming.
export const dynamic = "force-dynamic";

export function GET() {
  throw new Error("Sentry test error — server route (delete me)");
}
