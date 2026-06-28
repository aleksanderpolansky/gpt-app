"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getLocaleSearchParam,
  getMessage,
  type LocaleCode,
} from "@/i18n";

export type SemanticCloudButtonProps = {
  readonly isOpen: boolean;
  readonly isLoading?: boolean;
  readonly onClick: () => void;
};

type SemanticCloudMessageKey =
  | "semanticCloud.ariaLabel"
  | "semanticCloud.fullLabel"
  | "semanticCloud.shortLabel";

const semanticCloudMessages: Record<
  SemanticCloudMessageKey,
  Record<LocaleCode, string>
> = {
  "semanticCloud.ariaLabel": {
    ru: "Открыть публичное облако семантических категорий",
    pl: "Otwórz publiczną chmurę kategorii semantycznych",
    en: "Open public semantic category cloud",
    es: "Abrir la nube pública de categorías semánticas",
    uk: "Відкрити публічну хмару семантичних категорій",
    de: "Öffentliche semantische Kategorienwolke öffnen",
    cs: "Otevřít veřejný sémantický oblak kategorií",
  },
  "semanticCloud.fullLabel": {
    ru: "Облако категорий",
    pl: "Chmura kategorii",
    en: "Category cloud",
    es: "Nube de categorías",
    uk: "Хмара категорій",
    de: "Kategorienwolke",
    cs: "Oblak kategorií",
  },
  "semanticCloud.shortLabel": {
    ru: "Облако",
    pl: "Chmura",
    en: "Cloud",
    es: "Nube",
    uk: "Хмара",
    de: "Wolke",
    cs: "Oblak",
  },
};

function useInterfaceLocale(): LocaleCode {
  const [locale, setLocale] = useState<LocaleCode>("en");

  useEffect(() => {
    function readLocaleFromUrl() {
      if (typeof window === "undefined") {
        return;
      }

      setLocale(getLocaleSearchParam(new URLSearchParams(window.location.search)));
    }

    readLocaleFromUrl();
    window.addEventListener("popstate", readLocaleFromUrl);

    return () => {
      window.removeEventListener("popstate", readLocaleFromUrl);
    };
  }, []);

  return locale;
}

export function SemanticCloudButton({
  isOpen,
  isLoading = false,
  onClick,
}: SemanticCloudButtonProps) {
  const locale = useInterfaceLocale();
  const t = useMemo(
    () => (key: SemanticCloudMessageKey) =>
      getMessage(semanticCloudMessages, key, locale),
    [locale],
  );

  return (
    <button
      type="button"
      aria-label={t("semanticCloud.ariaLabel")}
      aria-expanded={isOpen}
      disabled={isLoading}
      onClick={onClick}
      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-[rgba(59,110,248,0.18)] bg-[#eef2ff] px-3 text-xs font-semibold text-[#3b6ef8] shadow-sm transition hover:bg-[#e4eaff] disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span aria-hidden="true" className="text-sm leading-none">
        ☁
      </span>
      <span className="hidden whitespace-nowrap xl:inline">
        {t("semanticCloud.fullLabel")}
      </span>
      <span className="whitespace-nowrap xl:hidden">
        {t("semanticCloud.shortLabel")}
      </span>
    </button>
  );
}
