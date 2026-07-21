import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";
import { AgentationProvider } from "@/components/AgentationProvider";
import { InAppBrowserNotice } from "@/components/InAppBrowserNotice";
import { Nav } from "@/components/Nav";
import { SentryUser } from "@/components/SentryUser";
import { SiteChrome } from "@/components/SiteChrome";
import { SanityLive } from "@/lib/sanity/live";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fluencers Connect - Book creators instantly",
  description:
    "A premium marketplace where brands book creators. No negotiation. No friction.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { isEnabled: isDraft } = await draftMode();
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-[family-name:var(--font-sans)] antialiased">
        <InAppBrowserNotice />
        <SiteChrome nav={<Nav />} extras={<AgentationProvider />}>
          {children}
        </SiteChrome>
        {/* Attributes errors to an account so Sentry can count affected users. */}
        <SentryUser />
        {/* Live content + click-to-edit overlays (overlays only in preview). */}
        <SanityLive />
        {isDraft && <VisualEditing />}
      </body>
    </html>
  );
}
