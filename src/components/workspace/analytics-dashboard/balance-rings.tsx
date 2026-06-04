import type {
  AnalyticsTone,
  BalanceRingMetric,
  BalanceRingSegment,
} from "./analytics-dashboard.types";
import {
  formatAnalyticsScore,
  getAnalyticsStatusDescription,
  getAnalyticsStatusLabel,
} from "./analytics-dashboard.utils";

const ringStrokeClassNameByTone: Record<AnalyticsTone, string> = {
  primary: "stroke-primary",
  success: "stroke-emerald-500",
  warning: "stroke-orange-500",
  danger: "stroke-destructive",
  muted: "stroke-muted-foreground",
  neutral: "stroke-foreground",
};

const segmentBadgeClassNameByTone: Record<AnalyticsTone, string> = {
  primary: "border-primary/20 bg-secondary text-secondary-foreground",
  success: "border-border bg-background text-foreground",
  warning: "border-border bg-background text-foreground",
  danger: "border-border bg-background text-foreground",
  muted: "border-border bg-muted text-muted-foreground",
  neutral: "border-border bg-background text-foreground",
};

export interface BalanceRingsProps {
  readonly metrics: readonly BalanceRingMetric[];
}

interface BalanceRingCardProps {
  readonly metric: BalanceRingMetric;
}

interface BalanceRingSvgProps {
  readonly metric: BalanceRingMetric;
}

interface BalanceRingSegmentsProps {
  readonly segments: readonly BalanceRingSegment[];
}

function getRingProgressPercent(metric: BalanceRingMetric): number {
  if (metric.maxScore <= 0) {
    return 0;
  }

  return Math.round((metric.score / metric.maxScore) * 100);
}

function BalanceRingSvg({ metric }: BalanceRingSvgProps) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = getRingProgressPercent(metric);
  const strokeDashoffset = circumference * (1 - progressPercent / 100);
  const statusLabel = getAnalyticsStatusLabel(metric.status);
  const statusDescription = getAnalyticsStatusDescription(metric.status);

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative grid size-28 place-items-center"
        aria-label={`${metric.label}: ${formatAnalyticsScore(
          metric.score,
          metric.maxScore,
        )}. ${statusLabel}. ${statusDescription}`}
        role="img"
      >
        <svg
          className="-rotate-90"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="fill-none stroke-muted"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            className={[
              "fill-none transition-none",
              ringStrokeClassNameByTone[metric.tone],
            ].join(" ")}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>

        <div className="absolute text-center">
          <p className="text-lg font-semibold leading-none">
            {metric.score.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            / {metric.maxScore}
          </p>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">{metric.label}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {metric.currentLabel}
        </p>
        <p className="mt-2 rounded-lg border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
          {metric.optimalRangeLabel} · {statusLabel}
        </p>
      </div>
    </div>
  );
}

function BalanceRingSegments({ segments }: BalanceRingSegmentsProps) {
  return (
    <div className="mt-4 grid gap-2">
      {segments.map((segment) => (
        <div
          key={segment.id}
          className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <div className="min-w-0">
            <p className="font-medium">{segment.label}</p>
            <p className="text-xs text-muted-foreground">
              {getAnalyticsStatusLabel(segment.status)}
            </p>
          </div>

          <span
            className={[
              "shrink-0 rounded-full border px-2 py-1 text-xs font-medium",
              segmentBadgeClassNameByTone[segment.tone],
            ].join(" ")}
          >
            {segment.value}%
          </span>
        </div>
      ))}
    </div>
  );
}

function BalanceRingCard({ metric }: BalanceRingCardProps) {
  return (
    <article className="rounded-xl border bg-card p-5 shadow-sm">
      <BalanceRingSvg metric={metric} />

      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {metric.explanation}
      </p>

      <BalanceRingSegments segments={metric.segments} />
    </article>
  );
}

export function BalanceRings({ metrics }: BalanceRingsProps) {
  return (
    <section aria-label="Balance rings" className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Balance rings
          </p>
          <h2 className="text-xl font-semibold">Domain balance signals</h2>
        </div>

        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          Scores are read-only planning signals. Low and excess attention can
          both indicate imbalance.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <BalanceRingCard key={metric.id} metric={metric} />
        ))}
      </div>
    </section>
  );
}
