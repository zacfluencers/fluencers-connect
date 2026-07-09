"use client";

import { usePathname } from "next/navigation";

/**
 * Wraps the app's visual chrome (grain texture, nav, dev overlays). On the
 * embedded Studio route (/studio) it renders the page bare so the editor gets
 * the full screen without the marketing site's nav on top.
 */
export function SiteChrome({
  nav,
  extras,
  children,
}: {
  nav: React.ReactNode;
  extras?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname?.startsWith("/studio")) return <>{children}</>;

  return (
    <>
      <div className="grain" aria-hidden />
      <div className="relative z-[2]">
        {nav}
        {children}
      </div>
      {extras}
    </>
  );
}
