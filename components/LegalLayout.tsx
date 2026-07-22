import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared reading layout for the legal pages (Terms, Privacy). Keeps a calm,
 * readable single column on the dark theme, with consistent heading styles.
 */
export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
      <Link
        href="/"
        className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        ← Home
      </Link>
      <h1 className="h-display mt-5 text-4xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Last updated: {updated}</p>
      <div className="legal-prose mt-10 space-y-6 text-[15px] leading-relaxed text-[var(--muted)]">
        {children}
      </div>
    </main>
  );
}

/**
 * A sub-heading within a section. Used where one section has to cover two
 * genuinely different things - whitelisting and profile posts have separate
 * rules, and running them together as prose makes both easy to misread.
 */
export function Sub({ title }: { title: string }) {
  return (
    <h3 className="pt-1 text-[15px] font-semibold text-[var(--foreground)]">
      {title}
    </h3>
  );
}

/** A titled section with a heading. */
export function Section({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}
