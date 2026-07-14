import type { CSSProperties, ReactNode } from "react";

export { RevealOnView } from "./motion-client";

/**
 * Fade + slide-up on load. Pass `index` to stagger a list (each item waits
 * index * 0.06s). Calm, intentional — not bouncy.
 *
 * Deliberately pure CSS. The Framer Motion version sent the hero to the browser
 * with `opacity: 0` and only faded it in once React had hydrated — so the
 * headline, which is the page's largest element, stayed invisible until the
 * JavaScript arrived. On a mobile connection that measured 8.6s. A CSS
 * animation runs from the first paint and needs no JavaScript at all.
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
    <div
      className={className ? `reveal ${className}` : "reveal"}
      style={
        {
          "--reveal-delay": `${(index * 0.06).toFixed(2)}s`,
          "--reveal-y": `${y}px`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
