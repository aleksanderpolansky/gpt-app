import type {
  ActivityDomain,
  LocalCategoryCandidate,
  PrivacyHint,
  ValueObjectCandidate,
} from "./activity-capture-types";

export const ACTIVITY_PRIVACY_HINT_MAPPER_CREATED =
  "ACTIVITY_PRIVACY_HINT_MAPPER_CREATED" as const;

interface PrivacyRule {
  id: string;
  domain: ActivityDomain;
  privacyLevel: PrivacyHint["privacyLevel"];
  keywords: string[];
  categoryIds: string[];
  categoryDomains: ActivityDomain[];
  valueObjectIds: string[];
  reason: string;
  priority: number;
}

const PRIVACY_RULES: PrivacyRule[] = [
  {
    id: "privacy-health-sensitive",
    domain: "health",
    privacyLevel: "sensitive",
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
      "symptom",
    ],
    categoryIds: ["category-health-signal"],
    categoryDomains: ["health"],
    valueObjectIds: ["vo-health-recovery"],
    reason:
      "В тексте есть возможный health/symptom signal. Это sensitive hint, не диагноз и не state fact.",
    priority: 100,
  },
  {
    id: "privacy-family-private",
    domain: "family",
    privacyLevel: "private",
    keywords: [
      "ребёнок",
      "ребенок",
      "дочь",
      "софия",
      "семья",
      "child",
      "childcare",
      "caregiving",
      "care",
      "математика",
    ],
    categoryIds: ["category-family-caregiving"],
    categoryDomains: ["family"],
    valueObjectIds: ["vo-family-care"],
    reason:
      "В тексте есть family/childcare/caregiving context. Это личный семейный контекст.",
    priority: 90,
  },
  {
    id: "privacy-work-organization",
    domain: "work",
    privacyLevel: "organization",
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
    categoryIds: ["category-b2b-work"],
    categoryDomains: ["work"],
    valueObjectIds: ["vo-b2b-sales", "vo-work-efficiency"],
    reason:
      "В тексте есть рабочий, клиентский или invoice-контекст. Возможна организационная приватность.",
    priority: 80,
  },
  {
    id: "privacy-purchase-organization",
    domain: "purchase",
    privacyLevel: "organization",
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
    categoryIds: ["category-purchase-money"],
    categoryDomains: ["purchase", "money"],
    valueObjectIds: ["vo-purchases-points"],
    reason:
      "В тексте есть purchase/money/points context. Это candidate для организационной или коммерческой приватности.",
    priority: 78,
  },
  {
    id: "privacy-nutrition-private",
    domain: "nutrition",
    privacyLevel: "private",
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
    categoryIds: ["category-nutrition-food"],
    categoryDomains: ["nutrition"],
    valueObjectIds: ["vo-nutrition"],
    reason:
      "В тексте есть nutrition context. Для MVP это личный приватный hint.",
    priority: 70,
  },
  {
    id: "privacy-language-public-safe",
    domain: "language",
    privacyLevel: "public-safe",
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
    categoryIds: ["category-language-learning"],
    categoryDomains: ["language"],
    valueObjectIds: ["vo-german-language", "vo-foreign-languages"],
    reason:
      "В тексте есть language-learning context. Обычно это public-safe hint, если нет личных данных.",
    priority: 50,
  },
  {
    id: "privacy-fitness-private",
    domain: "fitness",
    privacyLevel: "private",
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
    ],
    categoryIds: ["category-fitness-training"],
    categoryDomains: ["fitness"],
    valueObjectIds: ["vo-physical-fitness"],
    reason:
      "В тексте есть fitness context. Для MVP это личный приватный hint.",
    priority: 60,
  },
  {
    id: "privacy-mobility-private",
    domain: "mobility",
    privacyLevel: "private",
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
    categoryIds: ["category-mobility-walk"],
    categoryDomains: ["mobility"],
    valueObjectIds: ["vo-daily-mobility"],
    reason:
      "В тексте есть mobility/location-like context. Для MVP это личный приватный hint.",
    priority: 58,
  },
];

function normalizeForMatching(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function keywordMatches(normalizedText: string, keywords: string[]): boolean {
  return keywords.some((keyword) => normalizedText.includes(keyword.toLowerCase()));
}

function categoryMatches(
  rule: PrivacyRule,
  categoryCandidates: LocalCategoryCandidate[],
): boolean {
  return categoryCandidates.some(
    (candidate) =>
      rule.categoryIds.includes(candidate.id) ||
      rule.categoryDomains.includes(candidate.domain),
  );
}

function valueObjectMatches(
  rule: PrivacyRule,
  valueObjectCandidates: ValueObjectCandidate[],
): boolean {
  return valueObjectCandidates.some((candidate) =>
    rule.valueObjectIds.includes(candidate.id),
  );
}

function createPrivacyHint(rule: PrivacyRule): PrivacyHint {
  return {
    id: rule.id,
    domain: rule.domain,
    privacyLevel: rule.privacyLevel,
    reason: rule.reason,
  };
}

function dedupePrivacyHints(hints: PrivacyHint[]): PrivacyHint[] {
  const seenIds = new Set<string>();

  return hints.filter((hint) => {
    if (seenIds.has(hint.id)) {
      return false;
    }

    seenIds.add(hint.id);
    return true;
  });
}

export function mapPrivacyHints(
  rawText: string,
  categoryCandidates: LocalCategoryCandidate[] = [],
  valueObjectCandidates: ValueObjectCandidate[] = [],
): PrivacyHint[] {
  const normalizedText = normalizeForMatching(rawText);

  if (
    normalizedText.length === 0 &&
    categoryCandidates.length === 0 &&
    valueObjectCandidates.length === 0
  ) {
    return [];
  }

  const hints = PRIVACY_RULES.filter((rule) => {
    const hasKeywordMatch = keywordMatches(normalizedText, rule.keywords);
    const hasCategoryMatch = categoryMatches(rule, categoryCandidates);
    const hasValueObjectMatch = valueObjectMatches(rule, valueObjectCandidates);

    return hasKeywordMatch || hasCategoryMatch || hasValueObjectMatch;
  }).map(createPrivacyHint);

  return dedupePrivacyHints(hints).sort((firstHint, secondHint) => {
    const firstRule = PRIVACY_RULES.find((rule) => rule.id === firstHint.id);
    const secondRule = PRIVACY_RULES.find((rule) => rule.id === secondHint.id);

    return (secondRule?.priority ?? 0) - (firstRule?.priority ?? 0);
  });
}
