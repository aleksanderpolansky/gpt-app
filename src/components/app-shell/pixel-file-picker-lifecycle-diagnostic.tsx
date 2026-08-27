"use client";

import { useEffect, useRef } from "react";

const QUERY_PARAM = "pickerdiag";
const ENABLED_KEY = "arctor:pickerdiag:v1:enabled";
const LOG_KEY = "arctor:pickerdiag:v1:log";
const PENDING_KEY = "arctor:pickerdiag:v1:pending";
const MAX_RECORDS = 180;

type DiagnosticRecord = {
  at: string;
  elapsedMs: number;
  event: string;
  snapshot: Record<string, unknown>;
  extra?: Record<string, unknown>;
};

function safeSessionGet(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Diagnostic storage must never affect the application.
  }
}

function safeSessionRemove(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Diagnostic storage must never affect the application.
  }
}

function readLog() {
  try {
    const raw = safeSessionGet(LOG_KEY);

    if (!raw) {
      return [] as DiagnosticRecord[];
    }

    const parsed = JSON.parse(raw) as unknown;

    return Array.isArray(parsed)
      ? (parsed as DiagnosticRecord[])
      : [];
  } catch {
    return [] as DiagnosticRecord[];
  }
}

function writeLog(records: DiagnosticRecord[]) {
  safeSessionSet(
    LOG_KEY,
    JSON.stringify(records.slice(-MAX_RECORDS)),
  );
}

function elementSnapshot(element: Element | null) {
  if (!(element instanceof HTMLElement)) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return {
    tag: element.tagName.toLowerCase(),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    top: Math.round(rect.top),
    bottom: Math.round(rect.bottom),
    left: Math.round(rect.left),
    right: Math.round(rect.right),
    display: style.display,
    visibility: style.visibility,
    opacity: style.opacity,
    overflow: style.overflow,
    overflowY: style.overflowY,
    childElementCount: element.childElementCount,
    textLength: element.textContent?.length ?? 0,
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  };
}

function currentSnapshot() {
  try {
    const shell = document.querySelector(
      '[data-arctor-app-shell="true"]',
    );
    const main = document.querySelector(
      '[data-arctor-main="true"]',
    );
    const activeElement = document.activeElement;
    const visualViewport = window.visualViewport;
    const navigationEntry =
      performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;

    return {
      location: {
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      },
      historyLength: window.history.length,
      historyStateKeys:
        window.history.state &&
        typeof window.history.state === "object"
          ? Object.keys(window.history.state)
          : [],
      readyState: document.readyState,
      visibilityState: document.visibilityState,
      documentHasFocus: document.hasFocus(),
      navigationType: navigationEntry?.type ?? null,
      viewport: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
        devicePixelRatio: window.devicePixelRatio,
        visualWidth: visualViewport?.width ?? null,
        visualHeight: visualViewport?.height ?? null,
        visualOffsetTop: visualViewport?.offsetTop ?? null,
        visualOffsetLeft: visualViewport?.offsetLeft ?? null,
        visualScale: visualViewport?.scale ?? null,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        orientationType:
          window.screen.orientation?.type ?? null,
      },
      viewportCssVar:
        document.documentElement.style.getPropertyValue(
          "--arctor-app-viewport-height",
        ) || null,
      body: elementSnapshot(document.body),
      shell: elementSnapshot(shell),
      main: elementSnapshot(main),
      activeElement:
        activeElement instanceof HTMLElement
          ? {
              tag: activeElement.tagName.toLowerCase(),
              type:
                activeElement instanceof HTMLInputElement
                  ? activeElement.type
                  : null,
            }
          : null,
      pendingFilePicker: safeSessionGet(PENDING_KEY) === "1",
    };
  } catch (error) {
    return {
      snapshotError:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}

function fallbackClipboardCopy(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

export function PixelFilePickerLifecycleDiagnostic() {
  const controlRef = useRef<HTMLDivElement | null>(null);
  const copyButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const queryEnabled =
      new URLSearchParams(window.location.search).get(
        QUERY_PARAM,
      ) === "1";
    const sessionEnabled =
      safeSessionGet(ENABLED_KEY) === "1";

    if (!queryEnabled && !sessionEnabled) {
      return;
    }

    safeSessionSet(ENABLED_KEY, "1");
    controlRef.current?.removeAttribute("hidden");

    const startedAt = performance.now();
    const timers = new Set<number>();

    function append(
      event: string,
      extra?: Record<string, unknown>,
    ) {
      try {
        const record: DiagnosticRecord = {
          at: new Date().toISOString(),
          elapsedMs: Math.round(
            performance.now() - startedAt,
          ),
          event,
          snapshot: currentSnapshot(),
          ...(extra ? { extra } : {}),
        };

        const records = readLog();
        records.push(record);
        writeLog(records);
      } catch {
        // The diagnostic must never throw into the app shell.
      }
    }

    function scheduleSnapshots(reason: string) {
      for (const delay of [0, 50, 250, 1000, 2000]) {
        const timerId = window.setTimeout(() => {
          timers.delete(timerId);
          append(`snapshot:${reason}:${delay}ms`);
        }, delay);

        timers.add(timerId);
      }
    }

    function isFileInput(target: EventTarget | null) {
      return (
        target instanceof HTMLInputElement &&
        target.type === "file"
      );
    }

    function onFileClick(event: Event) {
      if (!isFileInput(event.target)) {
        return;
      }

      const input = event.target as HTMLInputElement;
      safeSessionSet(PENDING_KEY, "1");

      append("file-input:click", {
        accept: input.accept,
        multiple: input.multiple,
        disabled: input.disabled,
      });
    }

    function onFileChange(event: Event) {
      if (!isFileInput(event.target)) {
        return;
      }

      const input = event.target as HTMLInputElement;
      const files = Array.from(input.files ?? []);

      append("file-input:change", {
        fileCount: files.length,
        files: files.map((file) => ({
          type: file.type,
          size: file.size,
        })),
      });

      safeSessionRemove(PENDING_KEY);
      scheduleSnapshots("file-change");
    }

    function onFileCancel(event: Event) {
      if (!isFileInput(event.target)) {
        return;
      }

      append("file-input:cancel");
      safeSessionRemove(PENDING_KEY);
      scheduleSnapshots("file-cancel");
    }

    function onVisibilityChange() {
      append(`visibility:${document.visibilityState}`);

      if (document.visibilityState === "visible") {
        scheduleSnapshots("visibility-visible");
      }
    }

    function onPageShow(event: PageTransitionEvent) {
      append("pageshow", { persisted: event.persisted });
      scheduleSnapshots("pageshow");
    }

    function onPageHide(event: PageTransitionEvent) {
      append("pagehide", { persisted: event.persisted });
    }

    function onFocus() {
      append("window:focus");
      scheduleSnapshots("focus");
    }

    function onBlur() {
      append("window:blur");
    }

    function onPopState() {
      append("popstate");
      scheduleSnapshots("popstate");
    }

    function onHashChange() {
      append("hashchange");
    }

    function onResize() {
      append("window:resize");
    }

    function onOrientationChange() {
      append("orientationchange");
      scheduleSnapshots("orientationchange");
    }

    function onVisualViewportResize() {
      append("visualViewport:resize");
    }

    function onError(event: ErrorEvent) {
      append("window:error", {
        message: event.message,
        filename: event.filename
          ? event.filename.split("/").slice(-2).join("/")
          : null,
        line: event.lineno,
        column: event.colno,
        stack:
          event.error instanceof Error
            ? event.error.stack?.slice(0, 1800) ?? null
            : null,
      });
    }

    function onUnhandledRejection(
      event: PromiseRejectionEvent,
    ) {
      const reason = event.reason;

      append("window:unhandledrejection", {
        message:
          reason instanceof Error
            ? reason.message
            : String(reason).slice(0, 1200),
        stack:
          reason instanceof Error
            ? reason.stack?.slice(0, 1800) ?? null
            : null,
      });
    }

    const navigatorWithUaData = navigator as Navigator & {
      userAgentData?: {
        mobile?: boolean;
        platform?: string;
        brands?: Array<{
          brand: string;
          version: string;
        }>;
      };
    };

    append("diagnostic:mounted", {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      userAgentData: navigatorWithUaData.userAgentData ?? null,
    });
    scheduleSnapshots("mounted");

    document.addEventListener("click", onFileClick, true);
    document.addEventListener("change", onFileChange, true);
    document.addEventListener("cancel", onFileCancel, true);
    document.addEventListener(
      "visibilitychange",
      onVisibilityChange,
    );
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("resize", onResize);
    window.addEventListener(
      "orientationchange",
      onOrientationChange,
    );
    window.addEventListener("error", onError);
    window.addEventListener(
      "unhandledrejection",
      onUnhandledRejection,
    );
    window.visualViewport?.addEventListener(
      "resize",
      onVisualViewportResize,
    );

    return () => {
      for (const timerId of timers) {
        window.clearTimeout(timerId);
      }

      document.removeEventListener(
        "click",
        onFileClick,
        true,
      );
      document.removeEventListener(
        "change",
        onFileChange,
        true,
      );
      document.removeEventListener(
        "cancel",
        onFileCancel,
        true,
      );
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange,
      );
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener(
        "hashchange",
        onHashChange,
      );
      window.removeEventListener("resize", onResize);
      window.removeEventListener(
        "orientationchange",
        onOrientationChange,
      );
      window.removeEventListener("error", onError);
      window.removeEventListener(
        "unhandledrejection",
        onUnhandledRejection,
      );
      window.visualViewport?.removeEventListener(
        "resize",
        onVisualViewportResize,
      );
    };
  }, []);

  async function copyDiagnostics() {
    const text = JSON.stringify(
      {
        release:
          "ARCTOR_PIXEL_FILE_PICKER_LIFECYCLE_DIAGNOSTIC_V1",
        generatedAt: new Date().toISOString(),
        records: readLog(),
      },
      null,
      2,
    );

    let copied = false;

    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = fallbackClipboardCopy(text);
    }

    const copyButton = copyButtonRef.current;

    if (copyButton) {
      copyButton.textContent = copied ? "Copied" : "Copy failed";

      window.setTimeout(() => {
        if (copyButton.isConnected) {
          copyButton.textContent = "Copy diag";
        }
      }, 1800);
    }
  }

  function resetDiagnostics() {
    safeSessionRemove(LOG_KEY);
    safeSessionRemove(PENDING_KEY);

    if (copyButtonRef.current) {
      copyButtonRef.current.textContent = "Copy diag";
    }
  }

  return (
    <div
      ref={controlRef}
      hidden
      className="fixed bottom-3 left-3 z-[90] flex items-center gap-1.5 rounded-xl border border-[#dfe3f1] bg-white/95 p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.14)] backdrop-blur"
    >
      <button
        ref={copyButtonRef}
        type="button"
        onClick={copyDiagnostics}
        className="rounded-lg bg-[#3b6ef8] px-2.5 py-1.5 text-[10px] font-semibold text-white"
      >
        Copy diag
      </button>

      <button
        type="button"
        onClick={resetDiagnostics}
        className="rounded-lg border border-[#dfe3f1] bg-white px-2 py-1.5 text-[10px] font-semibold text-[#5a5f7a]"
      >
        Reset
      </button>
    </div>
  );
}
