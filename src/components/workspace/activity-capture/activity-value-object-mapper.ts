import type {
  ActivityDomain,
  LocalCategoryCandidate,
  ValueObjectCandidate,
} from "./activity-capture-types";

export const ACTIVITY_VALUE_OBJECT_MAPPER_CREATED =
  "ACTIVITY_VALUE_OBJECT_MAPPER_CREATED" as const;

interface ValueObjectRule {
  id: string;
  label: string;
  domain: ActivityDomain;
  relevance: number;
  keywords: string[];
  categoryIds: string[];
  categoryDomains: ActivityDomain[];
  reason: string;
  sourceRule: string;
}

const VALUE_OBJECT_RULES: ValueObjectRule[] = [
  {
    id: "vo-german-language",
    label: "Немецкий язык",
    domain: "language",
    relevance: 0.94,
    keywords: ["немецкий", "deutsch", "german", "babbel"],
    categoryIds: ["category-language-learning"],
    categoryDomains: ["language"],
    reason:
      "Текст похож на активность, связанную с развитием немецкого языка.",
    sourceRule: "vo-german-language-keyword-rule",
  },
  {
    id: "vo-foreign-languages",
    label: "Иностранные языки",
    domain: "language",
    relevance: 0.88,
    keywords: [
      "английский",
      "english",
      "испанский",
      "spanish",
      "español",
      "польский",
      "polski",
      "слова",
      "фразы",
      "grammar",
      "грамматика",
      "перевод",
      "translation",
    ],
    categoryIds: ["category-language-learning"],
    categoryDomains: ["language"],
    reason:
      "Текст содержит общий языковой или учебный контекст.",
    sourceRule: "vo-foreign-languages-keyword-rule",
  },
  {
    id: "vo-b2b-sales",
    label: "B2B продажи",
    domain: "work",
    relevance: 0.86,
    keywords: ["b2b", "продажи", "sales", "client", "клиент", "офис"],
    categoryIds: ["category-b2b-work"],
    categoryDomains: ["work"],
    reason:
      "Текст связан с клиентами, продажами, B2B или рабочим развитием.",
    sourceRule: "vo-b2b-sales-keyword-rule",
  },
  {
    id: "vo-work-efficiency",
    label: "Рабочая эффективность",
    domain: "work",
    relevance: 0.82,
    keywords: [
      "работа",
      "csp",
      "счета",
      "инвойс",
      "invoice",
      "газ",
      "электричество",
      "ошибки",
    ],
    categoryIds: ["category-b2b-work"],
    categoryDomains: ["work"],
    reason:
      "Текст похож на рабочую операционную активность или обработку задач.",
    sourceRule: "vo-work-efficiency-keyword-rule",
  },
  {
    id: "vo-physical-fitness",
    label: "Физическая форма",
    domain: "fitness",
    relevance: 0.9,
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
    reason:
      "Текст похож на тренировку или развитие физической формы.",
    sourceRule: "vo-physical-fitness-keyword-rule",
  },
  {
    id: "vo-daily-mobility",
    label: "Ежедневная подвижность",
    domain: "mobility",
    relevance: 0.8,
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
    reason:
      "Текст содержит признаки прогулки, ходьбы, дистанции или подъёма по этажам.",
    sourceRule: "vo-daily-mobility-keyword-rule",
  },
  {
    id: "vo-health-recovery",
    label: "Здоровье и восстановление",
    domain: "health",
    relevance: 0.74,
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
    categoryIds: ["category-health-signal"],
    categoryDomains: ["health"],
    reason:
      "Текст содержит health/symptom signal. Это только candidate object, не диагноз и не state fact.",
    sourceRule: "vo-health-recovery-signal-rule",
  },
  {
    id: "vo-nutrition",
    label: "Питание",
    domain: "nutrition",
    relevance: 0.84,
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
    reason:
      "Текст связан с едой, напитками или приёмом пищи.",
    sourceRule: "vo-nutrition-keyword-rule",
  },
  {
    id: "vo-family-care",
    label: "Семья и забота",
    domain: "family",
    relevance: 0.87,
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
    ],
    categoryIds: ["category-family-caregiving"],
    categoryDomains: ["family"],
    reason:
      "Текст связан с семейной заботой, childcare/caregiving или обучением ребёнка.",
    sourceRule: "vo-family-care-keyword-rule",
  },
  {
    id: "vo-purchases-points",
    label: "Покупки и points",
    domain: "purchase",
    relevance: 0.86,
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
    reason:
      "Текст связан с покупкой, деньгами, продавцом, points или будущим подтверждением покупки.",
    sourceRule: "vo-purchases-points-keyword-rule",
  },
];

function normalizeForMatching(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function keywordMatches(normalizedText: string, keywords: string[]): boolean {
  return keywords.some((keyword) => normalizedText.includes(keyword.toLowerCase()));
}

function categoryMatches(
  rule: ValueObjectRule,
  categoryCandidates: LocalCategoryCandidate[],
): boolean {
  return categoryCandidates.some(
    (candidate) =>
      rule.categoryIds.includes(candidate.id) ||
      rule.categoryDomains.includes(candidate.domain),
  );
}

function createValueObjectCandidate(
  rule: ValueObjectRule,
  hasCategoryMatch: boolean,
): ValueObjectCandidate {
  const categoryBoost = hasCategoryMatch ? 0.04 : 0;
  const relevance = Math.min(0.99, Number((rule.relevance + categoryBoost).toFixed(2)));

  return {
    id: rule.id,
    label: rule.label,
    domain: rule.domain,
    relevance,
    reason: hasCategoryMatch
      ? `${rule.reason} Также совпал локальный category candidate.`
      : rule.reason,
    status: "candidate",
  };
}

function dedupeValueObjectCandidates(
  candidates: ValueObjectCandidate[],
): ValueObjectCandidate[] {
  const seenIds = new Set<string>();

  return candidates.filter((candidate) => {
    if (seenIds.has(candidate.id)) {
      return false;
    }

    seenIds.add(candidate.id);
    return true;
  });
}

export function mapValueObjectCandidates(
  rawText: string,
  categoryCandidates: LocalCategoryCandidate[] = [],
): ValueObjectCandidate[] {
  const normalizedText = normalizeForMatching(rawText);

  if (normalizedText.length === 0 && categoryCandidates.length === 0) {
    return [];
  }

  const candidates = VALUE_OBJECT_RULES.filter((rule) => {
    const hasKeywordMatch = keywordMatches(normalizedText, rule.keywords);
    const hasCategoryMatch = categoryMatches(rule, categoryCandidates);

    return hasKeywordMatch || hasCategoryMatch;
  }).map((rule) =>
    createValueObjectCandidate(rule, categoryMatches(rule, categoryCandidates)),
  );

  return dedupeValueObjectCandidates(candidates).sort(
    (firstCandidate, secondCandidate) =>
      secondCandidate.relevance - firstCandidate.relevance,
  );
}
