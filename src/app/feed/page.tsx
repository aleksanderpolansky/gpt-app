import Link from "next/link";
import AiChannels from "./AiChannels";
import { Suspense } from "react";

import { normalizeLocale, type LocaleCode } from "@/i18n";
import type { SemanticFeedQueryF31 } from "@/lib/messages/semanticFeedSearchF31.server";
import { getCurrentFeedViewerState } from "@/lib/messages/feedViewerPreferences.server";
import { getPublicationAuthorOptionsForUser } from "@/lib/messages/publicationAuthors.server";
import GlobalFeedContent from "./GlobalFeedContent";
import UserPublicationComposer from "./UserPublicationComposer";
import { getGlobalFeedCopy } from "./feedCopy";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type FeedSearchParams = {
  locale?: string | string[];
  lang?: string | string[];
  on?: string | string[];
  metric?: string | string[];
  parameter?: string | string[];
  min?: string | string[];
  max?: string | string[];
  unit?: string | string[];
};

type FeedPageProps = {
  searchParams: Promise<FeedSearchParams>;
};

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const SEMANTIC_BANNER: Record<LocaleCode, { label: string; reset: string }> = {
  en: { label: "Semantic search: up to 20 matching ARCTor publications", reset: "Show all" },
  pl: { label: "Wyszukiwanie semantyczne: do 20 najnowszych pasujących publikacji ARCTor", reset: "Pokaż wszystkie" },
  ru: { label: "Смысловой поиск: до 20 последних подходящих публикаций ARCTor", reset: "Показать все" },
  uk: { label: "Смисловий пошук: до 20 останніх відповідних публікацій ARCTor", reset: "Показати всі" },
  de: { label: "Semantische Suche: bis zu 20 letzte passende ARCTor-Beiträge", reset: "Alle anzeigen" },
  es: { label: "Búsqueda semántica: hasta 20 publicaciones coincidentes recientes de ARCTor", reset: "Mostrar todas" },
  cs: { label: "Sémantické hledání: až 20 nejnovějších odpovídajících příspěvků ARCTor", reset: "Zobrazit vše" },
};

export default async function GlobalFeedPage({
  searchParams,
}: FeedPageProps) {
  const params = await searchParams;
  const locale = normalizeLocale(
    firstSearchParam(params.locale) ?? firstSearchParam(params.lang),
  );
  const copy = getGlobalFeedCopy(locale);
  // F3.1B pilot: optional URL filter only. Ordinary /feed remains unchanged.
  const semanticRequested = [
    params.on, params.metric, params.parameter,
    params.min, params.max, params.unit,
  ].some((value) => value !== undefined);
  const semanticQuery: SemanticFeedQueryF31 | undefined = semanticRequested
    ? {
        objectIds: firstSearchParam(params.on),
        metricObjectId: firstSearchParam(params.metric),
        parameterId: firstSearchParam(params.parameter),
        min: firstSearchParam(params.min),
        max: firstSearchParam(params.max),
        unit: firstSearchParam(params.unit),
      }
    : undefined;
  const viewer = await getCurrentFeedViewerState();
  const authorOptions = viewer
    ? await getPublicationAuthorOptionsForUser(viewer.ownerUserId)
    : [];

  return (
    <div className="min-h-full px-3 py-4 sm:px-5 sm:py-5">
      <section className="mx-auto w-full max-w-[860px]">
        <header className="mb-4 rounded-2xl border border-[#e2e6f0] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:px-5">
          <h1 className="text-[18px] font-bold tracking-[-0.01em] text-[#1f2438]">
            {copy.title}
          </h1>
          <p className="mt-1 text-[12px] leading-5 text-[#7c8099]">
            {copy.subtitle}
          </p>
        </header>

        {semanticRequested ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#cbd5e1] bg-white px-4 py-3 text-[12px] text-[#334155]" role="status">
            <span>{SEMANTIC_BANNER[locale].label}</span>
            <Link className="font-semibold text-[#3b6ef8] hover:underline" href={locale === "en" ? "/feed" : `/feed?locale=${encodeURIComponent(locale)}`}>
              {SEMANTIC_BANNER[locale].reset}
            </Link>
          </div>
        ) : null}

        <AiChannels locale={locale} />

        {viewer && authorOptions.length > 0 ? (
          <UserPublicationComposer
            locale={locale}
            authorOptions={authorOptions}
            defaultAuthorActorId={viewer.actorId}
          />
        ) : null}

        <Suspense
          fallback={
            <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-[#e4e8f2] bg-white px-6 text-center text-[12px] text-[#9ca3b8]">
              {copy.loading}
            </div>
          }
        >
          <GlobalFeedContent
            locale={locale}
            hiddenMessageObjectIds={viewer?.hiddenMessageObjectIds ?? []}
            canPersonalize={Boolean(viewer)}
            semanticQuery={semanticQuery}
          />
        </Suspense>
      </section>
    </div>
  );
}
