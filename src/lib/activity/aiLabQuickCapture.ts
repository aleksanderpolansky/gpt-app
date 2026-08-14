import {
  datetimeLocalToIsoPp1,
  formatActivityTimingDraftPp1,
  getTimingFocusDatePp1,
  inferActivityTimingDraftPp1,
  parsePositiveDurationMinutesPp1,
  type ActivityTimingDraftPp1,
  type ActivityTimingLocalePp1,
  type ActivityTemporalDirectionPp1,
} from "@/lib/activity/pp1/activityTiming";
import { hasInfinitiveFutureIntent } from "@/lib/activity/quickCaptureIntent";
import {
  dateKeyInTimeZone,
  datetimeLocalInTimeZoneToIso,
  wallClockDateForTimeZone,
} from "@/lib/activity/quickCaptureTimeZone";

export const AI_A3_P5C_QUICK_CAPTURE_REVIEW_CONTRACT =
  "AI_A3_P5C_QUICK_CAPTURE_REVIEW_V1" as const;
export const AI_A3_P5C_ACTIVITY_REVIEW_SNAPSHOT_CONTRACT =
  "AI_A3_P5C_ACTIVITY_REVIEW_SNAPSHOT_V1" as const;

export type AiLabQuickCaptureFact = {
  parameterCode?: string;
  unit?: string;
  valueType?: string;
  valueNumeric?: number | null;
  valueText?: string | null;
  valueBoolean?: boolean | null;
  rawFragment?: string;
  factStatus?: string;
};

export type AiLabQuickCaptureRow = {
  segmentId?: string;
  sourceFragment?: string;
  selected?: {
    valueObjectId?: string;
    canonicalKey?: string;
    title?: string;
    facetCode?: string;
    objectKindCode?: string | null;
    semanticMatchMethodCode?: string;
  } | null;
  confidence?: number;
  facts?: AiLabQuickCaptureFact[];
  semanticProjections?: unknown[];
  temporal?: {
    occurredAtIso?: string | null;
    occurredAtRaw?: string | null;
    temporalPrecision?: string;
  };
};

export type AiLabQuickCapturePreview = {
  ok?: boolean;
  contractVersion?: string;
  previewOnly?: boolean;
  dbFactWriteExecuted?: boolean;
  operationId?: string;
  analysisExecutionId?: string;
  modelTier?: string;
  model?: string;
  reportedAt?: string;
  timeZone?: string;
  locale?: string;
  rows?: AiLabQuickCaptureRow[];
  analysisTrace?: {
    routing?: Array<{ segmentId?: string }>;
    candidateGroups?: Array<{ segmentId?: string }>;
  };
  safety?: unknown;
  warnings?: string[];
};

export type AiLabQuickCaptureTiming = {
  temporalDirection: ActivityTemporalDirectionPp1;
  draft: ActivityTimingDraftPp1;
  timingLabel: string;
  durationMinutes: number | null;
  observedDate: string | null;
  startedAt: string | null;
  endedAt: string | null;
  deadlineAt: string | null;
  focusDate: string | null;
};

const FUTURE_TEXT_PHRASES = [
  "завтра",
  "послезавтра",
  "післязавтра",
  "буду",
  "планирую",
  "собираюсь",
  "планую",
  "буду робити",
  "jutro",
  "pojutrze",
  "będę",
  "planuję",
  "zamierzam",
  "bede",
  "planuje",
  "tomorrow",
  "day after tomorrow",
  "will",
  "plan to",
  "going to",
  "morgen",
  "übermorgen",
  "uebermorgen",
  "werde",
  "plane",
  "vorhaben",
  "mañana",
  "pasado mañana",
  "voy a",
  "planeo",
  "pienso hacer",
  "zítra",
  "pozítří",
  "zitra",
  "pozitri",
  "budu",
  "plánuji",
  "planuji",
] as const;

function normalizePhraseText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsFutureText(
  value: string,
  locale: ActivityTimingLocalePp1 | undefined,
) {
  const normalized = ` ${normalizePhraseText(value)} `;

  if (
    FUTURE_TEXT_PHRASES.some((phrase) =>
      normalized.includes(` ${normalizePhraseText(phrase)} `),
    )
  ) {
    return true;
  }

  const relativeByLocale: Partial<Record<ActivityTimingLocalePp1, RegExp>> = {
    ru: /(?:^|\s)через\s+\d{1,3}\s*(?:минут|мин|час|часа|часов)(?=$|\s)/iu,
    uk: /(?:^|\s)через\s+\d{1,3}\s*(?:хвилин|хв|годин|години)(?=$|\s)/iu,
    pl: /(?:^|\s)za\s+\d{1,3}\s*(?:minut|minuty|godz|godziny)(?=$|\s)/iu,
    en: /(?:^|\s)in\s+\d{1,3}\s*(?:minute|minutes|hour|hours)(?=$|\s)/iu,
    de: /(?:^|\s)in\s+\d{1,3}\s*(?:minute|minuten|stunde|stunden)(?=$|\s)/iu,
    cs: /(?:^|\s)za\s+\d{1,3}\s*(?:minut|minuty|hodin|hodiny)(?=$|\s)/iu,
  };

  const relativePattern = locale ? relativeByLocale[locale] : undefined;
  return relativePattern ? relativePattern.test(normalized) : false;
}

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function inferAiLabQuickCaptureTemporalDirection(input: {
  row: AiLabQuickCaptureRow;
  sourceText: string;
  locale?: ActivityTimingLocalePp1;
  reportedAt?: string | null;
}): ActivityTemporalDirectionPp1 {
  const reportedAt = parseDate(input.reportedAt) ?? new Date();
  const occurredAt = parseDate(input.row.temporal?.occurredAtIso);

  if (occurredAt && occurredAt.getTime() > reportedAt.getTime() + 30_000) {
    return "future";
  }

  const temporalEvidence = [
    input.row.temporal?.occurredAtRaw ?? "",
    input.sourceText,
  ]
    .join(" ")
    .normalize("NFKC");

  if (containsFutureText(temporalEvidence, input.locale)) {
    return "future";
  }

  if (hasInfinitiveFutureIntent(input.sourceText, input.locale)) {
    return "future";
  }

  return "past";
}

export function buildAiLabQuickCaptureTiming(input: {
  row: AiLabQuickCaptureRow;
  sourceText: string;
  locale: ActivityTimingLocalePp1;
  reportedAt?: string | null;
  timeZone?: string;
}): AiLabQuickCaptureTiming {
  const reportedAtInstant = parseDate(input.reportedAt) ?? new Date();
  const timeZone = input.timeZone?.trim() || "";
  const reportedAtWallClock = timeZone
    ? wallClockDateForTimeZone(reportedAtInstant, timeZone)
    : reportedAtInstant;
  const temporalDirection = inferAiLabQuickCaptureTemporalDirection({
    row: input.row,
    sourceText: input.sourceText,
    locale: input.locale,
    reportedAt: reportedAtInstant.toISOString(),
  });
  const draft = inferActivityTimingDraftPp1(
    input.sourceText,
    temporalDirection,
    reportedAtWallClock,
  );
  const occurredAtIso = parseDate(input.row.temporal?.occurredAtIso)?.toISOString() ?? null;
  const localToIso = (value: string) =>
    timeZone
      ? datetimeLocalInTimeZoneToIso(value, timeZone)
      : datetimeLocalToIsoPp1(value);
  let startedAt = localToIso(draft.startedAtLocal);
  let endedAt = localToIso(draft.endedAtLocal);
  let durationMinutes = parsePositiveDurationMinutesPp1(draft.durationMinutes);

  const explicitDuration = (input.row.facts ?? []).find(
    (fact) =>
      (fact.parameterCode === "duration" ||
        fact.parameterCode === "duration_minutes") &&
      typeof fact.valueNumeric === "number" &&
      Number.isFinite(fact.valueNumeric) &&
      fact.valueNumeric > 0,
  )?.valueNumeric;

  if (typeof explicitDuration === "number") {
    durationMinutes = Math.round(explicitDuration);
  }

  if (occurredAtIso && !startedAt) {
    startedAt = occurredAtIso;
  }

  if (startedAt && durationMinutes && !endedAt) {
    endedAt = new Date(
      new Date(startedAt).getTime() + durationMinutes * 60_000,
    ).toISOString();
  }

  return {
    temporalDirection,
    draft,
    timingLabel: formatActivityTimingDraftPp1(
      draft,
      temporalDirection,
      input.locale,
    ),
    durationMinutes,
    observedDate: temporalDirection === "past" ? draft.observedDate || null : null,
    startedAt,
    endedAt,
    deadlineAt: localToIso(draft.deadlineLocal),
    focusDate: getTimingFocusDatePp1(draft, temporalDirection),
  };
}

function localDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildAiLabQuickCaptureSequentialTimings(input: {
  rows: AiLabQuickCaptureRow[];
  sourceTexts: string[];
  locale: ActivityTimingLocalePp1;
  reportedAt?: string | null;
  timeZone?: string;
}) {
  if (input.rows.length !== input.sourceTexts.length) {
    throw new Error("QUICK_CAPTURE_SEQUENCE_INPUT_LENGTH_MISMATCH");
  }

  const reportedAt = parseDate(input.reportedAt) ?? new Date();
  const timings = input.rows.map((row, index) =>
    buildAiLabQuickCaptureTiming({
      row,
      sourceText: input.sourceTexts[index],
      locale: input.locale,
      reportedAt: reportedAt.toISOString(),
      timeZone: input.timeZone,
    }),
  );

  let cursor = new Date(reportedAt.getTime());

  for (let index = timings.length - 1; index >= 0; index -= 1) {
    const timing = timings[index];
    const row = input.rows[index];

    if (timing.temporalDirection !== "past") {
      continue;
    }

    const explicitTemporalEvidence = Boolean(
      row.temporal?.occurredAtIso || row.temporal?.occurredAtRaw?.trim(),
    );
    const explicitStart = parseDate(timing.startedAt);
    const explicitEnd = parseDate(timing.endedAt);

    if (explicitStart) {
      cursor = explicitStart;
      continue;
    }

    if (explicitEnd) {
      cursor = explicitEnd;
      continue;
    }

    if (explicitTemporalEvidence) {
      continue;
    }

    if (timing.durationMinutes && timing.durationMinutes > 0) {
      const endedAt = new Date(cursor.getTime());
      const startedAt = new Date(
        endedAt.getTime() - timing.durationMinutes * 60_000,
      );
      const observedDate = input.timeZone
        ? dateKeyInTimeZone(startedAt, input.timeZone)
        : localDateKey(startedAt);

      timings[index] = {
        ...timing,
        observedDate: timing.observedDate ?? observedDate,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
      };
      cursor = startedAt;
      continue;
    }

    timings[index] = {
      ...timing,
      observedDate:
        timing.observedDate ??
        (input.timeZone ? dateKeyInTimeZone(cursor, input.timeZone) : localDateKey(cursor)),
    };
  }

  return timings;
}

function fnv1a32(value: string, seed: number) {
  let hash = seed >>> 0;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash >>> 0;
}

export function deriveAiLabQuickCaptureIdempotencyKey(input: {
  operationId: string;
  segmentId?: string | null;
  index: number;
}) {
  const seedText = `${input.operationId}|${input.segmentId ?? "segment"}|${input.index}`;
  const words = [
    fnv1a32(seedText, 0x811c9dc5),
    fnv1a32(seedText, 0x9e3779b9),
    fnv1a32(seedText, 0x85ebca6b),
    fnv1a32(seedText, 0xc2b2ae35),
  ];
  const hex = words.map((word) => word.toString(16).padStart(8, "0")).join("");
  const chars = hex.split("");
  chars[12] = "4";
  chars[16] = ((Number.parseInt(chars[16], 16) & 0x3) | 0x8).toString(16);
  const normalized = chars.join("");

  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20, 32)}`;
}

export function buildAiLabQuickCaptureReviewSnapshot(input: {
  preview: AiLabQuickCapturePreview;
  row: AiLabQuickCaptureRow;
  sourceMessageText: string;
  sourceFragment: string;
  locale: ActivityTimingLocalePp1;
  temporalDirection: ActivityTemporalDirectionPp1;
}) {
  const segmentId = input.row.segmentId ?? null;
  const routing = (input.preview.analysisTrace?.routing ?? []).filter(
    (item) => !segmentId || item.segmentId === segmentId,
  );
  const candidateGroups = (input.preview.analysisTrace?.candidateGroups ?? []).filter(
    (item) => !segmentId || item.segmentId === segmentId,
  );

  return {
    contractVersion: AI_A3_P5C_ACTIVITY_REVIEW_SNAPSHOT_CONTRACT,
    sourceMessageText: input.sourceMessageText,
    sourceFragment: input.sourceFragment,
    locale: input.locale,
    temporalDirection: input.temporalDirection,
    capturedAt: new Date().toISOString(),
    globalPreview: {
      ...input.preview,
      rows: [input.row],
      analysisTrace: {
        routing,
        candidateGroups,
      },
    },
  };
}

export function buildAiLabQuickCaptureReviewHref(input: {
  locale: string;
  activityEventId?: string | null;
}) {
  const query = new URLSearchParams({ locale: input.locale });

  if (input.activityEventId) {
    query.set("reviewActivityEventId", input.activityEventId);
    return `/activity-ai-lab?${query.toString()}`;
  }

  return `/activity-review?${query.toString()}`;
}
