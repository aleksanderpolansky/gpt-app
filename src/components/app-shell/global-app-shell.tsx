"use client";

import { useEffect, useState, type ReactNode, type TouchEvent } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, MessageSquare, X } from "lucide-react";

import { AiNavigatorProvider } from "./ai-navigator-provider";
import { GlobalAiNavigator } from "./global-ai-navigator";
import { GlobalSidebar, GlobalTopBar } from "./global-navigation";

type MobileLayer = "left" | "right" | null;

const mobileAiHandleStyle = {
  bottom: "calc(72px + env(safe-area-inset-bottom))",
};

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
  const [activeMobileLayer, setActiveMobileLayer] = useState<MobileLayer>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveMobileLayer(null);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  if (shouldRenderPlainPage(pathname)) {
    return <>{children}</>;
  }

  function openMobileLayer(layer: Exclude<MobileLayer, null>) {
    setActiveMobileLayer((currentLayer) => (currentLayer === layer ? null : layer));
  }

  function closeMobileLayer() {
    setActiveMobileLayer(null);
  }

  function handleDrawerTouchStart(event: TouchEvent<HTMLElement>) {
    setTouchStartX(event.touches[0]?.clientX ?? null);
  }

  function handleDrawerTouchEnd(event: TouchEvent<HTMLElement>) {
    if (touchStartX === null) {
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? touchStartX;
    const deltaX = endX - touchStartX;

    if (activeMobileLayer === "left" && deltaX < -54) {
      closeMobileLayer();
    }

    if (activeMobileLayer === "right" && deltaX > 54) {
      closeMobileLayer();
    }

    setTouchStartX(null);
  }

  return (
    <AiNavigatorProvider>
      <div
        className="flex h-screen w-screen flex-col overflow-hidden bg-[#f0f2f7]"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        <GlobalTopBar onOpenMobileNavigation={() => openMobileLayer("left")} />

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <GlobalSidebar />

          <main className="scrollbar-hide min-w-0 flex-1 overflow-y-auto bg-[#f0f2f7]">
            {children}
          </main>

          <GlobalAiNavigator />
        </div>

        <MobileLayeredShell
          activeLayer={activeMobileLayer}
          onOpenLayer={openMobileLayer}
          onCloseLayer={closeMobileLayer}
          onTouchStart={handleDrawerTouchStart}
          onTouchEnd={handleDrawerTouchEnd}
        />
      </div>
    </AiNavigatorProvider>
  );
}

function MobileLayeredShell({
  activeLayer,
  onOpenLayer,
  onCloseLayer,
  onTouchStart,
  onTouchEnd,
}: {
  readonly activeLayer: MobileLayer;
  readonly onOpenLayer: (layer: Exclude<MobileLayer, null>) => void;
  readonly onCloseLayer: () => void;
  readonly onTouchStart: (event: TouchEvent<HTMLElement>) => void;
  readonly onTouchEnd: (event: TouchEvent<HTMLElement>) => void;
}) {
  return (
    <div className="lg:hidden">
      {activeLayer !== "right" ? (
        <button
          type="button"
          onClick={() => onOpenLayer("right")}
          aria-label="Open AI Navigator"
          className="fixed right-3 z-40 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/50 bg-gradient-to-br from-[#8b5cf6] to-[#3b6ef8] text-white shadow-[0_14px_34px_rgba(59,110,248,0.28)] transition-transform active:scale-95"
          style={mobileAiHandleStyle}
        >
          <MessageSquare size={20} />
          <ChevronLeft size={13} className="absolute left-1.5 text-white/75" />
        </button>
      ) : null}

      {activeLayer ? (
        <button
          type="button"
          aria-label="Close mobile layer"
          onClick={onCloseLayer}
          className="fixed inset-0 z-40 bg-[#0f172a]/35 backdrop-blur-[2px]"
        />
      ) : null}

      {activeLayer === "left" ? (
        <section
          aria-label="Mobile navigation drawer"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[380px] overflow-hidden rounded-r-[28px] border-r border-[rgba(0,0,0,0.08)] bg-white shadow-[18px_0_45px_rgba(15,23,42,0.18)]"
        >
          <button
            type="button"
            onClick={onCloseLayer}
            aria-label="Close navigation"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(0,0,0,0.08)] bg-white/90 text-[#4a4f6a] shadow-sm backdrop-blur transition-colors hover:bg-[#f5f6fb]"
          >
            <X size={16} />
          </button>
          <GlobalSidebar className="flex h-full w-full flex-col overflow-hidden bg-white" />
        </section>
      ) : null}

      {activeLayer === "right" ? (
        <section
          aria-label="Mobile AI Navigator drawer"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="fixed inset-y-0 right-0 z-50 w-[92vw] max-w-[430px] overflow-hidden rounded-l-[28px] border-l border-[rgba(0,0,0,0.08)] bg-white shadow-[-18px_0_45px_rgba(15,23,42,0.18)]"
        >
          <button
            type="button"
            onClick={onCloseLayer}
            aria-label="Close AI Navigator"
            className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(0,0,0,0.08)] bg-white/90 text-[#4a4f6a] shadow-sm backdrop-blur transition-colors hover:bg-[#f5f6fb]"
          >
            <X size={16} />
          </button>
          <GlobalAiNavigator className="flex h-full w-full flex-col overflow-hidden bg-white" />
        </section>
      ) : null}
    </div>
  );
}
