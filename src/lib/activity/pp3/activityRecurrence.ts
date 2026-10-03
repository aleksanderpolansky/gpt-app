import type { ActivityTimingLocalePp1 } from "@/lib/activity/pp1/activityTiming";

export const ACTIVITY_RECURRENCE_FREQUENCY_CODES_PP3 = [
  "daily",
  "weekly",
  "monthly",
] as const;

export type ActivityRecurrenceFrequencyCodePp3 =
  (typeof ACTIVITY_RECURRENCE_FREQUENCY_CODES_PP3)[number];

export type ActivityRecurrenceDraftPp3 = {
  frequencyCode: ActivityRecurrenceFrequencyCodePp3;
  intervalCount: number;
  anchorDate: string;
  recurrenceBasisCode: "calendar";
  endModeCode: "never";
  untilDate: null;
  countLimit: null;
  sourcePatternCode: string;
};

function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validDateKey(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? value
    : null;
}

function dateKeyInTimeZone(instant: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant);

    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Fall through to UTC below.
  }

  return instant.toISOString().slice(0, 10);
}

type RecurrenceMatch = {
  frequencyCode: ActivityRecurrenceFrequencyCodePp3;
  intervalCount: number;
  sourcePatternCode: string;
};

function positiveInterval(value: string | undefined) {
  if (!value) return 1;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 365
    ? parsed
    : null;
}

function matchNumericRecurrence(normalized: string): RecurrenceMatch | null {
  const patterns: Array<{
    frequencyCode: ActivityRecurrenceFrequencyCodePp3;
    pattern: RegExp;
    sourcePatternCode: string;
  }> = [
    {
      frequencyCode: "weekly",
      pattern: /\bкаждые?\s+(\d{1,3})\s+недел(?:ю|и|ь)\b/iu,
      sourcePatternCode: "ru_every_n_weeks",
    },
    {
      frequencyCode: "daily",
      pattern: /\bкаждые?\s+(\d{1,3})\s+(?:дня|дней|день)\b/iu,
      sourcePatternCode: "ru_every_n_days",
    },
    {
      frequencyCode: "monthly",
      pattern: /\bкаждые?\s+(\d{1,3})\s+месяц(?:а|ев)?\b/iu,
      sourcePatternCode: "ru_every_n_months",
    },
    {
      frequencyCode: "weekly",
      pattern: /\bevery\s+(\d{1,3})\s+weeks?\b/iu,
      sourcePatternCode: "en_every_n_weeks",
    },
    {
      frequencyCode: "daily",
      pattern: /\bevery\s+(\d{1,3})\s+days?\b/iu,
      sourcePatternCode: "en_every_n_days",
    },
    {
      frequencyCode: "monthly",
      pattern: /\bevery\s+(\d{1,3})\s+months?\b/iu,
      sourcePatternCode: "en_every_n_months",
    },
    {
      frequencyCode: "weekly",
      pattern: /\bco\s+(\d{1,3})\s+tygod(?:nie|ni)\b/iu,
      sourcePatternCode: "pl_every_n_weeks",
    },
    {
      frequencyCode: "daily",
      pattern: /\bco\s+(\d{1,3})\s+dni\b/iu,
      sourcePatternCode: "pl_every_n_days",
    },
    {
      frequencyCode: "monthly",
      pattern: /\bco\s+(\d{1,3})\s+miesi(?:ące|ace|ęcy|ecy)\b/iu,
      sourcePatternCode: "pl_every_n_months",
    },
  ];

  for (const candidate of patterns) {
    const match = normalized.match(candidate.pattern);
    if (!match) continue;

    const intervalCount = positiveInterval(match[1]);
    if (!intervalCount) return null;

    return {
      frequencyCode: candidate.frequencyCode,
      intervalCount,
      sourcePatternCode: candidate.sourcePatternCode,
    };
  }

  return null;
}

function matchSimpleRecurrence(
  normalized: string,
  locale: ActivityTimingLocalePp1,
): RecurrenceMatch | null {
  const localized: Record<
    ActivityTimingLocalePp1,
    Array<{
      frequencyCode: ActivityRecurrenceFrequencyCodePp3;
      pattern: RegExp;
      sourcePatternCode: string;
    }>
  > = {
    ru: [
      {
        frequencyCode: "weekly",
        pattern: /\b(?:каждую неделю|каждой неделе|еженедельно|раз в неделю)\b/iu,
        sourcePatternCode: "ru_weekly",
      },
      {
        frequencyCode: "daily",
        pattern: /\b(?:каждый день|ежедневно|раз в день)\b/iu,
        sourcePatternCode: "ru_daily",
      },
      {
        frequencyCode: "monthly",
        pattern: /\b(?:каждый месяц|ежемесячно|раз в месяц)\b/iu,
        sourcePatternCode: "ru_monthly",
      },
    ],
    uk: [
      {
        frequencyCode: "weekly",
        pattern: /\b(?:щотижня|кожного тижня|раз на тиждень)\b/iu,
        sourcePatternCode: "uk_weekly",
      },
      {
        frequencyCode: "daily",
        pattern: /\b(?:щодня|кожного дня|раз на день)\b/iu,
        sourcePatternCode: "uk_daily",
      },
      {
        frequencyCode: "monthly",
        pattern: /\b(?:щомісяця|кожного місяця|раз на місяць)\b/iu,
        sourcePatternCode: "uk_monthly",
      },
    ],
    pl: [
      {
        frequencyCode: "weekly",
        pattern: /\b(?:co tydzień|co tydzien|raz w tygodniu|tygodniowo)\b/iu,
        sourcePatternCode: "pl_weekly",
      },
      {
        frequencyCode: "daily",
        pattern: /\b(?:codziennie|co dzień|co dzien|raz dziennie)\b/iu,
        sourcePatternCode: "pl_daily",
      },
      {
        frequencyCode: "monthly",
        pattern: /\b(?:co miesiąc|co miesiac|raz w miesiącu|raz w miesiacu|miesięcznie|miesiecznie)\b/iu,
        sourcePatternCode: "pl_monthly",
      },
    ],
    en: [
      {
        frequencyCode: "weekly",
        pattern: /\b(?:every week|once a week|weekly)\b/iu,
        sourcePatternCode: "en_weekly",
      },
      {
        frequencyCode: "daily",
        pattern: /\b(?:every day|once a day|daily)\b/iu,
        sourcePatternCode: "en_daily",
      },
      {
        frequencyCode: "monthly",
        pattern: /\b(?:every month|once a month|monthly)\b/iu,
        sourcePatternCode: "en_monthly",
      },
    ],
    de: [
      {
        frequencyCode: "weekly",
        pattern: /\b(?:jede woche|wöchentlich|woechentlich)\b/iu,
        sourcePatternCode: "de_weekly",
      },
      {
        frequencyCode: "daily",
        pattern: /\b(?:jeden tag|täglich|taeglich)\b/iu,
        sourcePatternCode: "de_daily",
      },
      {
        frequencyCode: "monthly",
        pattern: /\b(?:jeden monat|monatlich)\b/iu,
        sourcePatternCode: "de_monthly",
      },
    ],
    es: [
      {
        frequencyCode: "weekly",
        pattern: /\b(?:cada semana|semanalmente|una vez por semana)\b/iu,
        sourcePatternCode: "es_weekly",
      },
      {
        frequencyCode: "daily",
        pattern: /\b(?:cada día|cada dia|diariamente|una vez al día|una vez al dia)\b/iu,
        sourcePatternCode: "es_daily",
      },
      {
        frequencyCode: "monthly",
        pattern: /\b(?:cada mes|mensualmente|una vez al mes)\b/iu,
        sourcePatternCode: "es_monthly",
      },
    ],
    cs: [
      {
        frequencyCode: "weekly",
        pattern: /\b(?:každý týden|kazdy tyden|týdně|tydne)\b/iu,
        sourcePatternCode: "cs_weekly",
      },
      {
        frequencyCode: "daily",
        pattern: /\b(?:každý den|kazdy den|denně|denne)\b/iu,
        sourcePatternCode: "cs_daily",
      },
      {
        frequencyCode: "monthly",
        pattern: /\b(?:každý měsíc|kazdy mesic|měsíčně|mesicne)\b/iu,
        sourcePatternCode: "cs_monthly",
      },
    ],
  };

  for (const candidate of localized[locale]) {
    if (candidate.pattern.test(normalized)) {
      return {
        frequencyCode: candidate.frequencyCode,
        intervalCount: 1,
        sourcePatternCode: candidate.sourcePatternCode,
      };
    }
  }

  return null;
}

export function inferActivityRecurrenceDraftPp3(input: {
  sourceText: string;
  locale: ActivityTimingLocalePp1;
  reportedAtIso: string;
  timeZone: string;
  anchorDateCandidate?: string | null;
}): ActivityRecurrenceDraftPp3 | null {
  const normalized = normalizeText(input.sourceText);
  if (!normalized) return null;

  const matched =
    matchNumericRecurrence(normalized) ??
    matchSimpleRecurrence(normalized, input.locale);

  if (!matched) return null;

  const reportedAt = new Date(input.reportedAtIso);
  const safeReportedAt = Number.isNaN(reportedAt.getTime())
    ? new Date()
    : reportedAt;

  const anchorDate =
    validDateKey(input.anchorDateCandidate) ??
    dateKeyInTimeZone(safeReportedAt, input.timeZone);

  return {
    frequencyCode: matched.frequencyCode,
    intervalCount: matched.intervalCount,
    anchorDate,
    recurrenceBasisCode: "calendar",
    endModeCode: "never",
    untilDate: null,
    countLimit: null,
    sourcePatternCode: matched.sourcePatternCode,
  };
}
