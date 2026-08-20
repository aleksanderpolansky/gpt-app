"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";

import { getLocaleSearchParam, type LocaleCode } from "@/i18n";

type HelpEntry = {
  helpKey: string;
  kind: "page" | "heading" | "link" | "navigation";
  route: string;
  hrefPath: string | null;
  domSelector: string | null;
  ordinal: number | null;
  what: string | null;
  why: string | null;
};

type MarkerSlot = {
  helpKey: string;
  host: HTMLElement;
  entry: HelpEntry;
};

type ActiveHelp = {
  kind: "what" | "why";
  text: string;
  rect: DOMRect;
};

const TITLES: Record<LocaleCode, { what: string; why: string; close: string }> = {
  ru: { what: "Что это такое?", why: "Зачем это вам?", close: "Закрыть" },
  pl: { what: "Co to jest?", why: "Po co Ci to?", close: "Zamknij" },
  en: { what: "What is it?", why: "Why is it useful?", close: "Close" },
  es: { what: "¿Qué es?", why: "¿Para qué te sirve?", close: "Cerrar" },
  uk: { what: "Що це таке?", why: "Навіщо це вам?", close: "Закрити" },
  de: { what: "Was ist das?", why: "Wozu ist das gut?", close: "Schließen" },
  cs: { what: "Co to je?", why: "K čemu vám to je?", close: "Zavřít" },
};

function currentLocale(): LocaleCode {
  if (typeof window === "undefined") return "en";
  return getLocaleSearchParam(new URLSearchParams(window.location.search));
}

function normalizeHrefPath(anchor: HTMLAnchorElement) {
  try {
    const url = new URL(anchor.href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    const path = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "") || "/";
    return path;
  } catch {
    return null;
  }
}

function createHost(target: Element, helpKey: string) {
  const existing = target.parentElement?.querySelector(
    `:scope > [data-arctor-help-host="${CSS.escape(helpKey)}"]`,
  );
  if (existing instanceof HTMLElement) {
    if (existing.previousElementSibling !== target) {
      target.insertAdjacentElement("afterend", existing);
    }
    return existing;
  }

  const host = document.createElement("span");
  host.setAttribute("data-arctor-help-host", helpKey);
  host.style.display = "inline-flex";
  host.style.alignItems = "center";
  host.style.gap = "3px";
  host.style.marginLeft = "5px";
  host.style.verticalAlign = "middle";
  host.style.flexShrink = "0";
  host.style.position = "relative";
  host.style.zIndex = "2";
  target.insertAdjacentElement("afterend", host);
  return host;
}

function nthElement<T extends Element>(items: NodeListOf<T>, ordinal: number | null | undefined) {
  const index = Math.max(0, (ordinal ?? 1) - 1);
  return items.item(index);
}

function isElementRendered(element: Element) {
  if (element.getClientRects().length === 0) return false;
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
}

function findActiveNavigation() {
  const navs = [...document.querySelectorAll('nav[aria-label="ARCTor"]')];
  return navs.find(isElementRendered) ?? navs[0] ?? null;
}

function findTargetForEntry(entry: HelpEntry) {
  if (entry.kind === "navigation") {
    const nav = findActiveNavigation();
    if (!nav || !entry.hrefPath) return null;
    const matches = [...nav.querySelectorAll("a[href]")].filter((node) =>
      node instanceof HTMLAnchorElement && normalizeHrefPath(node) === entry.hrefPath,
    );
    return matches[0] ?? null;
  }

  const main = document.querySelector("main");
  if (!main) return null;
  if (entry.kind === "page") return main.querySelector("h1,h2,h3");
  if (entry.kind === "heading") {
    const selector = entry.domSelector === "h1" || entry.domSelector === "h2" || entry.domSelector === "h3"
      ? entry.domSelector
      : "h1,h2,h3";
    return nthElement(main.querySelectorAll(selector), entry.ordinal);
  }
  if (entry.kind === "link" && entry.hrefPath) {
    const matches = [...main.querySelectorAll("a[href]")].filter((node) =>
      node instanceof HTMLAnchorElement && normalizeHrefPath(node) === entry.hrefPath,
    );
    return matches[Math.max(0, (entry.ordinal ?? 1) - 1)] ?? null;
  }
  return null;
}

function MarkerButtons({
  slot,
  onOpen,
}: {
  slot: MarkerSlot;
  onOpen: (kind: "what" | "why", text: string, rect: DOMRect) => void;
}) {
  const base =
    "inline-flex h-[17px] w-[17px] items-center justify-center rounded-full border bg-white text-[9px] font-extrabold leading-none shadow-[0_1px_3px_rgba(15,23,42,0.10)] transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#3b6ef8]/20";

  function open(kind: "what" | "why", text: string) {
    onOpen(kind, text, slot.host.getBoundingClientRect());
  }

  return (
    <>
      {slot.entry.what ? (
        <button
          type="button"
          aria-label="What is it?"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            open("what", slot.entry.what!);
          }}
          className={`${base} border-[#b8c8ff] text-[#3b6ef8]`}
        >
          i
        </button>
      ) : null}
      {slot.entry.why ? (
        <button
          type="button"
          aria-label="Why is it useful?"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            open("why", slot.entry.why!);
          }}
          className={`${base} border-[#d6c8ff] text-[#7047e8]`}
        >
          ?
        </button>
      ) : null}
    </>
  );
}

export const ARCTOR_HELP_POPUP_MOBILE_HOTFIX_V1 =
  "ARCTOR_HELP_POPUP_MOBILE_HOTFIX_V1" as const;

export function GlobalHelpLayer() {
  const pathnameRaw = usePathname();
  const pathname =
    pathnameRaw === "/" ? "/" : pathnameRaw.replace(/\/+$/, "") || "/";
  const [locale, setLocale] = useState<LocaleCode>("en");
  const [entries, setEntries] = useState<HelpEntry[]>([]);
  const [slots, setSlots] = useState<MarkerSlot[]>([]);
  const [active, setActive] = useState<ActiveHelp | null>(null);

  useEffect(() => {
    function syncLocale() {
      setLocale(currentLocale());
    }
    const timer = window.setTimeout(syncLocale, 0);
    window.addEventListener("popstate", syncLocale);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", syncLocale);
    };
  }, [pathname]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch(
          `/api/help?pathname=${encodeURIComponent(pathname)}&locale=${encodeURIComponent(locale)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as {
          entries?: HelpEntry[];
        };
        if (alive) setEntries(Array.isArray(payload.entries) ? payload.entries : []);
      } catch {
        if (alive) setEntries([]);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [pathname, locale]);

  useEffect(() => {
    let frame = 0;

    function sync() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const existingHosts = [
          ...document.querySelectorAll("[data-arctor-help-host]"),
        ].filter((node): node is HTMLElement => node instanceof HTMLElement);

        if (entries.length === 0) {
          for (const host of existingHosts) host.remove();
          setSlots((current) => (current.length === 0 ? current : []));
          return;
        }

        const next: MarkerSlot[] = [];
        const retainedHosts = new Set<HTMLElement>();

        for (const entry of entries) {
          // The API returns registry metadata for the matched route pattern.
          // Locate by semantic metadata/ordinal rather than reconstructing a
          // key from the concrete URL, so dynamic routes such as /offers/[id]
          // work for /offers/<uuid> as well.
          const target = findTargetForEntry(entry);
          if (!target || !target.isConnected) continue;
          const host = createHost(target, entry.helpKey);
          retainedHosts.add(host);
          next.push({ helpKey: entry.helpKey, host, entry });
        }

        // Reconcile in place: keep every still-valid host mounted so dashboard
        // hydration/data mutations cannot make help markers blink. Remove only
        // hosts that are no longer attached to a current target (for example,
        // a hidden desktop nav after the mobile drawer becomes active).
        for (const host of existingHosts) {
          if (!retainedHosts.has(host) && host.isConnected) host.remove();
        }

        setSlots((current) => {
          if (
            current.length === next.length &&
            current.every(
              (slot, index) =>
                slot.helpKey === next[index]?.helpKey &&
                slot.host === next[index]?.host &&
                slot.entry === next[index]?.entry,
            )
          ) {
            return current;
          }
          return next;
        });
      });
    }

    sync();
    window.addEventListener("arctor:help-rescan", sync);

    function isHelpHostMutation(mutation: MutationRecord) {
      if (
        mutation.target instanceof Element &&
        mutation.target.closest("[data-arctor-help-host]")
      ) {
        return true;
      }
      const changedNodes = [...mutation.addedNodes, ...mutation.removedNodes];
      return (
        changedNodes.length > 0 &&
        changedNodes.every(
          (node) =>
            node instanceof Element &&
            (node.matches("[data-arctor-help-host]") ||
              Boolean(node.closest("[data-arctor-help-host]"))),
        )
      );
    }

    const observer = new MutationObserver((mutations) => {
      if (mutations.every(isHelpHostMutation)) return;
      sync();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("arctor:help-rescan", sync);
      document
        .querySelectorAll("[data-arctor-help-host]")
        .forEach((node) => node.remove());
    };
  }, [entries, pathname]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setActive(null);
    }

    function closeFromOutside(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-arctor-help-dialog]")) return;
      if (target.closest("[data-arctor-help-host]")) return;
      setActive(null);
    }

    const closeOnResize = () => setActive(null);
    window.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeFromOutside);
    window.addEventListener("resize", closeOnResize);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeFromOutside);
      window.removeEventListener("resize", closeOnResize);
    };
  }, []);

  const copy = TITLES[locale] ?? TITLES.en;
  const desktopStyle = useMemo(() => {
    if (!active) return {};
    const width = 360;
    const maxHeight = Math.max(160, Math.min(480, window.innerHeight - 24));
    const left = Math.min(
      Math.max(12, active.rect.left),
      Math.max(12, window.innerWidth - width - 12),
    );
    const top = Math.max(
      12,
      Math.min(active.rect.bottom + 8, window.innerHeight - maxHeight - 12),
    );
    return { left, top, width, maxHeight };
  }, [active]);

  return (
    <>
      {slots.map((slot) =>
        createPortal(
          <MarkerButtons
            key={slot.helpKey}
            slot={slot}
            onOpen={(kind, text, rect) => setActive({ kind, text, rect })}
          />,
          slot.host,
        ),
      )}

      {active ? (
        <>
          <button
            type="button"
            aria-label={copy.close}
            onClick={() => setActive(null)}
            className="fixed inset-0 z-[89] bg-[#0f172a]/25 backdrop-blur-[1px] md:hidden"
          />
          <section
            data-arctor-help-dialog="true"
            role="dialog"
            aria-modal="true"
            className="fixed inset-x-3 bottom-3 z-[90] max-h-[calc(100dvh-24px)] touch-pan-y overflow-y-auto overscroll-contain rounded-[22px] border border-[rgba(0,0,0,0.08)] bg-white p-5 shadow-[0_22px_65px_rgba(15,23,42,0.24)] md:inset-x-auto md:bottom-auto md:max-h-none md:rounded-2xl"
            style={typeof window !== "undefined" && window.innerWidth >= 768 ? desktopStyle : undefined}
          >
            <div className="flex items-start gap-3">
              <span className={active.kind === "what"
                ? "flex h-7 w-7 flex-none items-center justify-center rounded-full border border-[#b8c8ff] bg-[#eef2ff] text-xs font-extrabold text-[#3b6ef8]"
                : "flex h-7 w-7 flex-none items-center justify-center rounded-full border border-[#d6c8ff] bg-[#f3efff] text-xs font-extrabold text-[#7047e8]"}>
                {active.kind === "what" ? "i" : "?"}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-extrabold text-[#1a1d2e]">
                  {active.kind === "what" ? copy.what : copy.why}
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5a5f7a]">
                  {active.text}
                </p>
              </div>
              <button type="button" onClick={() => setActive(null)} aria-label={copy.close} className="flex h-8 w-8 flex-none items-center justify-center rounded-xl text-[#7c8099] hover:bg-[#f5f6fb]">
                <X size={16} />
              </button>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
