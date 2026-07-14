"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { signOut } from "@/app/actions/auth";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";

type NavItem = { href: string; label: string };

/**
 * Mobile-only menu. Rendered through a portal to <body> so it can't be trapped
 * by any ancestor's overflow/stacking context (the app clips overflow-x).
 */
export function MobileNav({
  me,
  links,
}: {
  me: { email: string; role: string } | null;
  links: NavItem[];
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal needs a client mount flag
    setMounted(true);
  }, []);

  // Lock scroll + Escape-to-close while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--foreground)] transition-colors hover:bg-white/5 active:scale-95 lg:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
          <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
        </svg>
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                className="fixed inset-0 z-[100] flex flex-col bg-[var(--background)] lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {/* soft glow at the top */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-64"
                  style={{
                    background:
                      "radial-gradient(70% 100% at 50% 0%, rgba(132,105,237,0.18), transparent 70%)",
                  }}
                />

                {/* Top bar — matches the real nav */}
                <div className="relative flex items-center justify-between px-5 py-3.5">
                  <Link href="/" aria-label="Home" onClick={() => setOpen(false)}>
                    <Logo className="h-5 w-auto text-[var(--foreground)]" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--foreground)] transition-colors hover:bg-white/5 active:scale-95"
                  >
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Links */}
                <motion.nav
                  className="relative flex flex-1 flex-col px-5 pt-4"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.045, delayChildren: 0.06 } },
                  }}
                >
                  {links.map((l) => {
                    const active =
                      pathname === l.href || pathname.startsWith(`${l.href}/`);
                    return (
                      <motion.div
                        key={l.href}
                        variants={{
                          hidden: { opacity: 0, y: 14 },
                          show: { opacity: 1, y: 0 },
                        }}
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      >
                        <Link
                          href={l.href}
                          onClick={() => setOpen(false)}
                          className={`flex items-center justify-between border-b border-[var(--border)] py-4 text-2xl font-semibold tracking-tight transition-colors ${
                            active
                              ? "text-[var(--accent-2)]"
                              : "text-[var(--foreground)] active:text-[var(--accent-2)]"
                          }`}
                        >
                          {l.label}
                          <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.nav>

                {/* Auth footer */}
                <motion.div
                  className="relative px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                >
                  {me ? (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-4">
                      {/* Tapping yourself opens Settings. */}
                      <Link
                        href="/settings"
                        onClick={() => setOpen(false)}
                        className="min-w-0 rounded-xl transition-opacity hover:opacity-80"
                      >
                        <span className="block truncate text-sm text-[var(--foreground)]">{me.email}</span>
                        <span className="text-xs text-[var(--muted)]">
                          <span className="capitalize">{me.role}</span> · Settings
                        </span>
                      </Link>
                      <form action={signOut}>
                        <button
                          type="submit"
                          className="shrink-0 rounded-xl border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-white/5 active:scale-95"
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
                        className="py-2 text-center text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                      >
                        Sign in
                      </Link>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
