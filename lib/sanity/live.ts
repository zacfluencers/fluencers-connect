import { defineLive } from "next-sanity/live";
import { sanityClient } from "@/lib/sanity/client";

/**
 * Live content API. `sanityFetch` fetches content and (with SanityLive in the
 * layout) keeps it live-updating — so edits appear in the Presentation preview
 * as you type. The token (a read-only Viewer token) lets it read unpublished
 * drafts while previewing; without it, only published content previews.
 */
const token = process.env.SANITY_API_READ_TOKEN;

export const { sanityFetch, SanityLive } = defineLive({
  client: sanityClient,
  serverToken: token,
  browserToken: token,
});
