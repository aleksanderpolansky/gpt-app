"use client";

import { useEffect, useState } from "react";

const LOCALE_TAGS: Record<string, string> = {
  en: "en-US",
  pl: "pl-PL",
  ru: "ru-RU",
  uk: "uk-UA",
  de: "de-DE",
  es: "es-ES",
  cs: "cs-CZ",
};

function formatLocalDateTime(value: string, locale: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    LOCALE_TAGS[locale] ?? LOCALE_TAGS.en,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

export function GiftCertificateLocalDateTime({
  value,
  locale,
}: {
  readonly value: string;
  readonly locale: string;
}) {
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    setFormatted(formatLocalDateTime(value, locale));
  }, [locale, value]);

  return (
    <time dateTime={value} suppressHydrationWarning>
      {formatted ?? "…"}
    </time>
  );
}
