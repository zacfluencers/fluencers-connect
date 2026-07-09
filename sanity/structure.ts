import { type StructureResolver } from "sanity/structure";

/**
 * Desk structure: Homepage is a singleton (one document, edited in place) rather
 * than a "create new" list — cleaner for a non-technical editor.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.listItem()
        .title("Homepage")
        .id("homepage")
        .child(S.document().schemaType("homepage").documentId("homepage")),
    ]);
