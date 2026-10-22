import { readChannelFeed } from "@/lib/ai-channels/server";
import {
  searchSemanticFeedF31,
  type SemanticFeedQueryF31,
} from "@/lib/messages/semanticFeedSearchF31.server";
import { channelWords } from "@/lib/ai-channels/copy";
import Link from "next/link";

import type { LocaleCode } from "@/i18n";
import HidePublicationButton from "@/components/messages/HidePublicationButton";
import PublicationComments from "@/components/messages/PublicationComments";
import {
  getGlobalArctorFeed,
  readCachedGlobalArctorFeedItemContent,
  type GlobalArctorFeedItem,
} from "@/lib/messages/globalFeed.server";
import AiChannelFeedGroup from "./AiChannelFeedGroup";
import ReaderConvertedText from "@/components/feed/ReaderConvertedText";
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
              <ReaderConvertedText text={contentText} locale={locale} />
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

export default async function GlobalFeedContent({
  locale,
  hiddenMessageObjectIds = [],
  mode = "feed",
  canPersonalize = false,
  emptyLabel,
  semanticQuery,
}: {
  locale: LocaleCode;
  hiddenMessageObjectIds?: string[];
  mode?: "feed" | "hidden";
  canPersonalize?: boolean;
  emptyLabel?: string;
  semanticQuery?: SemanticFeedQueryF31;
}) {
  const copy = getGlobalFeedCopy(locale);
  const semanticResult = mode === "feed" && semanticQuery
    ? await searchSemanticFeedF31(semanticQuery)
    : null;

  // Critical: never fall back to unfiltered posts on invalid/RPC failure.
  if (semanticResult?.error) {
    return (
      <div role="alert" className="rounded-2xl border border-[#f3c7c7] bg-[#fff7f7] px-4 py-4 text-[12px] text-[#b42318]">
        {semanticResult.error === "invalid"
          ? "Invalid semantic filter. / Некорректные условия смыслового поиска."
          : copy.loadError}
      </div>
    );
  }

  const result = await getGlobalArctorFeed({
    locale,
    limit: semanticResult ? 20 : (mode === "hidden" ? 50 : 30),
    excludeMessageObjectIds:
      mode === "feed" ? hiddenMessageObjectIds : undefined,
    includeOnlyMessageObjectIds:
      semanticResult?.messageIds ?? (mode === "hidden" ? hiddenMessageObjectIds : undefined),
  });

  // F3.1A orders by COALESCE(activated_at,created_at), id; keep that order.
  if (semanticResult) {
    const position = new Map(semanticResult.messageIds.map((id, index) => [id, index]));
    result.items.sort((a, b) =>
      (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (position.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  let aiError = false;
  // AI-channel items are not yet F3.1A indexed; never mix unfiltered AI posts.
  const aiItems = mode === "feed" && !semanticResult ? await readChannelFeed().catch(() => { aiError = true; return []; }) : [];
  const aiCopy = channelWords(locale);
  const aiGroups = new Map<string, typeof aiItems>();
  for (const item of aiItems) {
    const group = aiGroups.get(item.channelId) ?? [];
    group.push(item);
    aiGroups.set(item.channelId, group);
  }
  const feedEntries = [
    ...result.items.map(item => ({ kind: "native" as const, item, time: item.publishedAt })),
    ...[...aiGroups.values()].filter(group => group.length > 0).map(items => ({ kind: "ai" as const, items, time: items[0].activated_at })),
  ].sort((a,b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  if (result.errorMessage) {
    return (
      <div className="rounded-2xl border border-[#f3c7c7] bg-[#fff7f7] px-4 py-4 text-[12px] leading-5 text-[#b42318]">
        {copy.loadError}
      </div>
    );
  }

  if (feedEntries.length === 0) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-[#e4e8f2] bg-white px-6 text-center text-[13px] text-[#9ca3b8]">
        {emptyLabel ?? copy.empty}
      </div>
    );
  }

  // P3.6.A: viewing a publication must never trigger an LLM call.
  // Reuse a revision-matched cached translation or show the unchanged original.
  // Reader-facing unit/FX annotations remain deterministic and display-only.
  const cachedContentById = new Map<string, string>();
  for (const item of result.items) {
    const cached = readCachedGlobalArctorFeedItemContent({ locale, item });
    if (cached) cachedContentById.set(item.id, cached);
  }
  const personalizationMode =
    canPersonalize ? (mode === "hidden" ? "restore" : "hide") : null;

  return (
    <div className="space-y-3">
      {aiError ? <p role="status" className="text-xs text-amber-700">{aiCopy[1]}: {aiCopy[36]}</p> : null}
      {feedEntries.map((entry) => {
        if (entry.kind === "ai") {
          return <AiChannelFeedGroup key={`ai:${entry.items[0].channelId}`} items={entry.items} locale={locale} />;
        }
        const item = entry.item;
        const cached = cachedContentById.get(item.id);
        return (
          <GlobalFeedItemCard
            key={item.id}
            item={item}
            locale={locale}
            contentText={cached ?? item.sourceContentText}
            personalizationMode={personalizationMode}
          />
        );
      })}
    </div>
  );
}
