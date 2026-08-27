import { Suspense } from "react";

import { normalizeLocale } from "@/i18n";
import { getCurrentFeedViewerState } from "@/lib/messages/feedViewerPreferences.server";
import GlobalFeedContent from "./GlobalFeedContent";
import UserPublicationComposer from "./UserPublicationComposer";
import { getGlobalFeedCopy } from "./feedCopy";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type FeedSearchParams = {
  locale?: string | string[];
  lang?: string | string[];
};

type FeedPageProps = {
  searchParams: Promise<FeedSearchParams>;
};

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function GlobalFeedPage({
  searchParams,
}: FeedPageProps) {
  const params = await searchParams;
  const locale = normalizeLocale(
    firstSearchParam(params.locale) ?? firstSearchParam(params.lang),
  );
  const copy = getGlobalFeedCopy(locale);
  const viewer = await getCurrentFeedViewerState();

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

        {viewer?.canPublishPublicly ? (
          <UserPublicationComposer
            locale={locale}
            displayName={viewer.displayName}
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
          />
        </Suspense>
      </section>
    </div>
  );
}
