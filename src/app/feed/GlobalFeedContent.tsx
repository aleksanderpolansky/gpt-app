import { Suspense } from "react";
import Link from "next/link";

import type { LocaleCode } from "@/i18n";
import HidePublicationButton from "@/components/messages/HidePublicationButton";
import PublicationComments from "@/components/messages/PublicationComments";
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

function buildProfileHref(item: GlobalArctorFeedItem, locale: LocaleCode) {
  if (!item.author.publicSlug) return null;

  const pathname =
    item.author.kind === "organization"
      ? `/directory/${encodeURIComponent(item.author.publicSlug)}`
      : `/people/${encodeURIComponent(item.author.publicSlug)}`;

  return locale === "en"
    ? pathname
    : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function initials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }

  return (value.trim().slice(0, 2) || "?").toUpperCase();
}

function GlobalFeedItemCard({
  item,
  locale,
  contentText,
  pendingLabel,
  personalizationMode,
}: {
  item: GlobalArctorFeedItem;
  locale: LocaleCode;
  contentText: string | null;
  pendingLabel?: string;
  personalizationMode?: "hide" | "restore" | null;
}) {
  const copy = getGlobalFeedCopy(locale);
  const profileHref = buildProfileHref(item, locale);

  return (
    <article
      data-feed-message-object-id={item.id}
      className="rounded-2xl border border-[#e4e8f2] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:px-5"
    >
      <div className="flex items-start gap-3">
        {profileHref ? (
          <Link
            href={profileHref}
            aria-label={copy.openProfile}
            className="flex-shrink-0"
          >
            {item.author.imageUrl ? (
              // Same-origin profile/logo delivery or public profile media URL.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.author.imageUrl}
                alt=""
                className="h-10 w-10 rounded-xl border border-[#e4e8f2] bg-[#f7f8fc] object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e4e8f2] bg-[#eef2ff] text-[11px] font-bold text-[#3b6ef8]">
                {initials(item.author.displayName)}
              </span>
            )}
          </Link>
        ) : (
          <span className="flex-shrink-0" aria-hidden="true">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e4e8f2] bg-[#eef2ff] text-[11px] font-bold text-[#3b6ef8]">
              {initials(item.author.displayName)}
            </span>
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                {profileHref ? (
                  <Link
                    href={profileHref}
                    className="min-w-0 truncate text-[13px] font-semibold text-[#30354d] transition-colors hover:text-[#3b6ef8]"
                  >
                    {item.author.displayName}
                  </Link>
                ) : (
                  <span className="min-w-0 truncate text-[13px] font-semibold text-[#30354d]">
                    {item.author.displayName}
                  </span>
                )}
                <span className="text-[10px] font-medium text-[#7f8db6]">
                  {copy.sourceLabel}
                </span>
                <span className="text-[10px] text-[#a7adbd]">
                  {formatPublishedAt(item.publishedAt, locale)}
                </span>
              </div>
            </div>

            {personalizationMode ? (
              <HidePublicationButton
                messageObjectId={item.id}
                locale={locale}
                mode={personalizationMode}
              />
            ) : null}
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

          <PublicationComments
            messageObjectId={item.id}
            locale={locale}
            initialCount={item.commentCount}
          />
        </div>
      </div>
    </article>
  );
}

async function PendingGlobalFeedItem({
  item,
  locale,
  localizationPromise,
  personalizationMode,
}: {
  item: GlobalArctorFeedItem;
  locale: LocaleCode;
  localizationPromise: Promise<Map<string, string>>;
  personalizationMode?: "hide" | "restore" | null;
}) {
  const localizedById = await localizationPromise;

  return (
    <GlobalFeedItemCard
      item={item}
      locale={locale}
      contentText={localizedById.get(item.id) ?? item.sourceContentText}
      personalizationMode={personalizationMode}
    />
  );
}

export default async function GlobalFeedContent({
  locale,
  hiddenMessageObjectIds = [],
  mode = "feed",
  canPersonalize = false,
  emptyLabel,
}: {
  locale: LocaleCode;
  hiddenMessageObjectIds?: string[];
  mode?: "feed" | "hidden";
  canPersonalize?: boolean;
  emptyLabel?: string;
}) {
  const copy = getGlobalFeedCopy(locale);
  const result = await getGlobalArctorFeed({
    locale,
    limit: mode === "hidden" ? 50 : 30,
    excludeMessageObjectIds:
      mode === "feed" ? hiddenMessageObjectIds : undefined,
    includeOnlyMessageObjectIds:
      mode === "hidden" ? hiddenMessageObjectIds : undefined,
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
        {emptyLabel ?? copy.empty}
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
  const personalizationMode =
    canPersonalize ? (mode === "hidden" ? "restore" : "hide") : null;

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
              personalizationMode={personalizationMode}
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
                personalizationMode={personalizationMode}
              />
            }
          >
            <PendingGlobalFeedItem
              item={item}
              locale={locale}
              localizationPromise={localizationPromise}
              personalizationMode={personalizationMode}
            />
          </Suspense>
        );
      })}
    </div>
  );
}
