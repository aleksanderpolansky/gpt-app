import type {
  ActivityDomain,
  LocalParserResult,
  PrivacyLevel,
  UnknownTermSuggestedAction,
} from "../activity-capture/activity-capture-types";
import type {
  LinkedValueObjectCandidate,
  ReviewAction,
  ReviewChip,
  ReviewConfidence,
  ReviewMetric,
  ReviewPackage,
  ReviewQuestion,
  ReviewSafetyNote,
} from "./activity-review-types";

export const ACTIVITY_REVIEW_NORMALIZER_CREATED =
  "ACTIVITY_REVIEW_NORMALIZER_CREATED" as const;

const DEFAULT_REVIEW_DOMAIN: ActivityDomain = "general";
const DEFAULT_REVIEW_STATUS_LABEL = "Локальный кандидат";

function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

function formatDomainLabel(domain: ActivityDomain): string {
  const labels: Record<ActivityDomain, string> = {
    language: "Языки / обучение",
    health: "Здоровье",
    fitness: "Физическая активность",
    nutrition: "Еда / питание",
    work: "Работа / B2B",
    family: "Семья / забота",
    money: "Деньги",
    purchase: "Покупка / деньги",
    time: "Время",
    mobility: "Мобильность / движение",
    recovery: "Восстановление",
    unknown: "Неизвестный домен",
    general: "Общая активность",
  };

  return labels[domain];
}

function formatPrivacyLabel(privacyLevel: PrivacyLevel): string {
  const labels: Record<PrivacyLevel, string> = {
    private: "private",
    sensitive: "sensitive",
    organization: "organization",
    "public-safe": "public-safe later",
  };

  return labels[privacyLevel];
}

function formatUnknownActionLabel(action: UnknownTermSuggestedAction): string {
  const labels: Record<UnknownTermSuggestedAction, string> = {
    ask_later: "ask later",
    needs_review: "needs review",
  };

  return labels[action];
}

function createSafeId(value: string, fallback: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : fallback;
}

function buildReviewPackageId(input: LocalParserResult): string {
  return `review-${input.draft.id}`;
}

function buildSummary(input: LocalParserResult): string {
  const contextPart =
    input.draft.contextLabel !== undefined
      ? ` Контекст: ${input.draft.contextLabel}.`
      : "";

  return `Я понял это как: ${input.normalizedTitle}.${contextPart}`;
}

function inferDomain(input: LocalParserResult): ActivityDomain {
  const firstCategoryDomain = input.categoryCandidates[0]?.domain;
  const firstValueObjectDomain = input.valueObjectCandidates[0]?.domain;

  return firstCategoryDomain ?? firstValueObjectDomain ?? DEFAULT_REVIEW_DOMAIN;
}

function buildNormalizedActivity(
  input: LocalParserResult,
): ReviewPackage["normalizedActivity"] {
  const domain = inferDomain(input);

  const normalizedActivity: ReviewPackage["normalizedActivity"] = {
    title: input.normalizedTitle,
    summary: buildSummary(input),
    domain,
    domainLabel: formatDomainLabel(domain),
    statusLabel: DEFAULT_REVIEW_STATUS_LABEL,
  };

  if (input.draft.contextLabel !== undefined) {
    normalizedActivity.contextLabel = input.draft.contextLabel;
  }

  if (input.draft.durationMinutes !== undefined) {
    normalizedActivity.durationMinutes = input.draft.durationMinutes;
  }

  return normalizedActivity;
}

function mapCategoryChips(input: LocalParserResult): ReviewChip[] {
  return input.categoryCandidates.map((candidate) => ({
    id: `category-chip-${candidate.id}`,
    label: candidate.label,
    kind: "domain",
    domain: candidate.domain,
    confidence: candidate.confidence,
    status: candidate.status,
    reason: candidate.reason,
    sourceRule: candidate.sourceRule,
  }));
}

function mapPrivacyChips(input: LocalParserResult): ReviewChip[] {
  return input.privacyHints.map((hint) => ({
    id: `privacy-chip-${hint.id}`,
    label: formatPrivacyLabel(hint.privacyLevel),
    kind: "privacy",
    domain: hint.domain,
    confidence: 0.7,
    status: "needs_review",
    privacyLevel: hint.privacyLevel,
    reason: hint.reason,
    sourceRule: "review-normalizer-privacy-hint-rule",
  }));
}

function mapUnknownTermChips(input: LocalParserResult): ReviewChip[] {
  return input.unknownTermCandidates.map((candidate, index) => {
    const fallbackId = `unknown-term-${index + 1}`;

    return {
      id: `unknown-chip-${createSafeId(candidate.term, fallbackId)}`,
      label: candidate.term,
      kind: "unknown",
      domain: DEFAULT_REVIEW_DOMAIN,
      confidence: 0.35,
      status: "needs_review",
      reason: `${candidate.reason} Suggested action: ${formatUnknownActionLabel(
        candidate.suggestedAction,
      )}.`,
      sourceRule: "review-normalizer-unknown-term-rule",
    };
  });
}

function buildSemanticChips(input: LocalParserResult): ReviewChip[] {
  const chips = [
    ...mapCategoryChips(input),
    ...mapPrivacyChips(input),
    ...mapUnknownTermChips(input),
  ];

  if (chips.length > 0) {
    return chips;
  }

  return [
    {
      id: "review-chip-candidate-status",
      label: "candidate, not truth",
      kind: "status",
      domain: DEFAULT_REVIEW_DOMAIN,
      confidence: 1,
      status: "candidate",
      reason:
        "UI-5 показывает локальный review package без сохранения и без подтверждения истины.",
      sourceRule: "review-normalizer-default-candidate-status-rule",
    },
  ];
}

function mapDurationMetrics(input: LocalParserResult): ReviewMetric[] {
  return input.durationHints.map((hint) => ({
    id: `review-metric-${hint.id}`,
    label: hint.label,
    value: `${hint.minutes} минут`,
    kind: "duration",
    numericValue: hint.minutes,
    unitLabel: "минут",
    reason: hint.reason,
    sourceRule: hint.sourceRule,
  }));
}

function mapGenericMetrics(input: LocalParserResult): ReviewMetric[] {
  return input.metricHints.map((hint) => ({
    id: `review-metric-${hint.id}`,
    label: hint.label,
    value: hint.value,
    kind: "general",
    reason: hint.reason,
    sourceRule: hint.sourceRule,
  }));
}

function buildMetrics(input: LocalParserResult): ReviewMetric[] {
  return [...mapDurationMetrics(input), ...mapGenericMetrics(input)];
}

function buildConfidence(input: LocalParserResult): ReviewConfidence {
  const score = clampScore(
    0.35 +
      input.categoryCandidates.length * 0.12 +
      input.valueObjectCandidates.length * 0.1 +
      input.durationHints.length * 0.12 +
      input.metricHints.length * 0.06 -
      input.unknownTermCandidates.length * 0.08,
  );

  if (score >= 0.78) {
    return {
      level: "high",
      score,
      label: "Высокая уверенность",
      explanation:
        "Есть несколько локальных сигналов: категории, метрики, длительность или Value Object candidates.",
      sourceRule: "review-normalizer-confidence-high-rule",
    };
  }

  if (score >= 0.55) {
    return {
      level: "medium",
      score,
      label: "Средняя уверенность",
      explanation:
        "Есть часть локальных сигналов, но некоторые элементы требуют проверки пользователем.",
      sourceRule: "review-normalizer-confidence-medium-rule",
    };
  }

  return {
    level: "low",
    score,
    label: "Низкая уверенность",
    explanation:
      "Parser нашёл мало надёжных сигналов или есть неизвестные термины.",
    sourceRule: "review-normalizer-confidence-low-rule",
  };
}

function buildClarifyingQuestions(input: LocalParserResult): ReviewQuestion[] {
  const questions: ReviewQuestion[] = [];

  if (
    input.durationHints.length === 0 &&
    input.draft.durationMinutes === undefined
  ) {
    questions.push({
      id: "review-question-duration-missing",
      kind: "duration_missing",
      question: "Сколько примерно длилась эта активность?",
      reason:
        "Длительность не найдена в тексте, но она важна для будущей аналитики времени.",
      required: false,
    });
  }

  if (input.draft.contextLabel === undefined) {
    questions.push({
      id: "review-question-context-ambiguous",
      kind: "context_ambiguous",
      question:
        "В каком контексте это происходило: работа, дом, обучение, здоровье или семья?",
      reason:
        "Контекст помогает отличить похожие активности и будущие Value Objects.",
      required: false,
    });
  }

  input.unknownTermCandidates.forEach((candidate, index) => {
    const fallbackId = `unknown-term-${index + 1}`;

    questions.push({
      id: `review-question-${createSafeId(candidate.term, fallbackId)}`,
      kind: "unknown_term",
      question: `Что означает “${candidate.term}” в этой записи?`,
      reason: candidate.reason,
      required: false,
    });
  });

  if (input.privacyHints.length > 0) {
    questions.push({
      id: "review-question-privacy",
      kind: "privacy_caution",
      question: "Нужно ли считать эту активность приватной по умолчанию?",
      reason:
        "Parser нашёл privacy hints; перед будущим сохранением потребуется отдельный privacy gate.",
      required: false,
    });
  }

  return questions;
}

function buildLinkedValueObjectCandidates(
  input: LocalParserResult,
): LinkedValueObjectCandidate[] {
  return input.valueObjectCandidates.map((candidate) => ({
    id: candidate.id,
    label: candidate.label,
    domain: candidate.domain,
    domainLabel: formatDomainLabel(candidate.domain),
    relevance: candidate.relevance,
    reason: candidate.reason,
    status: candidate.status,
  }));
}

function buildActions(): ReviewAction[] {
  return [
    {
      id: "review-action-confirm-locally",
      kind: "confirm_locally",
      label: "Confirm locally",
      description: "Локально отметить, что интерпретация выглядит правильно.",
      availability: "local_only",
    },
    {
      id: "review-action-correct",
      kind: "correct",
      label: "Correct",
      description: "Исправить локальную интерпретацию перед будущим write gate.",
      availability: "local_only",
    },
    {
      id: "review-action-merge-later",
      kind: "merge_later",
      label: "Merge later",
      description: "Отложить объединение похожих Value Object candidates.",
      availability: "disabled",
      disabledReason: "Merge будет доступен в отдельном Semantic Review gate.",
    },
    {
      id: "review-action-reject",
      kind: "reject",
      label: "Reject",
      description: "Отклонить локальный кандидат.",
      availability: "local_only",
    },
    {
      id: "review-action-ask-later",
      kind: "ask_later",
      label: "Ask later",
      description: "Вернуться к уточнениям позже.",
      availability: "local_only",
    },
  ];
}

function buildSafetyNotes(input: LocalParserResult): ReviewSafetyNote[] {
  const safetyNotes: ReviewSafetyNote[] = [
    {
      id: "review-safety-no-hidden-writes",
      label: "No hidden writes",
      description:
        "UI-5 ничего не сохраняет, не создаёт Activity Event и не создаёт Value Objects.",
    },
    {
      id: "review-safety-candidate-package",
      label: "Candidate package",
      description:
        "Нормализация, chips, metrics и Value Object links являются кандидатами, а не истиной.",
    },
  ];

  input.explanation.forEach((explanation, index) => {
    safetyNotes.push({
      id: `review-safety-parser-explanation-${index + 1}`,
      label: "Parser explanation",
      description: explanation,
    });
  });

  return safetyNotes;
}

export function normalizeLocalParserResultToReviewPackage(
  input: LocalParserResult,
): ReviewPackage {
  return {
    id: buildReviewPackageId(input),
    status: "candidate",
    rawActivity: {
      id: input.draft.id,
      rawText: input.draft.rawText,
      localCreatedAt: input.draft.localCreatedAt,
      source: input.draft.source,
      status: input.draft.status,
    },
    normalizedActivity: buildNormalizedActivity(input),
    semanticChips: buildSemanticChips(input),
    metrics: buildMetrics(input),
    confidence: buildConfidence(input),
    clarifyingQuestions: buildClarifyingQuestions(input),
    linkedValueObjectCandidates: buildLinkedValueObjectCandidates(input),
    actions: buildActions(),
    safetyNotes: buildSafetyNotes(input),
  };
}
