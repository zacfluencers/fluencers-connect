import { defineEnableDraftMode } from "next-sanity/draft-mode";
import { sanityClient } from "@/lib/sanity/client";
import { readToken } from "@/lib/sanity/token";

/**
 * Turns on Next's draft mode when the Presentation tool opens a preview, so the
 * site renders unpublished drafts with click-to-edit overlays.
 */
export const { GET } = defineEnableDraftMode({
  client: sanityClient.withConfig({ token: readToken }),
});
