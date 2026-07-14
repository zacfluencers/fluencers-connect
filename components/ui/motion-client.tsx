"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Reveals children when scrolled into view (used for lower-page sections).
 *
 * This one stays on Framer Motion because it needs to watch the scroll
 * position. It's safe to do so: everything it wraps sits below the fold, so
 * waiting for JavaScript costs nothing visible. Above the fold, use `Reveal`.
 */
export function RevealOnView({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
