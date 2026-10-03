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
      pattern: /(?:^|\s)каждые?\s+(\d{1,3})\s+недел(?:ю|и|ь)(?=$|\s)/iu,
      sourcePatternCode: "ru_every_n_weeks",
    },
    {
      frequencyCode: "daily",
      pattern: /(?:^|\s)каждые?\s+(\d{1,3})\s+(?:дня|дней|день)(?=$|\s)/iu,
      sourcePatternCode: "ru_every_n_days",
    },
    {
      frequencyCode: "monthly",
      pattern: /(?:^|\s)каждые?\s+(\d{1,3})\s+месяц(?:а|ев)?(?=$|\s)/iu,
      sourcePatternCode: "ru_every_n_months",
    },
    {
      frequencyCode: "weekly",
      pattern: /(?:^|\s)every\s+(\d{1,3})\s+weeks?(?=$|\s)/iu,
      sourcePatternCode: "en_every_n_weeks",
    },
    {
      frequencyCode: "daily",
      pattern: /(?:^|\s)every\s+(\d{1,3})\s+days?(?=$|\s)/iu,
      sourcePatternCode: "en_every_n_days",
    },
    {
      frequencyCode: "monthly",
      pattern: /(?:^|\s)every\s+(\d{1,3})\s+months?(?=$|\s)/iu,
      sourcePatternCode: "en_every_n_months",
    },
    {
      frequencyCode: "weekly",
      pattern: /(?:^|\s)co\s+(\d{1,3})\s+tygod(?:nie|ni)(?=$|\s)/iu,
      sourcePatternCode: "pl_every_n_weeks",
    },
    {
      frequencyCode: "daily",
      pattern: /(?:^|\s)co\s+(\d{1,3})\s+dni(?=$|\s)/iu,
      sourcePatternCode: "pl_every_n_days",
    },
    {
      frequencyCode: "monthly",
      pattern: /(?:^|\s)co\s+(\d{1,3})\s+miesi(?:ące|ace|ęcy|ecy)(?=$|\s)/iu,
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
        pattern: /(?:^|\s)(?:каждую неделю|каждой неделе|еженедельно|раз в неделю)(?=$|\s)/iu,
        sourcePatternCode: "ru_weekly",
      },
      {
        frequencyCode: "daily",
        pattern: /(?:^|\s)(?:каждый день|ежедневно|раз в день)(?=$|\s)/iu,
        sourcePatternCode: "ru_daily",
      },
      {
        frequencyCode: "monthly",
        pattern: /(?:^|\s)(?:каждый месяц|ежемесячно|раз в месяц)(?=$|\s)/iu,
        sourcePatternCode: "ru_monthly",
      },
    ],
    uk: [
      {
        frequencyCode: "weekly",
        pattern: /(?:^|\s)(?:щотижня|кожного тижня|раз на тиждень)(?=$|\s)/iu,
        sourcePatternCode: "uk_weekly",
      },
      {
        frequencyCode: "daily",
        pattern: /(?:^|\s)(?:щодня|кожного дня|раз на день)(?=$|\s)/iu,
        sourcePatternCode: "uk_daily",
      },
      {
        frequencyCode: "monthly",
        pattern: /(?:^|\s)(?:щомісяця|кожного місяця|раз на місяць)(?=$|\s)/iu,
        sourcePatternCode: "uk_monthly",
      },
    ],
    pl: [
      {
        frequencyCode: "weekly",
        pattern: /(?:^|\s)(?:co tydzień|co tydzien|raz w tygodniu|tygodniowo)(?=$|\s)/iu,
        sourcePatternCode: "pl_weekly",
      },
      {
        frequencyCode: "daily",
        pattern: /(?:^|\s)(?:codziennie|co dzień|co dzien|raz dziennie)(?=$|\s)/iu,
        sourcePatternCode: "pl_daily",
      },
      {
        frequencyCode: "monthly",
        pattern: /(?:^|\s)(?:co miesiąc|co miesiac|raz w miesiącu|raz w miesiacu|miesięcznie|miesiecznie)(?=$|\s)/iu,
        sourcePatternCode: "pl_monthly",
      },
    ],
    en: [
      {
        frequencyCode: "weekly",
        pattern: /(?:^|\s)(?:every week|once a week|weekly)(?=$|\s)/iu,
        sourcePatternCode: "en_weekly",
      },
      {
        frequencyCode: "daily",
        pattern: /(?:^|\s)(?:every day|once a day|daily)(?=$|\s)/iu,
        sourcePatternCode: "en_daily",
      },
      {
        frequencyCode: "monthly",
        pattern: /(?:^|\s)(?:every month|once a month|monthly)(?=$|\s)/iu,
        sourcePatternCode: "en_monthly",
      },
    ],
    de: [
      {
        frequencyCode: "weekly",
        pattern: /(?:^|\s)(?:jede woche|wöchentlich|woechentlich)(?=$|\s)/iu,
        sourcePatternCode: "de_weekly",
      },
      {
        frequencyCode: "daily",
        pattern: /(?:^|\s)(?:jeden tag|täglich|taeglich)(?=$|\s)/iu,
        sourcePatternCode: "de_daily",
      },
      {
        frequencyCode: "monthly",
        pattern: /(?:^|\s)(?:jeden monat|monatlich)(?=$|\s)/iu,
        sourcePatternCode: "de_monthly",
      },
    ],
    es: [
      {
        frequencyCode: "weekly",
        pattern: /(?:^|\s)(?:cada semana|semanalmente|una vez por semana)(?=$|\s)/iu,
        sourcePatternCode: "es_weekly",
      },
      {
        frequencyCode: "daily",
        pattern: /(?:^|\s)(?:cada día|cada dia|diariamente|una vez al día|una vez al dia)(?=$|\s)/iu,
        sourcePatternCode: "es_daily",
      },
      {
        frequencyCode: "monthly",
        pattern: /(?:^|\s)(?:cada mes|mensualmente|una vez al mes)(?=$|\s)/iu,
        sourcePatternCode: "es_monthly",
      },
    ],
    cs: [
      {
        frequencyCode: "weekly",
        pattern: /(?:^|\s)(?:každý týden|kazdy tyden|týdně|tydne)(?=$|\s)/iu,
        sourcePatternCode: "cs_weekly",
      },
      {
        frequencyCode: "daily",
        pattern: /(?:^|\s)(?:každý den|kazdy den|denně|denne)(?=$|\s)/iu,
        sourcePatternCode: "cs_daily",
      },
      {
        frequencyCode: "monthly",
        pattern: /(?:^|\s)(?:každý měsíc|kazdy mesic|měsíčně|mesicne)(?=$|\s)/iu,
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
