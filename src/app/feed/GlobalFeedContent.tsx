import { Suspense } from "react";
import Link from "next/link";

import type { LocaleCode } from "@/i18n";
import {
  getGlobalArctorFeed,
  localizeGlobalArctorFeedItems,
  readCachedGlobalArctorFeedItemContent,
  type GlobalArctorFeedItem,
} from "@/lib/messages/globalFeed.server";
import { getGlobalFeedCopy } from "./feedCopy";

const INTL_LOCALE: Record<LocaleCode, string> = {
  en: "en-GB",
  pl: "pl-PL",
  ru: "ru-RU",
  uk: "uk-UA",
  de: "de-DE",
  es: "es-ES",
  cs: "cs-CZ",
};

function formatPublishedAt(value: string, locale: LocaleCode) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function buildProfileHref(publicSlug: string, locale: LocaleCode) {
  const pathname = `/directory/${encodeURIComponent(publicSlug)}`;

  return locale === "en"
    ? pathname
    : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function GlobalFeedItemCard({
  item,
  locale,
  contentText,
  pendingLabel,
}: {
  item: GlobalArctorFeedItem;
  locale: LocaleCode;
  contentText: string | null;
  pendingLabel?: string;
}) {
  const copy = getGlobalFeedCopy(locale);
  const profileHref = buildProfileHref(item.author.publicSlug, locale);

  return (
    <article className="rounded-2xl border border-[#e4e8f2] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:px-5">
      <div className="flex items-start gap-3">
        <Link
          href={profileHref}
          aria-label={copy.openProfile}
          className="flex-shrink-0"
        >
          {/* Directory logo endpoint is a same-origin versioned public-media delivery route. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.author.logoUrl}
            alt=""
            className="h-10 w-10 rounded-xl border border-[#e4e8f2] bg-[#f7f8fc] object-cover"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <Link
              href={profileHref}
              className="min-w-0 truncate text-[13px] font-semibold text-[#30354d] transition-colors hover:text-[#3b6ef8]"
            >
              {item.author.organizationName}
            </Link>
            <span className="text-[10px] font-medium text-[#7f8db6]">
              {copy.sourceLabel}
            </span>
            <span className="text-[10px] text-[#a7adbd]">
              {formatPublishedAt(item.publishedAt, locale)}
            </span>
          </div>

          {pendingLabel ? (
            <p className="mt-2 text-[12px] leading-6 text-[#a4a9bd]">
              {pendingLabel}
            </p>
          ) : contentText ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-6 text-[#555b73]">
              {contentText}
            </p>
          ) : null}

          {item.image ? (
            <div className="mt-3 flex justify-center overflow-hidden rounded-xl border border-[#e7eaf4] bg-[#f8f9fd]">
              {/* Direct public Storage/CDN URL, not Next Image/Vercel proxy. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image.url}
                alt=""
                loading="lazy"
                decoding="async"
                className="max-h-[420px] w-full object-contain"
              />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

async function PendingGlobalFeedItem({
  item,
  locale,
  localizationPromise,
}: {
  item: GlobalArctorFeedItem;
  locale: LocaleCode;
  localizationPromise: Promise<Map<string, string>>;
}) {
  const localizedById = await localizationPromise;

  return (
    <GlobalFeedItemCard
      item={item}
      locale={locale}
      contentText={
        localizedById.get(item.id) ?? item.sourceContentText
      }
    />
  );
}

export default async function GlobalFeedContent({
  locale,
}: {
  locale: LocaleCode;
}) {
  const copy = getGlobalFeedCopy(locale);
  const result = await getGlobalArctorFeed({
    locale,
    limit: 30,
  });

  if (result.errorMessage) {
    return (
      <div className="rounded-2xl border border-[#f3c7c7] bg-[#fff7f7] px-4 py-4 text-[12px] leading-5 text-[#b42318]">
        {copy.loadError}
      </div>
    );
  }

  if (result.items.length === 0) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-[#e4e8f2] bg-white px-6 text-center text-[13px] text-[#9ca3b8]">
        {copy.empty}
      </div>
    );
  }

  const cachedContentById = new Map<string, string>();
  const pendingItems: GlobalArctorFeedItem[] = [];

  for (const item of result.items) {
    const cached = readCachedGlobalArctorFeedItemContent({
      locale,
      item,
    });

    if (cached) {
      cachedContentById.set(item.id, cached);
    } else if (item.sourceContentText) {
      pendingItems.push(item);
    }
  }

  const pendingIds = new Set(pendingItems.map((item) => item.id));
  const localizationPromise =
    pendingItems.length > 0
      ? localizeGlobalArctorFeedItems({
          locale,
          items: pendingItems,
        })
      : Promise.resolve(new Map<string, string>());

  return (
    <div className="space-y-3">
      {result.items.map((item) => {
        const cached = cachedContentById.get(item.id);

        if (cached || !pendingIds.has(item.id)) {
          return (
            <GlobalFeedItemCard
              key={item.id}
              item={item}
              locale={locale}
              contentText={cached ?? item.sourceContentText}
            />
          );
        }

        return (
          <Suspense
            key={item.id}
            fallback={
              <GlobalFeedItemCard
                item={item}
                locale={locale}
                contentText={null}
                pendingLabel={copy.translating}
              />
            }
          >
            <PendingGlobalFeedItem
              item={item}
              locale={locale}
              localizationPromise={localizationPromise}
            />
          </Suspense>
        );
      })}
    </div>
  );
}
