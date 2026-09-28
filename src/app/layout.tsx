import Script from "next/script";
import FullAssistBanner from "@/components/admin/full-assist-banner";
import { getFullAssistBootstrap } from "@/components/admin/full-assist-bootstrap";
import VercelAnalytics from "@/components/analytics/vercel-analytics";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { GlobalAppShell } from "../components/app-shell/global-app-shell";
import "./globals.css";
import { AppSessionHeartbeat } from "./app-session-heartbeat";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ARCTor.app / AI-NAVIGATOR",
  description: "ARCTor.app workspace and AI navigator pilot shell",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const assist = await getFullAssistBootstrap();
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Script id="arctor-full-assist-context-v2" strategy="beforeInteractive">{assist.source}</Script>
        <FullAssistBanner context={assist.context} invalid={assist.invalid} />
        <GlobalAppShell><AppSessionHeartbeat />
          {children}</GlobalAppShell>
        <VercelAnalytics />

      </body>
    </html>
  );
}
