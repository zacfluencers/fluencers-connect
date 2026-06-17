"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const BASE =
  "relative inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]/60";

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
};

const VARIANTS: Record<Variant, string> = {
  // Primary: clean solid accent, subtle hover — no heavy glow.
  primary:
    "text-white bg-[var(--accent-2)] shadow-sm hover:bg-[#9079f0]",
  secondary:
    "text-[var(--foreground)] bg-transparent border border-[var(--border-strong)] hover:bg-white/5",
  ghost: "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/5",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps>;

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {children}
    </motion.button>
  );
}

/** Same look, renders as a link. */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: CommonProps & { href: string }) {
  return (
    <Link href={href} className="inline-block">
      <motion.span
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      >
        {children}
      </motion.span>
    </Link>
  );
}
