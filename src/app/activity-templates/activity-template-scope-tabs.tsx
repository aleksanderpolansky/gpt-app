"use client";

import Link from "next/link";

type LocaleCode =
  | "en"
  | "pl"
  | "ru"
  | "uk"
  | "de"
  | "es"
  | "cs";

type ScopeCode =
  | "user"
  | "system";

type Copy = {
  user: string;
  system: string;
};

const COPY: Record<LocaleCode, Copy> = {
  ru: {
    user: "Мои типовые активности",
    system: "Системные типовые активности",
  },
  uk: {
    user: "Мої типові активності",
    system: "Системні типові активності",
  },
  pl: {
    user: "Moje aktywności typowe",
    system: "Systemowe aktywności typowe",
  },
  en: {
    user: "My typical activities",
    system: "System typical activities",
  },
  de: {
    user: "Meine typischen Aktivitäten",
    system: "Systemische typische Aktivitäten",
  },
  es: {
    user: "Mis actividades típicas",
    system: "Actividades típicas del sistema",
  },
  cs: {
    user: "Moje typické aktivity",
    system: "Systémové typické aktivity",
  },
};

export function ActivityTemplateScopeTabs({
  locale,
  scope,
}: {
  locale: LocaleCode;
  scope: ScopeCode;
}) {
  const copy =
    COPY[locale] ??
    COPY.en;

  function tabClass(
    target: ScopeCode,
  ) {
    return [
      "rounded-xl px-4 py-2 text-[13px] font-semibold transition",
      scope === target
        ? "bg-[#3b6ef8] text-white shadow-sm"
        : "text-[#44506a] hover:bg-slate-50",
    ].join(" ");
  }

  return (
    <div className="mx-auto mb-4 w-full max-w-[1120px]">
      <div className="inline-flex rounded-[18px] border border-black/[0.08] bg-white p-1 shadow-sm">
        <Link
          href={`/activity-templates?scope=user&locale=${locale}`}
          className={tabClass("user")}
        >
          {copy.user}
        </Link>

        <Link
          href={`/activity-templates?scope=system&locale=${locale}`}
          className={tabClass("system")}
        >
          {copy.system}
        </Link>
      </div>
    </div>
  );
}