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
          ? { y: -3, boxShadow: "0 16px 40px -16px rgba(0,0,0,0.7)" }
          : undefined
      }
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] ${className}`}
    >
      {children}
    </motion.div>
  );
}
