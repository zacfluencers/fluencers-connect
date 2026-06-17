"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Surface card. With `interactive`, it lifts and gains a luminous glow border
 * on hover — used for creator cards and clickable panels.
 */
export function Card({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <motion.div
      whileHover={
        interactive
          ? {
              y: -4,
              boxShadow:
                "0 18px 50px -18px rgba(55,23,182,0.65), 0 0 0 1px rgba(132,105,237,0.35)",
            }
          : undefined
      }
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] ${className}`}
    >
      {children}
    </motion.div>
  );
}
