import type { Metadata } from "next";
import Link from "next/link";

import { ActualValueObjectsList } from "@/components/workspace/value-objects/actual-value-objects-list";
import { ValueObjectsPanel } from "@/components/workspace/value-objects/value-objects-panel";
import { getLocaleSearchParam } from "@/i18n";

export const metadata: Metadata = {
  title: "Observation objects | AI Navigator",
  description:
    "Observation object list, tree, cloud, and detail preview.",
};

type ValueObjectsPageProps = {
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
  if (locale === "en") {
    return pathname;
  }

  return `${pathname}?locale=${encodeURIComponent(locale)}`;
}

const CREATE_ROOT_LABELS: Record<string, string> = {
  en: "Create root observation object",
  pl: "Utwórz korzeniowy obiekt obserwacji",
  ru: "Создать корневой объект наблюдения",
  uk: "Створити кореневий об’єкт спостереження",
  de: "Wurzel-Beobachtungsobjekt erstellen",
  es: "Crear objeto raíz de observación",
  cs: "Vytvořit kořenový objekt pozorování",
};

const LEGACY_CREATE_LABELS: Record<string, string> = {
  en: "Legacy Value Object selector",
  pl: "Stary selektor Value Object",
  ru: "Старый селектор Value Object",
  uk: "Старий селектор Value Object",
  de: "Alter Value-Object-Selektor",
  es: "Selector Value Object anterior",
  cs: "Starší selektor Value Object",
};

export default async function ValueObjectsPage({
  searchParams,
}: ValueObjectsPageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getLocaleSearchParam(
    getPageLocaleSearchParams(resolvedSearchParams?.locale),
  );

  const createRootHref = buildLocaleAwareHref(
    "/value-objects/new/root",
    locale,
  );
  const legacyCreateHref = buildLocaleAwareHref("/value-objects/new", locale);

  return (
    <div className="min-h-0">
      <div className="min-w-0">
        <div className="min-h-screen bg-slate-50">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-end gap-2 px-6 pt-6">
            <Link
              href={legacyCreateHref}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {LEGACY_CREATE_LABELS[locale] ?? LEGACY_CREATE_LABELS.en}
            </Link>
            <Link
              href={createRootHref}
              className="rounded-full bg-[#3b6ef8] px-5 py-2 text-sm font-bold text-white shadow-[0_8px_20px_rgba(59,110,248,0.22)] hover:bg-[#315fdc]"
            >
              {CREATE_ROOT_LABELS[locale] ?? CREATE_ROOT_LABELS.en}
            </Link>
          </div>

          <div className="mx-auto max-w-7xl px-6 pt-6">
            <ActualValueObjectsList />
          </div>

          <ValueObjectsPanel />
        </div>
      </div>
    </div>
  );
}
