"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AiNavigatorProvider } from "./ai-navigator-provider";
import { GlobalAiNavigator } from "./global-ai-navigator";
import { GlobalSidebar, GlobalTopBar } from "./global-navigation";

function shouldRenderPlainPage(pathname: string) {
  return (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/m" ||
    pathname.startsWith("/m/")
  );
}

export function GlobalAppShell({
  children,
}: {
  readonly children: ReactNode;
}) {
  const pathname = usePathname();

  if (shouldRenderPlainPage(pathname)) {
    return <>{children}</>;
  }

  return (
    <AiNavigatorProvider>
      <div
        className="flex h-screen w-screen flex-col overflow-hidden bg-[#f0f2f7]"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        <GlobalTopBar />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <GlobalSidebar />

          <main className="scrollbar-hide min-w-0 flex-1 overflow-y-auto bg-[#f0f2f7]">
            {children}
          </main>

          <GlobalAiNavigator />
        </div>
      </div>
    </AiNavigatorProvider>
  );
}
