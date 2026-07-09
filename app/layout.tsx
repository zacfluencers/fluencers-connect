import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AgentationProvider } from "@/components/AgentationProvider";
import { Nav } from "@/components/Nav";
import { SiteChrome } from "@/components/SiteChrome";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Influencer Connect — Book creators instantly",
  description:
    "A high-end marketplace where brands book creators. No negotiation. No friction.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-[family-name:var(--font-sans)] antialiased">
        <SiteChrome nav={<Nav />} extras={<AgentationProvider />}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
