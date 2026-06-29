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

export const metadata: Metadata = {
  title: "ARCTor.app / AI-NAVIGATOR",
  description: "ARCTor.app workspace and AI navigator pilot shell",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <GlobalAppShell><AppSessionHeartbeat />
          {children}</GlobalAppShell>
        <VercelAnalytics />

      </body>
    </html>
  );
}
