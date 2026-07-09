"use client";

/**
 * Sanity Studio configuration for the embedded editor at /studio.
 * (Client component — the Studio runs entirely in the browser.)
 */
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { presentationTool } from "sanity/presentation";
import { visionTool } from "@sanity/vision";
import { apiVersion, dataset, projectId } from "./sanity/env";
import { schema } from "./sanity/schemaTypes";
import { structure } from "./sanity/structure";

export default defineConfig({
  basePath: "/studio",
  projectId,
  dataset,
  schema,
  plugins: [
    // Visual, click-to-edit editing: a live preview of the site next to the
    // fields. Opening it turns on draft mode via the enable route.
    presentationTool({
      previewUrl: { previewMode: { enable: "/api/draft-mode/enable" } },
    }),
    structureTool({ structure }),
    // Lets you test content queries from inside the Studio.
    visionTool({ defaultApiVersion: apiVersion }),
  ],
});
