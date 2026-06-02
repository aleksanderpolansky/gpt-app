import type {
  ReviewConfidence,
  ReviewConfidenceLevel,
  ReviewPackage,
} from "./activity-review-types";

export const ACTIVITY_REVIEW_CONFIDENCE_CREATED =
  "ACTIVITY_REVIEW_CONFIDENCE_CREATED" as const;

export type ReviewConfidenceTone =
  | "success"
  | "accent"
  | "warning"
  | "muted";

export interface ReviewConfidenceBand {
  level: ReviewConfidenceLevel;
  minScore: number;
  maxScore: number;
  label: string;
  tone: ReviewConfidenceTone;
  description: string;
}

export interface ReviewConfidenceDiagnostic {
  id: string;
  label: string;
  value: string;
  tone: ReviewConfidenceTone;
  description: string;
}

export interface ReviewConfidenceAssessment {
  level: ReviewConfidenceLevel;
  score: number;
  percent: number;
  label: string;
  tone: ReviewConfidenceTone;
  band: ReviewConfidenceBand;
  explanation: string;
  sourceRule: string;
  diagnostics: ReviewConfidenceDiagnostic[];
  recommendation: string;
  ariaLabel: string;
}

const CONFIDENCE_BANDS: ReviewConfidenceBand[] = [
  {
    level: "high",
    minScore: 0.78,
    maxScore: 1,
    label: "Высокая уверенность",
    tone: "success",
    description:
      "Локальных сигналов достаточно, но результат всё ещё остаётся candidate package.",
  },
  {
    level: "medium",
    minScore: 0.55,
    maxScore: 0.77,
    label: "Средняя уверенность",
    tone: "accent",
    description:
      "Есть полезные сигналы, но часть данных стоит проверить перед будущим write gate.",
  },
  {
    level: "low",
    minScore: 0,
    maxScore: 0.54,
    label: "Низкая уверенность",
    tone: "warning",
    description:
      "Сигналов мало или есть неоднозначности; лучше уточнить активность.",
  },
];

function clampConfidenceScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

export function getReviewConfidencePercent(confidence: ReviewConfidence): number {
  return Math.round(clampConfidenceScore(confidence.score) * 100);
}

export function inferReviewConfidenceLevel(
  score: number,
): ReviewConfidenceLevel {
  const normalizedScore = clampConfidenceScore(score);

  if (normalizedScore >= 0.78) {
    return "high";
  }

  if (normalizedScore >= 0.55) {
    return "medium";
  }

  return "low";
}

export function getReviewConfidenceBand(
  level: ReviewConfidenceLevel,
): ReviewConfidenceBand {
  const band = CONFIDENCE_BANDS.find((candidate) => candidate.level === level);

  if (band !== undefined) {
    return band;
  }

  return CONFIDENCE_BANDS[2];
}

export function getReviewConfidenceTone(
  confidence: ReviewConfidence,
): ReviewConfidenceTone {
  return getReviewConfidenceBand(confidence.level).tone;
}

export function getReviewConfidenceLevelLabel(
  level: ReviewConfidenceLevel,
): string {
  return getReviewConfidenceBand(level).label;
}

export function normalizeReviewConfidence(
  confidence: ReviewConfidence,
): ReviewConfidence {
  const score = clampConfidenceScore(confidence.score);
  const level = inferReviewConfidenceLevel(score);

  return {
    ...confidence,
    score,
    level,
    label: confidence.label.trim().length > 0
      ? confidence.label
      : getReviewConfidenceLevelLabel(level),
  };
}

function createCountDiagnostic(
  id: string,
  label: string,
  count: number,
  positiveDescription: string,
  emptyDescription: string,
): ReviewConfidenceDiagnostic {
  const hasItems = count > 0;

  return {
    id,
    label,
    value: String(count),
    tone: hasItems ? "success" : "muted",
    description: hasItems ? positiveDescription : emptyDescription,
  };
}

export function buildReviewConfidenceDiagnostics(
  reviewPackage: ReviewPackage,
): ReviewConfidenceDiagnostic[] {
  const needsReviewChipCount = reviewPackage.semanticChips.filter(
    (chip) => chip.status === "needs_review",
  ).length;

  const unknownChipCount = reviewPackage.semanticChips.filter(
    (chip) => chip.kind === "unknown",
  ).length;

  const privacyChipCount = reviewPackage.semanticChips.filter(
    (chip) => chip.kind === "privacy",
  ).length;

  return [
    createCountDiagnostic(
      "confidence-diagnostic-semantic-chips",
      "Semantic chips",
      reviewPackage.semanticChips.length,
      "Есть локальные semantic chips для объяснения интерпретации.",
      "Semantic chips пока не найдены.",
    ),
    createCountDiagnostic(
      "confidence-diagnostic-metrics",
      "Metrics",
      reviewPackage.metrics.length,
      "Есть локальные метрики или длительность.",
      "Метрики пока не найдены.",
    ),
    createCountDiagnostic(
      "confidence-diagnostic-value-objects",
      "Value Object candidates",
      reviewPackage.linkedValueObjectCandidates.length,
      "Есть связанные Value Object candidates.",
      "Связанные Value Object candidates пока не найдены.",
    ),
    {
      id: "confidence-diagnostic-questions",
      label: "Clarifying questions",
      value: String(reviewPackage.clarifyingQuestions.length),
      tone: reviewPackage.clarifyingQuestions.length > 0 ? "warning" : "success",
      description:
        reviewPackage.clarifyingQuestions.length > 0
          ? "Есть вопросы, которые стоит уточнить перед будущим сохранением."
          : "Нет обязательных уточняющих вопросов.",
    },
    {
      id: "confidence-diagnostic-needs-review",
      label: "Needs review",
      value: String(needsReviewChipCount),
      tone: needsReviewChipCount > 0 ? "warning" : "success",
      description:
        needsReviewChipCount > 0
          ? "Некоторые chips требуют проверки пользователем."
          : "Нет chips со статусом needs_review.",
    },
    {
      id: "confidence-diagnostic-unknown",
      label: "Unknown chips",
      value: String(unknownChipCount),
      tone: unknownChipCount > 0 ? "warning" : "success",
      description:
        unknownChipCount > 0
          ? "Есть неизвестные термины, которые могут снизить уверенность."
          : "Неизвестные термины не найдены.",
    },
    {
      id: "confidence-diagnostic-privacy",
      label: "Privacy chips",
      value: String(privacyChipCount),
      tone: privacyChipCount > 0 ? "warning" : "success",
      description:
        privacyChipCount > 0
          ? "Есть privacy hints; перед будущим write gate нужен privacy review."
          : "Privacy chips не найдены.",
    },
  ];
}

export function getReviewConfidenceRecommendation(
  reviewPackage: ReviewPackage,
): string {
  if (reviewPackage.confidence.level === "high") {
    return "Можно локально подтвердить интерпретацию, но не сохранять без будущего write gate.";
  }

  if (reviewPackage.confidence.level === "medium") {
    return "Стоит проверить вопросы, chips и связанные Value Object candidates.";
  }

  return "Лучше уточнить активность вручную перед любыми следующими шагами.";
}

export function buildReviewConfidenceAssessment(
  reviewPackage: ReviewPackage,
): ReviewConfidenceAssessment {
  const confidence = normalizeReviewConfidence(reviewPackage.confidence);
  const band = getReviewConfidenceBand(confidence.level);
  const percent = getReviewConfidencePercent(confidence);
  const diagnostics = buildReviewConfidenceDiagnostics(reviewPackage);
  const recommendation = getReviewConfidenceRecommendation({
    ...reviewPackage,
    confidence,
  });

  return {
    level: confidence.level,
    score: confidence.score,
    percent,
    label: confidence.label,
    tone: band.tone,
    band,
    explanation: confidence.explanation,
    sourceRule: confidence.sourceRule,
    diagnostics,
    recommendation,
    ariaLabel: `${band.label}: ${percent}%. ${recommendation}`,
  };
}

export function hasLowReviewConfidence(reviewPackage: ReviewPackage): boolean {
  return normalizeReviewConfidence(reviewPackage.confidence).level === "low";
}

export function hasReviewConfidenceWarnings(
  reviewPackage: ReviewPackage,
): boolean {
  const assessment = buildReviewConfidenceAssessment(reviewPackage);

  return assessment.diagnostics.some(
    (diagnostic) => diagnostic.tone === "warning",
  );
}

export function getReviewConfidenceSummary(
  reviewPackage: ReviewPackage,
): string {
  const assessment = buildReviewConfidenceAssessment(reviewPackage);

  return `${assessment.label}: ${assessment.percent}%. ${assessment.recommendation}`;
}
