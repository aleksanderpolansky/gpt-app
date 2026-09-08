import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { ActualValueObjectsList } from "@/components/workspace/value-objects/actual-value-objects-list";
import { getLocaleSearchParam } from "@/i18n";

export const metadata: Metadata = {
  title: "Observation objects | AI Navigator",
  description: "Global system and active-profile observation objects.",
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

const CREATE_SUPER_OFFER_LABELS: Record<string, string> = {
  en: "Add super offer",
  pl: "Dodaj superofertę",
  ru: "Добавить суперпредложение",
  uk: "Додати суперпропозицію",
  de: "Superangebot hinzufügen",
  es: "Añadir superoferta",
  cs: "Přidat supernabídku",
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
  const superOfferHref = buildLocaleAwareHref("/offers/new", locale);
  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#f0f2f7] p-5 text-[#1a1d2e]">
      <div className="grid min-w-0 w-full gap-5">
        <div className="flex flex-wrap justify-end gap-2">
          <Link
            href={createRootHref}
            className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-2 text-[13px] font-semibold text-[#4a4f6a] shadow-sm transition-all hover:bg-[#f5f6fb]"
          >
            {CREATE_ROOT_LABELS[locale] ?? CREATE_ROOT_LABELS.en}
          </Link>
          <Link
            href={superOfferHref}
            className="flex items-center gap-1.5 rounded-xl border border-[#22c55e]/35 bg-[#ecfdf3] px-4 py-2 text-[13px] font-semibold text-[#16a34a] shadow-sm transition-all hover:bg-[#dcfce7]"
          >
            <Plus size={14} />
            {CREATE_SUPER_OFFER_LABELS[locale] ??
              CREATE_SUPER_OFFER_LABELS.en}
          </Link>
        </div>

        <ActualValueObjectsList />
      </div>
    </main>
  );
}
