"use client";

import { type ReactNode, useEffect } from "react";

type LocalEditorStandaloneFrameProps = {
  readonly active: boolean;
  readonly children: ReactNode;
  readonly onExit: () => void;
};

export function LocalEditorStandaloneFrame({
  active,
  children,
  onExit,
}: LocalEditorStandaloneFrameProps) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onExit();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [active, onExit]);

  return (
    <div
      data-local-editor-standalone={active ? "true" : "false"}
      className={
        active
          ? "fixed inset-0 z-[1000] flex h-[100dvh] w-screen min-w-0 overflow-hidden bg-[#edf0f6]"
          : "contents"
      }
    >
      {children}
    </div>
  );
}
