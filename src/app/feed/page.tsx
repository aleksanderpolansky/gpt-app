import AiChannels from "./AiChannels";
import SemanticFeedFilters from "./SemanticFeedFilters";
import SavedFeedSearchTabs from "./SavedFeedSearchTabs";
import { Suspense } from "react";
import { LoaderCircle } from "lucide-react";

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
  money?: string | string[];
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

const CHANNELS_LABEL: Record<LocaleCode, string> = {
  en: "AI channels", pl: "Kanały AI", ru: "ИИ-каналы", uk: "ШІ-канали",
  de: "KI-Kanäle", es: "Canales de IA", cs: "AI kanály",
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
    params.on, params.money, params.metric, params.parameter,
    params.min, params.max, params.unit,
  ].some((value) => value !== undefined);
  const semanticQuery: SemanticFeedQueryF31 | undefined = semanticRequested
    ? {
        objectIds: firstSearchParam(params.on),
        metricObjectId: firstSearchParam(params.metric),
        money: firstSearchParam(params.money),
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
      <section className="mx-auto w-full max-w-[760px]">
        <header className="mb-4 rounded-2xl border border-[#e2e6f0] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:px-5">
          <h1 className="text-[18px] font-bold tracking-[-0.01em] text-[#1f2438]">
            {copy.title}
          </h1>
          <p className="mt-1 text-[12px] leading-5 text-[#7c8099]">
            {copy.subtitle}
          </p>
        </header>

        <SavedFeedSearchTabs
          locale={locale}
          enabled={Boolean(viewer)}
          activeFilters={{
            on: firstSearchParam(params.on) ?? "",
            metric: firstSearchParam(params.metric) ?? "",
            money: firstSearchParam(params.money) ?? "",
            parameter: firstSearchParam(params.parameter) ?? "",
            min: firstSearchParam(params.min) ?? "",
            max: firstSearchParam(params.max) ?? "",
            unit: firstSearchParam(params.unit) ?? "",
          }}
        />

        <SemanticFeedFilters
          key={`${locale}:${firstSearchParam(params.money) ?? ""}:${firstSearchParam(params.on) ?? ""}:${firstSearchParam(params.metric) ?? ""}:${firstSearchParam(params.parameter) ?? ""}:${firstSearchParam(params.min) ?? ""}:${firstSearchParam(params.max) ?? ""}:${firstSearchParam(params.unit) ?? ""}`}
          locale={locale}
          initialObjectIds={firstSearchParam(params.on) ?? ""}
          hasLegacyMetric={Boolean(params.metric)}
          initialMoney={firstSearchParam(params.money) === "1"}
          initialMetric={{
            metric: firstSearchParam(params.metric),
            parameter: firstSearchParam(params.parameter),
            min: firstSearchParam(params.min),
            max: firstSearchParam(params.max),
            unit: firstSearchParam(params.unit),
          }}
        />


        <details className="mb-3 rounded-2xl border border-[#e2e6f0] bg-white px-4 py-3 text-[#334155] group">
          <summary className="cursor-pointer select-none text-[12px] font-semibold focus-visible:outline-2 focus-visible:outline-[#3b6ef8]">
            {CHANNELS_LABEL[locale]}
          </summary>
          <div className="mt-3 border-t border-[#e9edf5] pt-3">
            <AiChannels locale={locale} />
          </div>
        </details>

        {viewer && authorOptions.length > 0 ? (
          <UserPublicationComposer
            locale={locale}
            authorOptions={authorOptions}
            defaultAuthorActorId={viewer.actorId}
          />
        ) : null}

        <Suspense
          fallback={
            <div role="status" aria-live="polite" className="flex min-h-[180px] items-center justify-center gap-2 rounded-2xl border border-[#e4e8f2] bg-white px-6 text-center text-[12px] text-[#9ca3b8]">
              <LoaderCircle className="h-4 w-4 animate-spin text-[#3b6ef8]" aria-hidden="true" /> {copy.loading}
            </div>
          }
        >
          <GlobalFeedContent
            locale={locale}
            hiddenMessageObjectIds={viewer?.hiddenMessageObjectIds ?? []}
            canPersonalize={Boolean(viewer)}
            viewerOwnerUserId={viewer?.ownerUserId ?? null}
            semanticQuery={semanticQuery}
          />
        </Suspense>
      </section>
    </div>
  );
}
