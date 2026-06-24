"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Languages } from "lucide-react";

import {
  LOCALE_META,
  getCommonMessage,
  getLocaleSearchParam,
  type LocaleCode,
} from "@/i18n";

export const UI_PHASE20C_05_R1_LANGUAGE_SWITCHER_UX_REPAIR =
  "UI_PHASE20C_05_R1_LANGUAGE_SWITCHER_UX_REPAIR" as const;

const VISIBLE_LANGUAGE_SWITCHER_LOCALES = [
  "en",
  "pl",
  "es",
  "uk",
  "de",
  "cs",
] as const satisfies readonly LocaleCode[];

const LANGUAGE_SWITCHER_FLAGS: Record<
  (typeof VISIBLE_LANGUAGE_SWITCHER_LOCALES)[number],
  string
> = {
  en: "🇬🇧",
  pl: "🇵🇱",
  es: "🇪🇸",
  uk: "🇺🇦",
  de: "🇩🇪",
  cs: "🇨🇿",
};

function readLocaleFromWindow(): LocaleCode {
  if (typeof window === "undefined") {
    return "en";
  }

  return getLocaleSearchParam(new URLSearchParams(window.location.search));
}

function navigateToLocale(locale: LocaleCode): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("locale", locale);
  url.searchParams.delete("lang");

  window.location.assign(url.toString());
}

function getVisibleFlag(locale: LocaleCode): string {
  if (locale === "ru") {
    return "🌐";
  }

  if (locale in LANGUAGE_SWITCHER_FLAGS) {
    return LANGUAGE_SWITCHER_FLAGS[
      locale as keyof typeof LANGUAGE_SWITCHER_FLAGS
    ];
  }

  return "🌐";
}

export function InterfaceLanguageSwitcher() {
  const [selectedLocale, setSelectedLocale] = useState<LocaleCode>("en");
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function syncLocaleFromUrl() {
      setSelectedLocale(readLocaleFromWindow());
    }

    syncLocaleFromUrl();
    window.addEventListener("popstate", syncLocaleFromUrl);

    return () => {
      window.removeEventListener("popstate", syncLocaleFromUrl);
    };
  }, []);

  useEffect(() => {
    function handleDocumentMouseDown(event: MouseEvent) {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, []);

  const label = useMemo(
    () => getCommonMessage("common.interfaceLanguage", selectedLocale),
    [selectedLocale],
  );

  const currentNativeName = LOCALE_META[selectedLocale]?.nativeName ?? selectedLocale.toUpperCase();
  const currentFlag = getVisibleFlag(selectedLocale);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setIsOpen((value) => !value)}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e4e7f2] bg-white px-2.5 text-[12px] font-semibold text-[#4a4f6a] shadow-sm transition-colors hover:border-[#cfd6ee] hover:bg-[#f8f9fd]"
      >
        <Languages size={14} className="text-[#7c8099]" />
        <span aria-hidden="true" className="text-[15px] leading-none">
          {currentFlag}
        </span>
        <span className="hidden max-w-[72px] truncate sm:inline">
          {selectedLocale === "ru" ? "RU" : currentNativeName}
        </span>
        <ChevronDown size={13} className="text-[#9ca3b8]" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-[#e4e7f2] bg-white py-1.5 shadow-lg">
          {VISIBLE_LANGUAGE_SWITCHER_LOCALES.map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => {
                setIsOpen(false);
                setSelectedLocale(locale);
                navigateToLocale(locale);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-semibold transition-colors ${
                selectedLocale === locale
                  ? "bg-[#eef2ff] text-[#3b6ef8]"
                  : "text-[#4a4f6a] hover:bg-[#f8f9fd] hover:text-[#1a1d2e]"
              }`}
            >
              <span className="text-[16px] leading-none" aria-hidden="true">
                {LANGUAGE_SWITCHER_FLAGS[locale]}
              </span>
              <span className="flex-1 truncate">
                {LOCALE_META[locale].nativeName}
              </span>
              <span className="text-[10px] uppercase text-[#9ca3b8]">
                {locale}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
