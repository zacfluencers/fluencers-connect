import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId, isSanityConfigured } from "@/sanity/env";

export { isSanityConfigured };

/**
 * Base Sanity client. Uses a placeholder project id when unconfigured so it
 * never throws at import — callers guard reads with `isSanityConfigured`.
 * `stega.studioUrl` powers the click-to-edit overlays in Presentation.
 */
export const sanityClient = createClient({
  projectId: projectId || "placeholder",
  dataset,
  apiVersion,
  useCdn: true, // fast, cached reads of published content
  stega: { studioUrl: "/studio" },
});
