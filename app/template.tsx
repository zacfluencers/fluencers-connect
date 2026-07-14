"use client";

import { useEffect } from "react";

/**
 * App Router template — remounts on every navigation, so the CSS animation on
 * the wrapper replays and each route change gets a calm fade + slight slide.
 *
 * The animation is CSS rather than JavaScript, and that distinction matters a
 * lot here. The Framer Motion version server-rendered this wrapper at
 * `opacity: 0`, so every page on the site arrived invisible and stayed that way
 * until React had hydrated — on a phone that meant seconds of blank screen. CSS
 * animates from the very first paint and needs no JavaScript at all.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  // The transform on the wrapper interferes with the browser/Next.js "scroll to
  // top on navigation", which can leave a long page (e.g. the deal room)
  // scrolled partway down on load. Since this template remounts on every
  // navigation, resetting scroll here fixes it app-wide. The fade-in hides any
  // jump.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return <div className="page-enter">{children}</div>;
}
