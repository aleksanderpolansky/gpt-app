import type {
  ActivityDomain,
  CategoryCandidateStatus,
  LocalCategoryCandidate,
  UnknownTermCandidate,
} from "./activity-capture-types";

export const ACTIVITY_CATEGORY_MAPPER_CREATED =
  "ACTIVITY_CATEGORY_MAPPER_CREATED" as const;

interface CategoryRule {
  id: string;
  label: string;
  domain: ActivityDomain;
  confidence: number;
  status: CategoryCandidateStatus;
  keywords: string[];
  reason: string;
  sourceRule: string;
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    id: "category-language-learning",
    label: "Изучение языка",
    domain: "language",
    confidence: 0.92,
    status: "suggested",
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
      "грамматика",
      "перевод",
      "translation",
    ],
    reason:
      "В тексте есть слова, связанные с изучением языка или языковой практикой.",
    sourceRule: "category-language-keyword-rule",
  },
  {
    id: "category-b2b-work",
    label: "Работа / B2B",
    domain: "work",
    confidence: 0.86,
    status: "suggested",
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
      "ошибки",
    ],
    reason:
      "В тексте есть рабочий, клиентский, B2B или invoice-контекст.",
    sourceRule: "category-work-keyword-rule",
  },
  {
    id: "category-fitness-training",
    label: "Физическая активность",
    domain: "fitness",
    confidence: 0.9,
    status: "suggested",
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
    ],
    reason:
      "В тексте есть упражнения или прямое указание на тренировку.",
    sourceRule: "category-fitness-keyword-rule",
  },
  {
    id: "category-mobility-walk",
    label: "Движение / прогулка",
    domain: "mobility",
    confidence: 0.82,
    status: "suggested",
    keywords: [
      "прогулка",
      "собакой",
      "прошёл",
      "прошел",
      "км",
      "km",
      "этаж",
      "walk",
      "stairs",
      "floor",
    ],
    reason:
      "В тексте есть признаки прогулки, дистанции, ходьбы или этажей.",
    sourceRule: "category-mobility-keyword-rule",
  },
  {
    id: "category-nutrition-food",
    label: "Питание",
    domain: "nutrition",
    confidence: 0.88,
    status: "suggested",
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
    reason:
      "В тексте есть еда, напитки или приём пищи.",
    sourceRule: "category-nutrition-keyword-rule",
  },
  {
    id: "category-family-caregiving",
    label: "Семья / забота о ребёнке",
    domain: "family",
    confidence: 0.87,
    status: "suggested",
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
    reason:
      "В тексте есть семейный или childcare/caregiving-контекст.",
    sourceRule: "category-family-caregiving-keyword-rule",
  },
  {
    id: "category-purchase-money",
    label: "Покупка / деньги",
    domain: "purchase",
    confidence: 0.84,
    status: "suggested",
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
      "продавца",
    ],
    reason:
      "В тексте есть покупка, сумма, points или продавец.",
    sourceRule: "category-purchase-money-keyword-rule",
  },
  {
    id: "category-health-signal",
    label: "Здоровье / самочувствие",
    domain: "health",
    confidence: 0.72,
    status: "needs_review",
    keywords: [
      "усталость",
      "боль",
      "болит",
      "самочувствие",
      "сон",
      "стресс",
      "плечах",
      "колено",
      "спина",
      "health",
      "fatigue",
      "pain",
    ],
    reason:
      "В тексте есть возможный health/symptom signal. Это не диагноз и не state fact.",
    sourceRule: "category-health-signal-needs-review-rule",
  },
];

const UNKNOWN_TERM_STOP_WORDS = new Set([
  "и",
  "в",
  "на",
  "с",
  "по",
  "за",
  "для",
  "это",
  "как",
  "the",
  "and",
  "with",
  "und",
  "mit",
  "oraz",
  "or",
]);

function normalizeForMatching(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function keywordMatches(normalizedText: string, keywords: string[]): boolean {
  return keywords.some((keyword) => normalizedText.includes(keyword.toLowerCase()));
}

function createCategoryCandidate(rule: CategoryRule): LocalCategoryCandidate {
  return {
    id: rule.id,
    label: rule.label,
    domain: rule.domain,
    confidence: rule.confidence,
    status: rule.status,
    reason: rule.reason,
    sourceRule: rule.sourceRule,
  };
}

function dedupeCategoryCandidates(
  candidates: LocalCategoryCandidate[],
): LocalCategoryCandidate[] {
  const seenIds = new Set<string>();

  return candidates.filter((candidate) => {
    if (seenIds.has(candidate.id)) {
      return false;
    }

    seenIds.add(candidate.id);
    return true;
  });
}

export function mapLocalCategoryCandidates(
  rawText: string,
): LocalCategoryCandidate[] {
  const normalizedText = normalizeForMatching(rawText);

  if (normalizedText.length === 0) {
    return [];
  }

  const candidates = CATEGORY_RULES.filter((rule) =>
    keywordMatches(normalizedText, rule.keywords),
  ).map(createCategoryCandidate);

  return dedupeCategoryCandidates(candidates).sort(
    (firstCandidate, secondCandidate) =>
      secondCandidate.confidence - firstCandidate.confidence,
  );
}

export function mapUnknownTermCandidates(rawText: string): UnknownTermCandidate[] {
  const normalizedText = normalizeForMatching(rawText);

  if (normalizedText.length === 0) {
    return [];
  }

  const tokens = normalizedText
    .split(/[^a-zа-яёąćęłńóśźż0-9-]+/giu)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4)
    .filter((token) => !UNKNOWN_TERM_STOP_WORDS.has(token));

  const knownKeywords = new Set(
    CATEGORY_RULES.flatMap((rule) =>
      rule.keywords.map((keyword) => normalizeForMatching(keyword)),
    ),
  );

  const unknownTerms = tokens
    .filter((token) => !knownKeywords.has(token))
    .filter((token, index, allTokens) => allTokens.indexOf(token) === index)
    .slice(0, 6);

  return unknownTerms.map((term) => ({
    term,
    reason:
      "Термин не найден в локальных keyword rules. Это candidate для future review, а не новая active category.",
    suggestedAction: "ask_later",
  }));
}
