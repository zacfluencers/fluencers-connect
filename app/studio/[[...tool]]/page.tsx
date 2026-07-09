/**
 * The embedded Sanity Studio, served at /studio.
 * Editors visit /studio, sign in with Sanity, edit content, and publish.
 */
import { NextStudio } from "next-sanity/studio";
import config from "@/sanity.config";
import { isSanityConfigured } from "@/sanity/env";

export const dynamic = "force-static";
export { metadata, viewport } from "next-sanity/studio";

export default function StudioPage() {
  if (!isSanityConfigured) {
    return (
      <div style={{ padding: 40, fontFamily: "system-ui", lineHeight: 1.5 }}>
        <h1>Studio not configured</h1>
        <p>
          Set <code>NEXT_PUBLIC_SANITY_PROJECT_ID</code> (and dataset) in your
          environment, then redeploy, to enable the content editor.
        </p>
      </div>
    );
  }
  return <NextStudio config={config} />;
}
