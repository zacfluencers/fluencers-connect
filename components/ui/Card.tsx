import type { ReactNode } from "react";

/**
 * Surface card. With `interactive`, it lifts and gains a soft shadow on hover —
 * used for creator cards and clickable panels.
 *
 * The lift is CSS. As a Framer Motion `whileHover` it made every card on the
 * marketplace a JavaScript component, for an effect the browser can run on its
 * own compositor with no script at all.
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
  const lift = interactive
    ? "transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-[3px] hover:shadow-[0_16px_40px_-16px_rgba(0,0,0,0.7)]"
    : "";

  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] ${lift} ${className}`}
    >
      {children}
    </div>
  );
}
