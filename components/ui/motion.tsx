"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Fade + slide-up on mount. Pass `index` to stagger a list (each item waits
 * index * 0.06s). Calm, intentional — not bouncy.
 */
export function Reveal({
  children,
  index = 0,
  className,
  y = 14,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: index * 0.06 }}
    >
      {children}
    </motion.div>
  );
}

/** Reveals children when scrolled into view (used for lower-page sections). */
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
