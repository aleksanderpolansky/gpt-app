"use client";

import { useEffect, useState } from "react";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type ActivityScheduleDisplayProps = {
  locale: LocaleCode;
  scheduleModeCode: string | null;
  scheduledDate: string | null;
  scheduleStartDate: string | null;
  scheduleEndDate: string | null;
  deadlineAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
};

const DATE_LOCALES: Record<LocaleCode, string> = {
  en: "en-US",
  pl: "pl-PL",
  ru: "ru-RU",
  uk: "uk-UA",
  de: "de-DE",
  es: "es-ES",
  cs: "cs-CZ",
};

function formatDateTime(value: string | null, locale: LocaleCode) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(DATE_LOCALES[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatSchedule(
  props: ActivityScheduleDisplayProps,
  browserReady: boolean,
) {
  if (props.scheduleModeCode === "exact") {
    if (!browserReady) {
      return "…";
    }

    const start = formatDateTime(props.startedAt, props.locale);
    const end = formatDateTime(props.endedAt, props.locale);

    return end === "—" ? start : `${start} — ${end}`;
  }

  if (props.scheduleModeCode === "date_only") {
    return props.scheduledDate || "—";
  }

  if (props.scheduleModeCode === "date_range") {
    return [props.scheduleStartDate, props.scheduleEndDate]
      .filter(Boolean)
      .join(" — ") || "—";
  }

  if (props.scheduleModeCode === "deadline") {
    if (!browserReady) {
      return "…";
    }

    return formatDateTime(props.deadlineAt, props.locale);
  }

  return "—";
}

export function ActivityScheduleDisplay(
  props: ActivityScheduleDisplayProps,
) {
  const [browserReady, setBrowserReady] = useState(false);

  useEffect(() => {
    setBrowserReady(true);
  }, []);

  return (
    <span suppressHydrationWarning>
      {formatSchedule(props, browserReady)}
    </span>
  );
}
