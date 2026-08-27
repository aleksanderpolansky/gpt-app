import Link from "next/link";

import type { LocaleCode } from "@/i18n";
import { getGlobalArctorFeed } from "@/lib/messages/globalFeed.server";
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

  return (
    <div className="space-y-3">
      {result.items.map((item) => {
        const profileHref = buildProfileHref(item.author.publicSlug, locale);

        return (
          <article
            key={item.id}
            className="rounded-2xl border border-[#e4e8f2] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:px-5"
          >
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

                {item.contentText ? (
                  <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-6 text-[#555b73]">
                    {item.contentText}
                  </p>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
