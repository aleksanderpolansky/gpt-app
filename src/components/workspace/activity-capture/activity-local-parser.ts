import type {
  ActivityDomain,
  LocalActivityDraft,
  LocalDurationHint,
  LocalMetricHint,
  LocalParserResult,
} from "./activity-capture-types";

export const ACTIVITY_LOCAL_PARSER_CREATED =
  "ACTIVITY_LOCAL_PARSER_CREATED" as const;

export const ACTIVITY_DURATION_CONTEXT_HINTS_CREATED =
  "ACTIVITY_DURATION_CONTEXT_HINTS_CREATED" as const;

const DEFAULT_NORMALIZED_TITLE = "Новая активность";

interface KeywordGroup {
  id: string;
  domain: ActivityDomain;
  contextLabel: string;
  keywords: string[];
}

const CONTEXT_KEYWORD_GROUPS: KeywordGroup[] = [
  {
    id: "context-language",
    domain: "language",
    contextLabel: "Языки / обучение",
    keywords: [
      "немецкий",
      "deutsch",
      "german",
      "английский",
      "english",
      "испанский",
      "spanish",
      "español",
      "польский",
      "polski",
      "babbel",
      "слова",
      "фразы",
      "grammar",
      "gramматика",
      "перевод",
      "translation",
    ],
  },
  {
    id: "context-work",
    domain: "work",
    contextLabel: "Работа / B2B",
    keywords: [
      "работа",
      "csp",
      "счета",
      "инвойс",
      "invoice",
      "client",
      "клиент",
      "b2b",
      "продажи",
      "sales",
      "газ",
      "электричество",
      "офис",
    ],
  },
  {
    id: "context-fitness",
    domain: "fitness",
    contextLabel: "Физическая активность",
    keywords: [
      "тренировка",
      "подтягивания",
      "отжимания",
      "брусья",
      "планка",
      "приседания",
      "спорт",
      "fitness",
      "workout",
      "pull",
      "push",
      "walk",
      "прогулка",
      "собакой",
      "этаж",
      "км",
    ],
  },
  {
    id: "context-nutrition",
    domain: "nutrition",
    contextLabel: "Еда / питание",
    keywords: [
      "еда",
      "завтрак",
      "обед",
      "ужин",
      "кофе",
      "гречка",
      "мясо",
      "сыр",
      "бутерброд",
      "питание",
      "food",
      "breakfast",
      "lunch",
      "dinner",
    ],
  },
  {
    id: "context-family",
    domain: "family",
    contextLabel: "Семья / забота",
    keywords: [
      "ребёнок",
      "ребенок",
      "дочь",
      "софия",
      "математика",
      "семья",
      "child",
      "childcare",
      "caregiving",
      "care",
      "занимался с ребёнком",
      "занимался с ребенком",
    ],
  },
  {
    id: "context-purchase",
    domain: "purchase",
    contextLabel: "Покупка / деньги",
    keywords: [
      "покупка",
      "купил",
      "купить",
      "злотых",
      "pln",
      "eur",
      "деньги",
      "посуда",
      "сертификат",
      "points",
      "подтвердить у продавца",
    ],
  },
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeForMatching(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

function keywordMatches(normalizedText: string, keywords: string[]): boolean {
  return keywords.some((keyword) => normalizedText.includes(keyword.toLowerCase()));
}

function createLocalActivityId(rawText: string): string {
  const normalized = normalizeForMatching(rawText);

  const seed = normalized
    .replace(/[^a-zа-яёąćęłńóśźż0-9]+/giu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `local-activity-${seed || "draft"}`;
}

function createNormalizedTitle(rawText: string): string {
  const normalized = normalizeWhitespace(rawText);

  if (normalized.length === 0) {
    return DEFAULT_NORMALIZED_TITLE;
  }

  const firstSentence = normalized.split(/[.!?]/u)[0]?.trim() ?? normalized;
  const firstChunk = firstSentence.split(":")[0]?.trim() ?? firstSentence;

  return firstChunk.length > 0 ? firstChunk.slice(0, 80) : DEFAULT_NORMALIZED_TITLE;
}

function durationValueToMinutes(rawValue: string, rawUnit: string): number | null {
  const normalizedValue = rawValue.replace(",", ".");
  const parsedValue = Number.parseFloat(normalizedValue);
  const normalizedUnit = rawUnit.toLowerCase();

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  if (
    normalizedUnit === "час" ||
    normalizedUnit === "часа" ||
    normalizedUnit === "часов" ||
    normalizedUnit === "ч" ||
    normalizedUnit === "hour" ||
    normalizedUnit === "hours" ||
    normalizedUnit === "hrs" ||
    normalizedUnit === "h" ||
    normalizedUnit === "godzin" ||
    normalizedUnit === "godziny" ||
    normalizedUnit === "godz"
  ) {
    return Math.round(parsedValue * 60);
  }

  return Math.round(parsedValue);
}

function createDurationHint(minutes: number, sourceRule: string): LocalDurationHint {
  return {
    id: `duration-${minutes}-minutes`,
    label: `${minutes} минут`,
    minutes,
    reason:
      "В тексте найдено возможное указание длительности. Это локальная подсказка, не сохранённый факт.",
    sourceRule,
  };
}

function addDurationHintOnce(
  hints: LocalDurationHint[],
  seenMinutes: Set<number>,
  minutes: number | null,
  sourceRule: string,
): void {
  if (minutes === null || minutes <= 0 || seenMinutes.has(minutes)) {
    return;
  }

  seenMinutes.add(minutes);
  hints.push(createDurationHint(minutes, sourceRule));
}

function extractDurationHints(rawText: string): LocalDurationHint[] {
  const normalized = normalizeForMatching(rawText);
  const hints: LocalDurationHint[] = [];
  const seenMinutes = new Set<number>();

  const minuteMatches = normalized.matchAll(
    /(\d{1,3})\s*(минут|минута|минуты|мин|minutes|minute|min|minut|minuty|minutach)\b/giu,
  );

  for (const match of minuteMatches) {
    const minutes = durationValueToMinutes(match[1] ?? "0", match[2] ?? "минут");
    addDurationHintOnce(hints, seenMinutes, minutes, "duration-minute-number-rule");
  }

  const hourMatches = normalized.matchAll(
    /(\d+(?:[.,]\d+)?)\s*(часа|часов|час|ч|hours|hour|hrs|h|godzin|godziny|godz)\b/giu,
  );

  for (const match of hourMatches) {
    const minutes = durationValueToMinutes(match[1] ?? "0", match[2] ?? "час");
    addDurationHintOnce(hints, seenMinutes, minutes, "duration-hour-number-rule");
  }

  if (
    normalized.includes("полчаса") ||
    normalized.includes("пол часа") ||
    normalized.includes("half an hour") ||
    normalized.includes("pół godziny")
  ) {
    addDurationHintOnce(hints, seenMinutes, 30, "duration-half-hour-rule");
  }

  return hints;
}

function extractMetricHints(rawText: string): LocalMetricHint[] {
  const normalized = normalizeForMatching(rawText);
  const metricHints: LocalMetricHint[] = [];

  const distanceMatch = normalized.match(
    /(\d+(?:[.,]\d+)?)\s*(км|km|kilometers|kilometres)\b/u,
  );

  if (distanceMatch) {
    metricHints.push({
      id: "metric-distance",
      label: "Дистанция",
      value: `${distanceMatch[1]?.replace(",", ".")} км`,
      reason:
        "В тексте найдено возможное расстояние. Это локальная подсказка, не сохранённая метрика.",
      sourceRule: "metric-distance-rule",
    });
  }

  const floorMatch = normalized.match(/(\d{1,2})\s*(этаж|этажа|этажей|floor|floors)\b/u);

  if (floorMatch) {
    metricHints.push({
      id: "metric-floors",
      label: "Этажи",
      value: `${floorMatch[1]} этаж`,
      reason:
        "В тексте найден возможный показатель этажей. Это локальная подсказка, не подтверждённый факт.",
      sourceRule: "metric-floor-rule",
    });
  }

  const phraseMatch = normalized.match(/(\d{1,3})\s*(фраз|фразы|слов|слова|phrases|words)\b/u);

  if (phraseMatch) {
    metricHints.push({
      id: "metric-learning-items",
      label: "Учебные элементы",
      value: `${phraseMatch[1]}`,
      reason:
        "В тексте найден возможный счётчик слов или фраз. Это локальная подсказка, не подтверждённая метрика.",
      sourceRule: "metric-learning-items-rule",
    });
  }

  return metricHints;
}

function extractContextLabel(rawText: string): string | undefined {
  const normalized = normalizeForMatching(rawText);
  const matchedGroup = CONTEXT_KEYWORD_GROUPS.find((group) =>
    keywordMatches(normalized, group.keywords),
  );

  return matchedGroup?.contextLabel;
}

function createDraft(rawText: string): LocalActivityDraft {
  const normalizedRawText = normalizeWhitespace(rawText);
  const durationHints = extractDurationHints(normalizedRawText);
  const firstDurationHint = durationHints[0];
  const contextLabel = extractContextLabel(normalizedRawText);

  return {
    id: createLocalActivityId(normalizedRawText),
    rawText: normalizedRawText,
    localCreatedAt: new Date().toISOString(),
    durationMinutes: firstDurationHint?.minutes,
    contextLabel,
    status: "draft",
    source: "local",
  };
}

function createExplanation(
  durationHints: LocalDurationHint[],
  metricHints: LocalMetricHint[],
  contextLabel: string | undefined,
): string[] {
  const explanation = [
    "Это локальный preview: данные не отправлены в API и не сохранены в DB.",
    "Parser использует только deterministic keyword rules внутри браузерного React-состояния.",
  ];

  if (durationHints.length > 0) {
    explanation.push(
      "Найдена возможная длительность: минуты, часы или короткие интервалы вроде 5/10/20/45 минут распознаются как duration hints.",
    );
  } else {
    explanation.push("Явная длительность не найдена; запись остаётся без durationMinutes.");
  }

  if (contextLabel) {
    explanation.push(
      `Найден возможный контекст: ${contextLabel}. Это подсказка, а не подтверждённая категория.`,
    );
  } else {
    explanation.push("Контекст по ключевым словам пока не определён.");
  }

  if (metricHints.length > 0) {
    explanation.push(
      "Найдены возможные metric hints: расстояние, этажи или счётчик учебных элементов.",
    );
  }

  explanation.push(
    "Категории, Value Objects, privacy hints и unknown terms будут добавлены следующими локальными mapper-шагами.",
  );

  return explanation;
}

export function parseLocalActivity(rawText: string): LocalParserResult {
  const normalizedRawText = normalizeWhitespace(rawText);
  const durationHints = extractDurationHints(normalizedRawText);
  const metricHints = extractMetricHints(normalizedRawText);
  const contextLabel = extractContextLabel(normalizedRawText);

  return {
    draft: createDraft(normalizedRawText),
    normalizedTitle: createNormalizedTitle(normalizedRawText),
    durationHints,
    metricHints,
    categoryCandidates: [],
    valueObjectCandidates: [],
    privacyHints: [],
    unknownTermCandidates: [],
    explanation: createExplanation(durationHints, metricHints, contextLabel),
  };
}
