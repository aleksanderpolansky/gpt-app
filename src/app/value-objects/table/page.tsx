import type { Metadata } from "next";
import Link from "next/link";

import { ActualValueObjectsList } from "@/components/workspace/value-objects/actual-value-objects-list";
import { getLocaleSearchParam } from "@/i18n";

export const metadata: Metadata = {
  title: "Observation objects table | ARCTor.app",
  description: "Standalone full-screen observation object table workspace.",
};

type WorkspacePageProps = {
  readonly searchParams?: Promise<{
    readonly locale?: string | string[];
  }>;
};

function getPageLocaleSearchParams(localeValue: string | string[] | undefined) {
  const locale = Array.isArray(localeValue) ? localeValue[0] : localeValue;
  const searchParams = new URLSearchParams();
  if (locale) {
    searchParams.set("locale", locale);
  }
  return searchParams;
}

function buildLocaleAwareHref(pathname: string, locale: string) {
  return locale === "en"
    ? pathname
    : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

const COPY: Record<
  string,
  { eyebrow: string; title: string; subtitle: string; back: string }
> = {
  en: {
    eyebrow: "Table workspace",
    title: "Observation objects table",
    subtitle: "Full-screen workspace for editing, range copy/paste and future spreadsheet tools.",
    back: "Back to observation objects",
  },
  pl: {
    eyebrow: "Przestrzeń tabeli",
    title: "Tabela obiektów obserwacji",
    subtitle: "Pełnoekranowa przestrzeń do edycji, kopiowania i wklejania zakresów oraz przyszłych narzędzi arkusza.",
    back: "Wróć do obiektów obserwacji",
  },
  ru: {
    eyebrow: "Табличное рабочее пространство",
    title: "Таблица объектов наблюдения",
    subtitle: "Полноэкранная таблица для редактирования, копирования и вставки диапазонов и будущих табличных инструментов.",
    back: "К объектам наблюдения",
  },
  uk: {
    eyebrow: "Табличний робочий простір",
    title: "Таблиця об’єктів спостереження",
    subtitle: "Повноекранна таблиця для редагування, копіювання й вставлення діапазонів та майбутніх табличних інструментів.",
    back: "До об’єктів спостереження",
  },
  de: {
    eyebrow: "Tabellen-Arbeitsbereich",
    title: "Tabelle der Beobachtungsobjekte",
    subtitle: "Vollbild-Arbeitsbereich zum Bearbeiten sowie zum Kopieren und Einfügen von Bereichen.",
    back: "Zurück zu Beobachtungsobjekten",
  },
  es: {
    eyebrow: "Espacio de tabla",
    title: "Tabla de objetos de observación",
    subtitle: "Espacio de pantalla completa para editar y copiar/pegar rangos y futuras herramientas de hoja de cálculo.",
    back: "Volver a objetos de observación",
  },
  cs: {
    eyebrow: "Tabulkový pracovní prostor",
    title: "Tabulka objektů pozorování",
    subtitle: "Pracovní prostor na celou obrazovku pro úpravy, kopírování a vkládání rozsahů a budoucí tabulkové nástroje.",
    back: "Zpět k objektům pozorování",
  },
};

export default async function ValueObjectsTableWorkspacePage({
  searchParams,
}: WorkspacePageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getLocaleSearchParam(
    getPageLocaleSearchParams(resolvedSearchParams?.locale),
  );
  const copy = COPY[locale] ?? COPY.en;
  const backHref = buildLocaleAwareHref("/value-objects", locale);

  return (
    <main className="min-h-screen min-w-0 bg-[#f5f6fb] px-2 py-2 text-[#1a1d2e] sm:px-4 sm:py-3">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-3">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e4e7f2] bg-white px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f76a1]">
              {copy.eyebrow}
            </p>
            <h1 className="mt-1 text-lg font-semibold text-[#111936]">
              {copy.title}
            </h1>
            <p className="mt-1 max-w-4xl text-[12px] text-[#73799d]">
              {copy.subtitle}
            </p>
          </div>
          <Link
            href={backHref}
            className="rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] shadow-sm transition hover:bg-gray-50"
          >
            ← {copy.back}
          </Link>
        </header>

        <ActualValueObjectsList />
      </div>
    </main>
  );
}
