import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId, isSanityConfigured } from "@/sanity/env";

export { isSanityConfigured };

/**
 * Read-only Sanity client for fetching published content. Null when Sanity
 * isn't configured yet (so callers fall back to built-in copy).
 */
export const sanityClient = isSanityConfigured
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: true, // fast, cached reads of published content
      perspective: "published",
    })
  : null;
