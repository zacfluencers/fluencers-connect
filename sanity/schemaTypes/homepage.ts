import { defineType, defineField, defineArrayMember } from "sanity";

/**
 * Homepage (a singleton) — the editable marketing copy for the public landing
 * page. Every field is optional: the site keeps its built-in wording as a
 * fallback whenever a field is left blank, so the page can never look empty.
 */
export const homepage = defineType({
  name: "homepage",
  title: "Homepage",
  type: "document",
  groups: [
    { name: "hero", title: "Hero", default: true },
    { name: "how", title: "How it works" },
    { name: "both", title: "Both sides" },
    { name: "cta", title: "Final call-to-action" },
  ],
  fields: [
    // --- Hero ---------------------------------------------------------------
    defineField({ name: "heroEyebrow", title: "Hero — small badge text", type: "string", group: "hero" }),
    defineField({ name: "heroHeadline", title: "Hero — headline (line 1)", type: "string", group: "hero" }),
    defineField({ name: "heroHeadlineAccent", title: "Hero — headline (line 2, coloured)", type: "string", group: "hero" }),
    defineField({ name: "heroSubheadline", title: "Hero — sub-headline", type: "text", rows: 2, group: "hero" }),
    defineField({ name: "heroPrimaryCtaLabel", title: "Hero — primary button text", type: "string", group: "hero" }),
    defineField({ name: "heroSecondaryCtaLabel", title: "Hero — secondary button text", type: "string", group: "hero" }),
    defineField({ name: "trustedByLabel", title: "“Trusted by” label", type: "string", group: "hero" }),
    defineField({
      name: "trustedByLogos",
      title: "“Trusted by” logos",
      description: "Upload brand logos for the scrolling row. If empty, placeholder names show. Wide/transparent PNGs look best.",
      type: "array",
      group: "hero",
      of: [defineArrayMember({ type: "object", fields: [
        defineField({ name: "name", title: "Brand name (used as alt text / fallback)", type: "string" }),
        defineField({ name: "image", title: "Logo image", type: "image", options: { hotspot: true } }),
      ], preview: { select: { title: "name", media: "image" } } })],
    }),

    // --- How it works -------------------------------------------------------
    defineField({ name: "howEyebrow", title: "Small label", type: "string", group: "how" }),
    defineField({ name: "howHeading", title: "Heading", type: "string", group: "how" }),
    defineField({ name: "howSubheading", title: "Sub-heading", type: "text", rows: 2, group: "how" }),
    defineField({
      name: "steps",
      title: "Steps",
      type: "array",
      group: "how",
      validation: (r) => r.max(3).warning("The design shows three steps."),
      of: [defineArrayMember({ type: "object", fields: [
        defineField({ name: "title", title: "Title", type: "string" }),
        defineField({ name: "body", title: "Description", type: "text", rows: 3 }),
      ], preview: { select: { title: "title", subtitle: "body" } } })],
    }),

    // --- Both sides ---------------------------------------------------------
    defineField({ name: "bothEyebrow", title: "Small label", type: "string", group: "both" }),
    defineField({ name: "bothHeading", title: "Heading", type: "string", group: "both" }),
    defineField({ name: "brandCardTitle", title: "“For brands” card title", type: "string", group: "both" }),
    defineField({
      name: "brandValues",
      title: "“For brands” bullet points",
      type: "array",
      group: "both",
      validation: (r) => r.max(4).warning("The design shows four bullets."),
      of: [defineArrayMember({ type: "object", fields: [
        defineField({ name: "title", title: "Title", type: "string" }),
        defineField({ name: "body", title: "Description", type: "text", rows: 2 }),
      ], preview: { select: { title: "title", subtitle: "body" } } })],
    }),
    defineField({ name: "creatorCardTitle", title: "“For creators” card title", type: "string", group: "both" }),
    defineField({
      name: "creatorValues",
      title: "“For creators” bullet points",
      type: "array",
      group: "both",
      validation: (r) => r.max(4).warning("The design shows four bullets."),
      of: [defineArrayMember({ type: "object", fields: [
        defineField({ name: "title", title: "Title", type: "string" }),
        defineField({ name: "body", title: "Description", type: "text", rows: 2 }),
      ], preview: { select: { title: "title", subtitle: "body" } } })],
    }),

    // --- Final CTA ----------------------------------------------------------
    defineField({ name: "finalHeading", title: "Heading", type: "string", group: "cta" }),
    defineField({ name: "finalSubheading", title: "Sub-heading", type: "text", rows: 2, group: "cta" }),
  ],
  preview: { prepare: () => ({ title: "Homepage" }) },
});
