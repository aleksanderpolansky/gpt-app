import type { ReviewPackage } from "./activity-review-types";
import {
  buildReviewConfidenceAssessment,
  getReviewConfidenceSummary,
  hasLowReviewConfidence,
  hasReviewConfidenceWarnings,
} from "./activity-review-confidence";
import type {
  ReviewConfidenceAssessment,
  ReviewConfidenceDiagnostic,
  ReviewConfidenceTone,
} from "./activity-review-confidence";

export const CONFIDENCE_SECTION_CREATED =
  "CONFIDENCE_SECTION_CREATED" as const;

interface ConfidenceSectionProps {
  reviewPackage: ReviewPackage;
  title?: string;
  description?: string;
  maxVisibleDiagnostics?: number;
  className?: string;
}

interface ConfidenceDiagnosticItemProps {
  diagnostic: ReviewConfidenceDiagnostic;
}

interface ConfidenceGaugeProps {
  assessment: ReviewConfidenceAssessment;
}

const CONFIDENCE_SEGMENT_INDEXES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const CONFIDENCE_TONE_CLASS_NAMES: Record<ReviewConfidenceTone, string> = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  accent:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  muted:
    "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400",
};

const CONFIDENCE_SEGMENT_FILLED_CLASS_NAMES: Record<ReviewConfidenceTone, string> = {
  success: "bg-emerald-500 dark:bg-emerald-400",
  accent: "bg-indigo-500 dark:bg-indigo-400",
  warning: "bg-amber-500 dark:bg-amber-400",
  muted: "bg-slate-400 dark:bg-slate-500",
};

function getConfidenceToneClassName(tone: ReviewConfidenceTone): string {
  return CONFIDENCE_TONE_CLASS_NAMES[tone];
}

function getConfidenceSegmentFilledClassName(
  tone: ReviewConfidenceTone,
): string {
  return CONFIDENCE_SEGMENT_FILLED_CLASS_NAMES[tone];
}

function getFilledConfidenceSegmentCount(percent: number): number {
  return Math.max(0, Math.min(10, Math.round(percent / 10)));
}

function getVisibleConfidenceDiagnostics(
  diagnostics: ReviewConfidenceDiagnostic[],
  maxVisibleDiagnostics: number | undefined,
): ReviewConfidenceDiagnostic[] {
  if (maxVisibleDiagnostics === undefined) {
    return diagnostics;
  }

  if (maxVisibleDiagnostics <= 0) {
    return [];
  }

  return diagnostics.slice(0, maxVisibleDiagnostics);
}

function countHiddenConfidenceDiagnostics(
  diagnostics: ReviewConfidenceDiagnostic[],
  maxVisibleDiagnostics: number | undefined,
): number {
  if (maxVisibleDiagnostics === undefined) {
    return 0;
  }

  if (maxVisibleDiagnostics <= 0) {
    return diagnostics.length;
  }

  return Math.max(0, diagnostics.length - maxVisibleDiagnostics);
}

function buildConfidenceAriaSummary(
  assessment: ReviewConfidenceAssessment,
  hiddenDiagnosticCount: number,
): string {
  if (hiddenDiagnosticCount > 0) {
    return `${assessment.ariaLabel} Hidden diagnostics: ${hiddenDiagnosticCount}.`;
  }

  return assessment.ariaLabel;
}

function ConfidenceGauge({ assessment }: ConfidenceGaugeProps) {
  const filledSegments = getFilledConfidenceSegmentCount(assessment.percent);

  return (
    <div
      className={[
        "rounded-2xl border px-4 py-4",
        getConfidenceToneClassName(assessment.tone),
      ].join(" ")}
      aria-label={assessment.ariaLabel}
      title={`Source rule: ${assessment.sourceRule}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">
            Confidence score
          </p>
          <p className="mt-1 text-2xl font-semibold">{assessment.percent}%</p>
          <p className="mt-2 text-sm font-semibold">{assessment.label}</p>
          <p className="mt-2 text-xs leading-5 opacity-80">
            {assessment.band.description}
          </p>
        </div>

        <div className="grid min-w-40 grid-cols-10 gap-1" aria-hidden="true">
          {CONFIDENCE_SEGMENT_INDEXES.map((segmentIndex) => {
            const isFilled = segmentIndex < filledSegments;

            return (
              <span
                key={segmentIndex}
                className={[
                  "h-8 rounded-full",
                  isFilled
                    ? getConfidenceSegmentFilledClassName(assessment.tone)
                    : "bg-white/70 dark:bg-slate-900",
                ].join(" ")}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ConfidenceDiagnosticItem({
  diagnostic,
}: ConfidenceDiagnosticItemProps) {
  return (
    <li
      className={[
        "rounded-2xl border px-4 py-3",
        getConfidenceToneClassName(diagnostic.tone),
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">
            {diagnostic.label}
          </p>
          <p className="mt-2 text-xs leading-5 opacity-80">
            {diagnostic.description}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {diagnostic.value}
        </span>
      </div>
    </li>
  );
}

export function ConfidenceSection({
  reviewPackage,
  title = "Confidence review",
  description = "Эта секция показывает, насколько уверенно local parser понял активность, и какие сигналы усиливают или ослабляют confidence.",
  maxVisibleDiagnostics,
  className,
}: ConfidenceSectionProps) {
  const assessment = buildReviewConfidenceAssessment(reviewPackage);
  const summary = getReviewConfidenceSummary(reviewPackage);
  const visibleDiagnostics = getVisibleConfidenceDiagnostics(
    assessment.diagnostics,
    maxVisibleDiagnostics,
  );
  const hiddenDiagnosticCount = countHiddenConfidenceDiagnostics(
    assessment.diagnostics,
    maxVisibleDiagnostics,
  );
  const hasLowConfidence = hasLowReviewConfidence(reviewPackage);
  const hasWarnings = hasReviewConfidenceWarnings(reviewPackage);
  const ariaSummary = buildConfidenceAriaSummary(
    assessment,
    hiddenDiagnosticCount,
  );

  return (
    <section
      className={[
        "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-950",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="confidence-section-title"
      aria-describedby="confidence-section-summary"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Confidence diagnostics
          </p>
          <h2
            id="confidence-section-title"
            className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>

        <span
          className={[
            "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold",
            getConfidenceToneClassName(assessment.tone),
          ].join(" ")}
        >
          {assessment.level}
        </span>
      </div>

      <p
        id="confidence-section-summary"
        className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
      >
        {summary}
      </p>

      <div className="mt-4" aria-label={ariaSummary}>
        <ConfidenceGauge assessment={assessment} />
      </div>

      {(hasLowConfidence || hasWarnings) ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <strong className="font-semibold">Attention:</strong>{" "}
          confidence diagnostics contain warnings. Review questions, unknown
          terms, privacy hints or missing metrics before any future write gate.
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <strong className="font-semibold">Local review looks stable:</strong>{" "}
          no warning diagnostics were detected, but the result remains a
          candidate package.
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Diagnostics
        </p>

        {visibleDiagnostics.length > 0 ? (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {visibleDiagnostics.map((diagnostic) => (
              <ConfidenceDiagnosticItem
                key={diagnostic.id}
                diagnostic={diagnostic}
              />
            ))}
          </ul>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Confidence diagnostics are not available yet.
          </div>
        )}
      </div>

      {hiddenDiagnosticCount > 0 ? (
        <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          +{hiddenDiagnosticCount} hidden diagnostics in this local-only review
          preview.
        </p>
      ) : null}

      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <strong className="font-semibold text-slate-900 dark:text-slate-100">
          Candidate note:
        </strong>{" "}
        confidence is an explanatory diagnostic only. This component does not
        confirm truth, does not create Activity Event and does not perform DB write.
      </div>
    </section>
  );
}
