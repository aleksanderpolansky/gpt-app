import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { GlobalAppShell } from "../components/app-shell/global-app-shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "GPT App / AI-NAVIGATOR",
  description: "LifeOS workspace and AI navigator pilot shell",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <GlobalAppShell>{children}</GlobalAppShell>
      </body>
    </html>
  );
}
