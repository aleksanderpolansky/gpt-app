import type {
  ReviewConfidenceLevel,
  ReviewDomain,
  ReviewMetricKind,
  ReviewPackage,
} from "./activity-review-types";

export const ACTIVITY_REVIEW_FIXTURES_CREATED =
  "ACTIVITY_REVIEW_FIXTURES_CREATED" as const;

interface ReviewFixtureSeed {
  id: string;
  rawId: string;
  rawText: string;
  title: string;
  summary: string;
  domain: ReviewDomain;
  domainLabel: string;
  contextLabel?: string;
  durationMinutes?: number;
  primaryChipLabel: string;
  primaryChipReason: string;
  primaryChipSourceRule: string;
  secondaryChipLabel: string;
  secondaryChipKind: "context" | "role" | "privacy" | "status";
  secondaryChipDomain: ReviewDomain;
  secondaryChipReason: string;
  secondaryChipSourceRule: string;
  metricLabel?: string;
  metricValue?: string;
  metricKind?: ReviewMetricKind;
  confidenceLevel: ReviewConfidenceLevel;
  confidenceScore: number;
  confidenceLabel: string;
  confidenceExplanation: string;
  question: string;
  questionReason: string;
  valueObjectId: string;
  valueObjectLabel: string;
  valueObjectRelevance: number;
  safetyLabel: string;
  safetyDescription: string;
}

const reviewFixtureActions = [
  {
    id: "action-confirm-locally",
    kind: "confirm_locally",
    label: "Confirm locally",
    description: "Локально отметить, что интерпретация выглядит правильно.",
    availability: "local_only",
  },
  {
    id: "action-correct",
    kind: "correct",
    label: "Correct",
    description: "Исправить локальную интерпретацию до будущего write gate.",
    availability: "local_only",
  },
  {
    id: "action-merge-later",
    kind: "merge_later",
    label: "Merge later",
    description: "Отложить объединение похожих Value Object candidates.",
    availability: "disabled",
    disabledReason: "Merge будет доступен в отдельном Semantic Review gate.",
  },
  {
    id: "action-reject",
    kind: "reject",
    label: "Reject",
    description: "Отклонить локальный кандидат.",
    availability: "local_only",
  },
  {
    id: "action-ask-later",
    kind: "ask_later",
    label: "Ask later",
    description: "Вернуться к уточнениям позже.",
    availability: "local_only",
  },
] satisfies ReviewPackage["actions"];

const noHiddenWriteSafetyNote = {
  id: "safety-no-hidden-writes",
  label: "No hidden writes",
  description:
    "Эта карточка ничего не сохраняет, не создаёт Activity Event и не создаёт Value Objects.",
} satisfies ReviewPackage["safetyNotes"][number];

const languageFixtureSeed: ReviewFixtureSeed = {
  id: "review-fixture-language-german-client-email",
  rawId: "local-activity-german-client-email",
  rawText: "Немецкий 40 минут: Babbel, письмо клиенту, выписал 5 фраз для B2B.",
  title: "Немецкий 40 минут",
  summary: "Похоже на языковую учебную активность с деловым контекстом.",
  domain: "language",
  domainLabel: "Языки / обучение",
  contextLabel: "Работа / B2B",
  durationMinutes: 40,
  primaryChipLabel: "Языки",
  primaryChipReason: "В тексте есть немецкий, Babbel и фразы.",
  primaryChipSourceRule: "fixture-language-keyword-rule",
  secondaryChipLabel: "candidate, not truth",
  secondaryChipKind: "status",
  secondaryChipDomain: "general",
  secondaryChipReason: "Это локальная review-карточка без сохранения.",
  secondaryChipSourceRule: "fixture-safety-status-rule",
  metricLabel: "Учебные элементы",
  metricValue: "5 фраз",
  metricKind: "learning_items",
  confidenceLevel: "high",
  confidenceScore: 0.86,
  confidenceLabel: "Высокая уверенность",
  confidenceExplanation:
    "Есть явная длительность, домен языка, инструмент обучения и деловой контекст.",
  question:
    "Эти 5 фраз нужно связать с немецким, B2B-продажами или обоими направлениями?",
  questionReason:
    "Одна активность может обслуживать несколько Value Objects, но это всё ещё кандидат.",
  valueObjectId: "vo-german-language",
  valueObjectLabel: "Немецкий язык",
  valueObjectRelevance: 0.94,
  safetyLabel: "Candidate package",
  safetyDescription:
    "Нормализация, chips, metrics и Value Object links являются кандидатами, а не истиной.",
};

const reviewFixtureSeeds: ReviewFixtureSeed[] = [
  languageFixtureSeed,
  {
    id: "review-fixture-workout-pullups-dips",
    rawId: "local-activity-workout-pullups-dips",
    rawText:
      "Тренировка 20 минут: 8 подтягиваний, 8 отжиманий на брусьях, планка 1 минута.",
    title: "Тренировка 20 минут",
    summary:
      "Похоже на короткую силовую тренировку с подтягиваниями, брусьями и планкой.",
    domain: "fitness",
    domainLabel: "Физическая активность",
    contextLabel: "Дом / микротренировка",
    durationMinutes: 20,
    primaryChipLabel: "Фитнес",
    primaryChipReason:
      "В тексте есть тренировка, подтягивания, брусья и планка.",
    primaryChipSourceRule: "fixture-fitness-keyword-rule",
    secondaryChipLabel: "private",
    secondaryChipKind: "privacy",
    secondaryChipDomain: "health",
    secondaryChipReason:
      "Физическая активность может относиться к личным health/fitness данным.",
    secondaryChipSourceRule: "fixture-fitness-privacy-rule",
    metricLabel: "Подтягивания",
    metricValue: "8",
    metricKind: "count",
    confidenceLevel: "high",
    confidenceScore: 0.88,
    confidenceLabel: "Высокая уверенность",
    confidenceExplanation:
      "Есть явный фитнес-домен, длительность и количественные показатели.",
    question: "Это была лёгкая, средняя или тяжёлая нагрузка?",
    questionReason:
      "Интенсивность нужна для будущей аналитики восстановления, но сейчас не является обязательной.",
    valueObjectId: "vo-physical-development",
    valueObjectLabel: "Физическое развитие",
    valueObjectRelevance: 0.91,
    safetyLabel: "No diagnosis",
    safetyDescription:
      "Карточка не делает медицинских выводов и не оценивает восстановление как факт.",
  },
  {
    id: "review-fixture-food-breakfast",
    rawId: "local-activity-food-breakfast",
    rawText: "Завтрак дома: омлет из двух яиц, хлеб, кофе.",
    title: "Завтрак дома",
    summary: "Похоже на запись питания: омлет, хлеб и кофе в домашнем контексте.",
    domain: "nutrition",
    domainLabel: "Еда / питание",
    contextLabel: "Дом",
    primaryChipLabel: "Питание",
    primaryChipReason: "В тексте есть завтрак, омлет, хлеб и кофе.",
    primaryChipSourceRule: "fixture-nutrition-keyword-rule",
    secondaryChipLabel: "private",
    secondaryChipKind: "privacy",
    secondaryChipDomain: "nutrition",
    secondaryChipReason: "Питание относится к личным данным пользователя.",
    secondaryChipSourceRule: "fixture-nutrition-privacy-rule",
    metricLabel: "Яйца",
    metricValue: "2",
    metricKind: "count",
    confidenceLevel: "medium",
    confidenceScore: 0.76,
    confidenceLabel: "Средняя уверенность",
    confidenceExplanation:
      "Домен питания понятен, но нет веса порций и точного состава блюда.",
    question:
      "Нужно ли уточнить вес хлеба, количество кофе или способ приготовления омлета?",
    questionReason:
      "Для будущего нутриционного анализа нужны порции, но UI-5 пока только review.",
    valueObjectId: "vo-nutrition",
    valueObjectLabel: "Питание",
    valueObjectRelevance: 0.9,
    safetyLabel: "No medical truth",
    safetyDescription:
      "Карточка не делает медицинских или гормональных выводов.",
  },
  {
    id: "review-fixture-work-csp-invoices",
    rawId: "local-activity-work-csp-invoices",
    rawText:
      "Работа CSP 2 часа: проверял немецкие счета за газ и электричество.",
    title: "Работа CSP 2 часа",
    summary:
      "Похоже на рабочую back-office активность с немецкими счетами за газ и электричество.",
    domain: "work",
    domainLabel: "Работа / B2B",
    contextLabel: "CSP",
    durationMinutes: 120,
    primaryChipLabel: "Работа",
    primaryChipReason: "В тексте есть работа, CSP и счета.",
    primaryChipSourceRule: "fixture-work-keyword-rule",
    secondaryChipLabel: "organization",
    secondaryChipKind: "privacy",
    secondaryChipDomain: "work",
    secondaryChipReason:
      "Рабочие данные могут иметь организационный уровень приватности.",
    secondaryChipSourceRule: "fixture-work-privacy-rule",
    confidenceLevel: "high",
    confidenceScore: 0.84,
    confidenceLabel: "Высокая уверенность",
    confidenceExplanation:
      "Есть явная длительность, рабочий контекст и конкретный тип задачи.",
    question:
      "Это была активная работа или фоновая работа с параллельным обучением?",
    questionReason:
      "Режим работы важен для будущей аналитики внимания, но сейчас не обязателен.",
    valueObjectId: "vo-csp-work",
    valueObjectLabel: "CSP back-office",
    valueObjectRelevance: 0.88,
    safetyLabel: "Privacy caution",
    safetyDescription:
      "Рабочие детали могут быть приватными или организационными и требуют отдельного privacy gate.",
  },
  {
    id: "review-fixture-family-math-childcare",
    rawId: "local-activity-family-math-childcare",
    rawText: "30 минут занимался математикой с ребёнком, помогал решить задачи.",
    title: "Математика с ребёнком 30 минут",
    summary:
      "Похоже на семейную активность: помощь ребёнку с математикой и учебными задачами.",
    domain: "family",
    domainLabel: "Семья / забота",
    contextLabel: "Childcare / parental care",
    durationMinutes: 30,
    primaryChipLabel: "Семья",
    primaryChipReason: "В тексте есть ребёнок и совместное занятие.",
    primaryChipSourceRule: "fixture-family-keyword-rule",
    secondaryChipLabel: "Childcare",
    secondaryChipKind: "role",
    secondaryChipDomain: "family",
    secondaryChipReason:
      "Занятие с ребёнком имеет социально-ролевой смысл заботы и опеки.",
    secondaryChipSourceRule: "fixture-role-childcare-rule",
    confidenceLevel: "high",
    confidenceScore: 0.85,
    confidenceLabel: "Высокая уверенность",
    confidenceExplanation:
      "Есть явная длительность, ребёнок, учебный объект и роль заботы.",
    question:
      "Это нужно учитывать больше как обучение ребёнка, семейную заботу или оба смысла?",
    questionReason:
      "Одна активность может иметь несколько аналитических проекций без дублирования времени.",
    valueObjectId: "vo-family-care",
    valueObjectLabel: "Семья / забота",
    valueObjectRelevance: 0.92,
    safetyLabel: "Private by default",
    safetyDescription:
      "Семейный контекст должен рассматриваться как приватный до отдельного privacy gate.",
  },
  {
    id: "review-fixture-purchase-certificate",
    rawId: "local-activity-purchase-certificate",
    rawText:
      "Купил одноразовую посуду на 120 злотых, нужно подтвердить у продавца.",
    title: "Покупка одноразовой посуды",
    summary: "Похоже на покупку, связанную с будущим подтверждением у продавца.",
    domain: "purchase",
    domainLabel: "Покупка / деньги",
    contextLabel: "Purchase confirmation candidate",
    primaryChipLabel: "Покупка",
    primaryChipReason: "В тексте есть купил, сумма и продавец.",
    primaryChipSourceRule: "fixture-purchase-keyword-rule",
    secondaryChipLabel: "public-safe later",
    secondaryChipKind: "privacy",
    secondaryChipDomain: "purchase",
    secondaryChipReason:
      "Публичная история покупок возможна только после маскирования покупателя и отдельного gate.",
    secondaryChipSourceRule: "fixture-public-purchase-privacy-rule",
    metricLabel: "Сумма",
    metricValue: "120 PLN",
    metricKind: "general",
    confidenceLevel: "medium",
    confidenceScore: 0.79,
    confidenceLabel: "Средняя уверенность",
    confidenceExplanation:
      "Покупка и сумма понятны, но продавец, чек и статус подтверждения не указаны.",
    question: "У какого продавца была покупка и есть ли подтверждение или чек?",
    questionReason:
      "Для будущего purchase confirmation нужны продавец и доказательство покупки.",
    valueObjectId: "vo-disposable-tableware",
    valueObjectLabel: "Одноразовая посуда",
    valueObjectRelevance: 0.86,
    safetyLabel: "No commercial write",
    safetyDescription:
      "Карточка не создаёт purchase confirmation, points operation или certificate.",
  },
];

function createReviewFixture(seed: ReviewFixtureSeed): ReviewPackage {
  const normalizedActivity: ReviewPackage["normalizedActivity"] = {
    title: seed.title,
    summary: seed.summary,
    domain: seed.domain,
    domainLabel: seed.domainLabel,
    statusLabel: "Локальный кандидат",
  };

  if (seed.contextLabel !== undefined) {
    normalizedActivity.contextLabel = seed.contextLabel;
  }

  if (seed.durationMinutes !== undefined) {
    normalizedActivity.durationMinutes = seed.durationMinutes;
  }

  const metrics: ReviewPackage["metrics"] = [];

  if (seed.durationMinutes !== undefined) {
    metrics.push({
      id: `${seed.id}-duration`,
      label: "Длительность",
      value: `${seed.durationMinutes} минут`,
      kind: "duration",
      numericValue: seed.durationMinutes,
      unitLabel: "минут",
      reason: "В тексте найдено возможное указание длительности.",
      sourceRule: "fixture-duration-rule",
    });
  }

  if (
    seed.metricLabel !== undefined &&
    seed.metricValue !== undefined &&
    seed.metricKind !== undefined
  ) {
    metrics.push({
      id: `${seed.id}-metric`,
      label: seed.metricLabel,
      value: seed.metricValue,
      kind: seed.metricKind,
      reason: "В тексте найден возможный дополнительный показатель.",
      sourceRule: "fixture-metric-rule",
    });
  }

  return {
    id: seed.id,
    status: "candidate",
    rawActivity: {
      id: seed.rawId,
      rawText: seed.rawText,
      localCreatedAt: "2026-06-02T10:00:00.000Z",
      source: "local",
      status: "preview",
    },
    normalizedActivity,
    semanticChips: [
      {
        id: `${seed.id}-primary-chip`,
        label: seed.primaryChipLabel,
        kind: "domain",
        domain: seed.domain,
        confidence: 0.9,
        status: "suggested",
        reason: seed.primaryChipReason,
        sourceRule: seed.primaryChipSourceRule,
      },
      {
        id: `${seed.id}-secondary-chip`,
        label: seed.secondaryChipLabel,
        kind: seed.secondaryChipKind,
        domain: seed.secondaryChipDomain,
        confidence: 0.72,
        status: "needs_review",
        reason: seed.secondaryChipReason,
        sourceRule: seed.secondaryChipSourceRule,
      },
    ],
    metrics,
    confidence: {
      level: seed.confidenceLevel,
      score: seed.confidenceScore,
      label: seed.confidenceLabel,
      explanation: seed.confidenceExplanation,
      sourceRule: "fixture-confidence-rule",
    },
    clarifyingQuestions: [
      {
        id: `${seed.id}-question`,
        kind: "general",
        question: seed.question,
        reason: seed.questionReason,
        required: false,
      },
    ],
    linkedValueObjectCandidates: [
      {
        id: seed.valueObjectId,
        label: seed.valueObjectLabel,
        domain: seed.domain,
        domainLabel: seed.domainLabel,
        relevance: seed.valueObjectRelevance,
        reason: "Связь предложена как локальный Value Object candidate.",
        status: "candidate",
      },
    ],
    actions: reviewFixtureActions,
    safetyNotes: [
      noHiddenWriteSafetyNote,
      {
        id: `${seed.id}-safety-note`,
        label: seed.safetyLabel,
        description: seed.safetyDescription,
      },
    ],
  };
}

export const activityReviewFixtures: ReviewPackage[] =
  reviewFixtureSeeds.map(createReviewFixture);

export const defaultActivityReviewFixture: ReviewPackage =
  createReviewFixture(languageFixtureSeed);

export function getActivityReviewFixtureById(
  fixtureId: string,
): ReviewPackage | undefined {
  return activityReviewFixtures.find((fixture) => fixture.id === fixtureId);
}
