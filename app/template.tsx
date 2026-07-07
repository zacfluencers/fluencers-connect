"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

/**
 * App Router template — remounts on every navigation, so wrapping children here
 * gives a calm fade + slight vertical slide page transition on each route change.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  // The transform on the motion wrapper interferes with the browser/Next.js
  // "scroll to top on navigation", which can leave a long page (e.g. the deal
  // room) scrolled partway down on load. Since this template remounts on every
  // navigation, resetting scroll here fixes it app-wide. The fade-in (starting
  // at opacity 0) hides any jump.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
