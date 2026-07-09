import { defineLive } from "next-sanity/live";
import { sanityClient } from "@/lib/sanity/client";
import { readToken } from "@/lib/sanity/token";

/**
 * Live content API. `sanityFetch` fetches content and (with SanityLive in the
 * layout) keeps it live-updating — so edits appear in the Presentation preview
 * as you type. The token (a read-only Viewer token) lets it read unpublished
 * drafts while previewing; without it, only published content previews.
 */
export const { sanityFetch, SanityLive } = defineLive({
  client: sanityClient,
  serverToken: readToken,
  browserToken: readToken,
});
