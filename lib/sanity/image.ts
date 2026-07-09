import imageUrlBuilder, { type SanityImageSource } from "@sanity/image-url";
import { projectId, dataset } from "@/sanity/env";

const builder = projectId ? imageUrlBuilder({ projectId, dataset }) : null;

/** Build a URL for a Sanity image, or null if not configured / no image. */
export function urlForImage(source: SanityImageSource | null | undefined) {
  if (!builder || !source) return null;
  return builder.image(source);
}
