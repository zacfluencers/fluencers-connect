"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { signOut } from "@/app/actions/auth";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";

type NavItem = { href: string; label: string };

/** Mobile-only hamburger that opens a full-screen, animated menu. */
export function MobileNav({
  me,
  links,
}: {
  me: { email: string; role: string } | null;
  links: NavItem[];
}) {
  const [open, setOpen] = useState(false);

  // Lock body scroll + close on Escape while the menu is open.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--foreground)] transition-colors hover:bg-white/5"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-[var(--background)]/95 backdrop-blur-xl" />

            <motion.div
              className="relative flex h-full flex-col px-6 py-3.5"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {/* Top bar mirrors the real nav height */}
              <div className="flex items-center justify-between">
                <Link href="/" onClick={() => setOpen(false)} aria-label="Home">
                  <Logo className="h-5 w-auto text-[var(--foreground)]" />
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--foreground)] transition-colors hover:bg-white/5"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Links — staggered in */}
              <motion.nav
                className="mt-12 flex flex-1 flex-col gap-1"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
                }}
              >
                {links.map((l) => (
                  <motion.div
                    key={l.href}
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      show: { opacity: 1, y: 0 },
                    }}
                  >
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block py-3 text-3xl font-semibold tracking-tight text-[var(--foreground)] transition-colors hover:text-[var(--accent-2)]"
                    >
                      {l.label}
                    </Link>
                  </motion.div>
                ))}
              </motion.nav>

              {/* Auth footer */}
              <div className="border-t border-[var(--border)] pt-5">
                {me ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-[var(--muted)]">{me.email}</span>
                      <span className="text-xs capitalize text-[var(--foreground)]">{me.role}</span>
                    </span>
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="rounded-xl border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-white/5"
                      >
                        Sign out
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <ButtonLink href="/signup" size="lg" className="w-full">
                      Get started
                    </ButtonLink>
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="py-1 text-center text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                      Sign in
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
