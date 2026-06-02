import type {
  ReviewConfidence,
  ReviewConfidenceLevel,
  ReviewMetric,
  ReviewMetricKind,
} from "./activity-review-types";

export const ACTIVITY_REVIEW_METRICS_CREATED =
  "ACTIVITY_REVIEW_METRICS_CREATED" as const;

export type ReviewMetricTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "muted";

export interface ReviewMetricViewModel {
  id: string;
  label: string;
  value: string;
  kind: ReviewMetricKind;
  kindLabel: string;
  tone: ReviewMetricTone;
  reason: string;
  sourceRule: string;
  ariaLabel: string;
}

export interface ReviewMetricsSummary {
  totalCount: number;
  durationCount: number;
  countMetricCount: number;
  distanceCount: number;
  floorsCount: number;
  learningItemsCount: number;
  generalCount: number;
  hasDuration: boolean;
  hasQuantifiedMetrics: boolean;
  summaryText: string;
}

export interface ReviewConfidenceViewModel {
  level: ReviewConfidenceLevel;
  levelLabel: string;
  score: number;
  percent: number;
  tone: ReviewMetricTone;
  label: string;
  explanation: string;
  sourceRule: string;
  ariaLabel: string;
}

const METRIC_KIND_ORDER: ReviewMetricKind[] = [
  "duration",
  "count",
  "distance",
  "floors",
  "learning_items",
  "general",
];

const METRIC_KIND_LABELS: Record<ReviewMetricKind, string> = {
  duration: "Длительность",
  count: "Количество",
  distance: "Расстояние",
  floors: "Этажи",
  learning_items: "Учебные элементы",
  general: "Общая метрика",
};

const CONFIDENCE_LEVEL_LABELS: Record<ReviewConfidenceLevel, string> = {
  high: "Высокая уверенность",
  medium: "Средняя уверенность",
  low: "Низкая уверенность",
};

function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(1, score));
}

function getMetricKindRank(kind: ReviewMetricKind): number {
  const index = METRIC_KIND_ORDER.indexOf(kind);
  return index === -1 ? METRIC_KIND_ORDER.length : index;
}

export function getReviewMetricKindLabel(kind: ReviewMetricKind): string {
  return METRIC_KIND_LABELS[kind];
}

export function getReviewMetricTone(metric: ReviewMetric): ReviewMetricTone {
  if (metric.kind === "duration") {
    return "accent";
  }

  if (
    metric.kind === "count" ||
    metric.kind === "distance" ||
    metric.kind === "floors" ||
    metric.kind === "learning_items"
  ) {
    return "success";
  }

  if (metric.numericValue !== undefined && metric.numericValue < 0) {
    return "warning";
  }

  return "neutral";
}

export function getReviewConfidenceTone(
  level: ReviewConfidenceLevel,
): ReviewMetricTone {
  if (level === "high") {
    return "success";
  }

  if (level === "medium") {
    return "accent";
  }

  return "warning";
}

export function getReviewConfidenceLevelLabel(
  level: ReviewConfidenceLevel,
): string {
  return CONFIDENCE_LEVEL_LABELS[level];
}

export function formatReviewMetricValue(metric: ReviewMetric): string {
  if (metric.unitLabel !== undefined && metric.numericValue !== undefined) {
    return `${metric.numericValue} ${metric.unitLabel}`;
  }

  return metric.value;
}

export function sortReviewMetrics(metrics: ReviewMetric[]): ReviewMetric[] {
  return [...metrics].sort((firstMetric, secondMetric) => {
    const kindDifference =
      getMetricKindRank(firstMetric.kind) - getMetricKindRank(secondMetric.kind);

    if (kindDifference !== 0) {
      return kindDifference;
    }

    return firstMetric.label.localeCompare(secondMetric.label);
  });
}

export function mapReviewMetricToViewModel(
  metric: ReviewMetric,
): ReviewMetricViewModel {
  const kindLabel = getReviewMetricKindLabel(metric.kind);
  const value = formatReviewMetricValue(metric);

  return {
    id: metric.id,
    label: metric.label,
    value,
    kind: metric.kind,
    kindLabel,
    tone: getReviewMetricTone(metric),
    reason: metric.reason,
    sourceRule: metric.sourceRule,
    ariaLabel: `${kindLabel}: ${metric.label}, ${value}.`,
  };
}

export function mapReviewMetricsToViewModels(
  metrics: ReviewMetric[],
): ReviewMetricViewModel[] {
  return sortReviewMetrics(metrics).map(mapReviewMetricToViewModel);
}

export function summarizeReviewMetrics(
  metrics: ReviewMetric[],
): ReviewMetricsSummary {
  const durationCount = metrics.filter(
    (metric) => metric.kind === "duration",
  ).length;

  const countMetricCount = metrics.filter(
    (metric) => metric.kind === "count",
  ).length;

  const distanceCount = metrics.filter(
    (metric) => metric.kind === "distance",
  ).length;

  const floorsCount = metrics.filter(
    (metric) => metric.kind === "floors",
  ).length;

  const learningItemsCount = metrics.filter(
    (metric) => metric.kind === "learning_items",
  ).length;

  const generalCount = metrics.filter(
    (metric) => metric.kind === "general",
  ).length;

  const quantifiedCount =
    countMetricCount + distanceCount + floorsCount + learningItemsCount;

  const hasDuration = durationCount > 0;
  const hasQuantifiedMetrics = quantifiedCount > 0;

  let summaryText = "Метрики пока не найдены.";

  if (metrics.length > 0) {
    summaryText = `Метрики: ${metrics.length}. Длительность: ${durationCount}. Количественные показатели: ${quantifiedCount}.`;
  }

  return {
    totalCount: metrics.length,
    durationCount,
    countMetricCount,
    distanceCount,
    floorsCount,
    learningItemsCount,
    generalCount,
    hasDuration,
    hasQuantifiedMetrics,
    summaryText,
  };
}

export function mapReviewConfidenceToViewModel(
  confidence: ReviewConfidence,
): ReviewConfidenceViewModel {
  const score = clampScore(confidence.score);
  const percent = Math.round(score * 100);
  const levelLabel = getReviewConfidenceLevelLabel(confidence.level);

  return {
    level: confidence.level,
    levelLabel,
    score,
    percent,
    tone: getReviewConfidenceTone(confidence.level),
    label: confidence.label,
    explanation: confidence.explanation,
    sourceRule: confidence.sourceRule,
    ariaLabel: `${levelLabel}: ${percent}%. ${confidence.explanation}`,
  };
}

export function getPrimaryReviewMetric(
  metrics: ReviewMetric[],
): ReviewMetric | undefined {
  const sortedMetrics = sortReviewMetrics(metrics);
  return sortedMetrics[0];
}

export function getDurationReviewMetric(
  metrics: ReviewMetric[],
): ReviewMetric | undefined {
  return metrics.find((metric) => metric.kind === "duration");
}

export function getVisibleReviewMetrics(
  metrics: ReviewMetricViewModel[],
  maxVisibleMetrics: number,
): ReviewMetricViewModel[] {
  if (maxVisibleMetrics <= 0) {
    return [];
  }

  return metrics.slice(0, maxVisibleMetrics);
}

export function countHiddenReviewMetrics(
  metrics: ReviewMetricViewModel[],
  maxVisibleMetrics: number,
): number {
  if (maxVisibleMetrics <= 0) {
    return metrics.length;
  }

  return Math.max(0, metrics.length - maxVisibleMetrics);
}
