import type {
  AnalyticsTone,
  WeeklyProgressPoint,
  WeeklyProgressSeries,
} from "./analytics-dashboard.types";
import {
  formatAnalyticsScore,
  getAverageWeeklyScore,
  getLatestWeeklyPoint,
  getLoadRecoveryGap,
} from "./analytics-dashboard.utils";

const lineClassNameByTone: Record<AnalyticsTone, string> = {
  primary: "stroke-primary",
  success: "stroke-emerald-500",
  warning: "stroke-orange-500",
  danger: "stroke-destructive",
  muted: "stroke-muted-foreground",
  neutral: "stroke-foreground",
};

const badgeClassNameByTone: Record<AnalyticsTone, string> = {
  primary: "border-primary/20 bg-secondary text-secondary-foreground",
  success: "border-border bg-background text-foreground",
  warning: "border-border bg-background text-foreground",
  danger: "border-border bg-background text-foreground",
  muted: "border-border bg-muted text-muted-foreground",
  neutral: "border-border bg-background text-foreground",
};

export interface WeeklyProgressChartProps {
  readonly series: readonly WeeklyProgressSeries[];
}

interface WeeklySeriesSummaryProps {
  readonly series: WeeklyProgressSeries;
}

interface WeeklyProgressSvgProps {
  readonly series: WeeklyProgressSeries;
}

interface WeeklyProgressTableProps {
  readonly points: readonly WeeklyProgressPoint[];
}

function getPolylinePoints(points: readonly WeeklyProgressPoint[]): string {
  if (points.length === 0) {
    return "";
  }

  const maxScore = 9;
  const width = 560;
  const height = 180;
  const xStep = points.length > 1 ? width / (points.length - 1) : width;

  return points
    .map((point, index) => {
      const x = Math.round(index * xStep);
      const y = Math.round(height - (point.score / maxScore) * height);

      return `${x},${y}`;
    })
    .join(" ");
}

function getWeeklySeriesAccessibleLabel(series: WeeklyProgressSeries): string {
  const averageScore = getAverageWeeklyScore(series);
  const latestPoint = getLatestWeeklyPoint(series);

  if (!latestPoint) {
    return `${series.label}: no weekly points available.`;
  }

  return `${series.label}: average ${formatAnalyticsScore(
    averageScore,
  )}; latest point ${latestPoint.day} ${formatAnalyticsScore(
    latestPoint.score,
  )}. This is a read-only planning signal.`;
}

function WeeklyProgressSvg({ series }: WeeklyProgressSvgProps) {
  const points = getPolylinePoints(series.points);
  const accessibleLabel = getWeeklySeriesAccessibleLabel(series);

  return (
    <div
      className="rounded-xl border bg-background p-4"
      role="img"
      aria-label={accessibleLabel}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{series.label}</h3>
          <p className="text-sm text-muted-foreground">
            Average: {formatAnalyticsScore(getAverageWeeklyScore(series))}
          </p>
        </div>

        <span
          className={[
            "rounded-full border px-3 py-1 text-xs font-medium",
            badgeClassNameByTone[series.tone],
          ].join(" ")}
        >
          Read-only signal
        </span>
      </div>

      <svg
        className="mt-4 h-48 w-full overflow-visible"
        viewBox="0 0 560 180"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          x1="0"
          y1="80"
          x2="560"
          y2="80"
          className="stroke-muted"
          strokeWidth="1"
          strokeDasharray="6 6"
        />
        <line
          x1="0"
          y1="120"
          x2="560"
          y2="120"
          className="stroke-muted"
          strokeWidth="1"
          strokeDasharray="6 6"
        />
        <polyline
          points={points}
          className={["fill-none", lineClassNameByTone[series.tone]].join(" ")}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {series.points.map((point, index) => {
          const xStep =
            series.points.length > 1 ? 560 / (series.points.length - 1) : 560;
          const x = Math.round(index * xStep);
          const y = Math.round(180 - (point.score / 9) * 180);

          return (
            <circle
              key={`${series.id}-${point.day}`}
              cx={x}
              cy={y}
              r="5"
              className="fill-card stroke-primary"
              strokeWidth="3"
            />
          );
        })}
      </svg>

      <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
        {series.points.map((point) => (
          <span key={`${series.id}-${point.day}`}>{point.day}</span>
        ))}
      </div>
    </div>
  );
}

function WeeklySeriesSummary({ series }: WeeklySeriesSummaryProps) {
  const latestPoint = getLatestWeeklyPoint(series);

  return (
    <article className="rounded-xl border bg-background p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{series.label}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Average: {formatAnalyticsScore(getAverageWeeklyScore(series))}
          </p>
        </div>

        <span
          className={[
            "rounded-full border px-3 py-1 text-xs font-medium",
            badgeClassNameByTone[series.tone],
          ].join(" ")}
        >
          {latestPoint ? latestPoint.day : "No data"}
        </span>
      </div>

      {latestPoint ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Latest point: {formatAnalyticsScore(latestPoint.score)}. Load/recovery
          gap: {getLoadRecoveryGap(latestPoint)}.
        </p>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          No weekly points are available for this series.
        </p>
      )}
    </article>
  );
}

function WeeklyProgressTable({ points }: WeeklyProgressTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-background">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Day
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Balance
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Load
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Recovery
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Note
            </th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={`${point.date}-${point.day}`} className="border-b last:border-b-0">
              <td className="px-4 py-3 font-medium">{point.day}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatAnalyticsScore(point.score)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatAnalyticsScore(point.load)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatAnalyticsScore(point.recovery)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{point.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WeeklyProgressChart({ series }: WeeklyProgressChartProps) {
  const balanceSeries = series.find((item) => item.id === "balance");

  return (
    <section
      aria-label="Weekly progress chart"
      className="rounded-xl border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Weekly progress
          </p>
          <h2 className="text-xl font-semibold">Load, recovery, and balance</h2>
        </div>

        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          The chart is an accessible read-only preview. It explains trends
          without claiming verified productivity or health truth.
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {series.map((item) => (
          <WeeklySeriesSummary key={item.id} series={item} />
        ))}
      </div>

      <div className="mt-6 grid gap-4">
        {series.map((item) => (
          <WeeklyProgressSvg key={item.id} series={item} />
        ))}
      </div>

      {balanceSeries ? (
        <div className="mt-6">
          <WeeklyProgressTable points={balanceSeries.points} />
        </div>
      ) : null}
    </section>
  );
}
