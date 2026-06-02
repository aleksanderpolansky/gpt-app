import type {
  ReviewConfidence,
  ReviewMetric,
} from "./activity-review-types";
import {
  countHiddenReviewMetrics,
  getVisibleReviewMetrics,
  mapReviewConfidenceToViewModel,
  mapReviewMetricsToViewModels,
  summarizeReviewMetrics,
} from "./activity-review-metrics";
import type {
  ReviewConfidenceViewModel,
  ReviewMetricTone,
  ReviewMetricViewModel,
} from "./activity-review-metrics";

export const REVIEW_METRICS_SECTION_CREATED =
  "REVIEW_METRICS_SECTION_CREATED" as const;

interface ReviewMetricsSectionProps {
  metrics: ReviewMetric[];
  confidence?: ReviewConfidence;
  title?: string;
  description?: string;
  maxVisibleMetrics?: number;
  className?: string;
}

interface ReviewMetricCardProps {
  metric: ReviewMetricViewModel;
}

interface ReviewConfidencePanelProps {
  confidence: ReviewConfidenceViewModel;
}

const METRIC_TONE_CLASS_NAMES: Record<ReviewMetricTone, string> = {
  neutral:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
  accent:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  muted:
    "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400",
};

function getMetricToneClassName(tone: ReviewMetricTone): string {
  return METRIC_TONE_CLASS_NAMES[tone];
}

function buildReviewMetricsAriaSummary(
  metrics: ReviewMetricViewModel[],
  hiddenCount: number,
): string {
  const visibleCount = metrics.length;

  if (visibleCount === 0 && hiddenCount === 0) {
    return "Review metrics are not available for this local review package.";
  }

  if (hiddenCount > 0) {
    return `Review metrics visible: ${visibleCount}. Hidden metrics: ${hiddenCount}.`;
  }

  return `Review metrics visible: ${visibleCount}.`;
}

function ReviewMetricCard({ metric }: ReviewMetricCardProps) {
  return (
    <li
      className={[
        "rounded-2xl border px-4 py-3",
        getMetricToneClassName(metric.tone),
      ].join(" ")}
      aria-label={metric.ariaLabel}
      title={`${metric.reason} Source rule: ${metric.sourceRule}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">
            {metric.kindLabel}
          </p>
          <p className="mt-1 break-words text-sm font-semibold">
            {metric.label}
          </p>
        </div>

        <p className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {metric.value}
        </p>
      </div>

      <p className="mt-3 text-xs leading-5 opacity-80">{metric.reason}</p>
    </li>
  );
}

function ReviewConfidencePanel({ confidence }: ReviewConfidencePanelProps) {
  return (
    <div
      className={[
        "rounded-2xl border px-4 py-3",
        getMetricToneClassName(confidence.tone),
      ].join(" ")}
      aria-label={confidence.ariaLabel}
      title={`Source rule: ${confidence.sourceRule}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">
            Confidence
          </p>
          <p className="mt-1 text-sm font-semibold">{confidence.levelLabel}</p>
          <p className="mt-2 text-xs leading-5 opacity-80">
            {confidence.explanation}
          </p>
        </div>

        <div className="shrink-0 rounded-2xl bg-white px-4 py-3 text-center dark:bg-slate-900">
          <p className="text-2xl font-semibold text-slate-950 dark:text-slate-50">
            {confidence.percent}%
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            score
          </p>
        </div>
      </div>
    </div>
  );
}

export function ReviewMetricsSection({
  metrics,
  confidence,
  title = "Metrics and confidence",
  description = "Метрики и confidence показывают, какие числовые и качественные сигналы найдены в local-only review package.",
  maxVisibleMetrics,
  className,
}: ReviewMetricsSectionProps) {
  const mappedMetrics = mapReviewMetricsToViewModels(metrics);
  const visibleMetrics =
    maxVisibleMetrics === undefined
      ? mappedMetrics
      : getVisibleReviewMetrics(mappedMetrics, maxVisibleMetrics);
  const hiddenCount =
    maxVisibleMetrics === undefined
      ? 0
      : countHiddenReviewMetrics(mappedMetrics, maxVisibleMetrics);
  const summary = summarizeReviewMetrics(metrics);
  const ariaSummary = buildReviewMetricsAriaSummary(
    visibleMetrics,
    hiddenCount,
  );
  const confidenceViewModel =
    confidence !== undefined
      ? mapReviewConfidenceToViewModel(confidence)
      : undefined;

  return (
    <section
      className={[
        "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-950",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="review-metrics-section-title"
      aria-describedby="review-metrics-section-summary"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Quantified review
          </p>
          <h2
            id="review-metrics-section-title"
            className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {mappedMetrics.length} metrics
        </span>
      </div>

      <p
        id="review-metrics-section-summary"
        className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
      >
        {summary.summaryText}
      </p>

      {confidenceViewModel !== undefined ? (
        <div className="mt-4">
          <ReviewConfidencePanel confidence={confidenceViewModel} />
        </div>
      ) : null}

      <div className="mt-4" aria-label={ariaSummary}>
        {visibleMetrics.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {visibleMetrics.map((metric) => (
              <ReviewMetricCard key={metric.id} metric={metric} />
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Metrics are not available yet.
          </div>
        )}
      </div>

      {hiddenCount > 0 ? (
        <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          +{hiddenCount} hidden metrics in this local-only review preview.
        </p>
      ) : null}

      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <strong className="font-semibold text-slate-900 dark:text-slate-100">
          Candidate note:
        </strong>{" "}
        metrics and confidence are explanatory candidates only. This component
        does not confirm truth, does not create Activity Event and does not
        perform DB write.
      </div>
    </section>
  );
}
