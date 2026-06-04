import { analyticsDashboardFixture } from "./analytics-dashboard.fixtures";
import type {
  AnalyticsDashboardViewModel,
  AnalyticsDomainId,
  AnalyticsSignalStatus,
  AnalyticsWarningSeverity,
  BalanceRingMetric,
  DomainDashboardTab,
  FocusHeatmapCell,
  FocusHeatmapRow,
  LoadRecoveryWarning,
  ProgressDebtItem,
  WeakDirection,
  WeeklyProgressPoint,
  WeeklyProgressSeries,
} from "./analytics-dashboard.types";

export const analyticsDomainOrder: readonly AnalyticsDomainId[] = [
  "languages",
  "work",
  "health",
  "family",
  "recovery",
  "marketing",
  "management",
];

const analyticsDomainOrderIndex = new Map<AnalyticsDomainId, number>(
  analyticsDomainOrder.map((domainId, index) => [domainId, index]),
);

export function clampAnalyticsScore(score: number, maxScore = 9): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.min(Math.max(score, 0), maxScore);
}

export function formatAnalyticsScore(score: number, maxScore = 9): string {
  const clampedScore = clampAnalyticsScore(score, maxScore);
  const value = Number.isInteger(clampedScore)
    ? String(clampedScore)
    : clampedScore.toFixed(1);

  return `${value} / ${maxScore}`;
}

export function formatSignalStrength(signalStrength: number): string {
  const percent = Math.round(clampAnalyticsScore(signalStrength, 1) * 100);

  return `${percent}% signal`;
}

export function getSignalStatusFromScore(
  score: number,
  optimalLow = 5,
  optimalHigh = 7,
): AnalyticsSignalStatus {
  if (!Number.isFinite(score)) {
    return "unknown";
  }

  if (score <= 0) {
    return "blocked";
  }

  if (score < optimalLow) {
    return "low";
  }

  if (score > optimalHigh) {
    return "excess";
  }

  return "optimal";
}

export function getAnalyticsStatusLabel(
  status: AnalyticsSignalStatus,
): string {
  switch (status) {
    case "low":
      return "Below range";
    case "optimal":
      return "Planning range";
    case "excess":
      return "Possible overfocus";
    case "blocked":
      return "Blocked";
    case "unknown":
      return "Unknown";
    default:
      return "Unknown";
  }
}

export function getAnalyticsStatusDescription(
  status: AnalyticsSignalStatus,
): string {
  switch (status) {
    case "low":
      return "This area appears below the current planning range and may need review.";
    case "optimal":
      return "This area appears inside the current planning range.";
    case "excess":
      return "This area appears above the current planning range and may reduce balance elsewhere.";
    case "blocked":
      return "This area appears blocked or unavailable in the current preview.";
    case "unknown":
      return "There is not enough preview information for this area.";
    default:
      return "There is not enough preview information for this area.";
  }
}

export function compareAnalyticsDomains(
  left: AnalyticsDomainId,
  right: AnalyticsDomainId,
): number {
  const leftIndex = analyticsDomainOrderIndex.get(left) ?? Number.MAX_SAFE_INTEGER;
  const rightIndex = analyticsDomainOrderIndex.get(right) ?? Number.MAX_SAFE_INTEGER;

  return leftIndex - rightIndex;
}

export function getBalanceMetricsSorted(
  viewModel: AnalyticsDashboardViewModel = analyticsDashboardFixture,
): readonly BalanceRingMetric[] {
  return [...viewModel.balanceRings].sort((left, right) =>
    compareAnalyticsDomains(left.id, right.id),
  );
}

export function getDomainTabsSorted(
  viewModel: AnalyticsDashboardViewModel = analyticsDashboardFixture,
): readonly DomainDashboardTab[] {
  return [...viewModel.domainTabs].sort((left, right) =>
    compareAnalyticsDomains(left.id, right.id),
  );
}

export function getHeatmapRowsSorted(
  viewModel: AnalyticsDashboardViewModel = analyticsDashboardFixture,
): readonly FocusHeatmapRow[] {
  return [...viewModel.heatmap].sort((left, right) =>
    compareAnalyticsDomains(left.domainId, right.domainId),
  );
}

export function getHeatmapDays(
  viewModel: AnalyticsDashboardViewModel = analyticsDashboardFixture,
): readonly string[] {
  const days = new Set<string>();

  for (const row of viewModel.heatmap) {
    for (const cell of row.cells) {
      days.add(cell.day);
    }
  }

  return Array.from(days);
}

export function getHeatmapCellsByStatus(
  status: AnalyticsSignalStatus,
  viewModel: AnalyticsDashboardViewModel = analyticsDashboardFixture,
): readonly FocusHeatmapCell[] {
  return viewModel.heatmap.flatMap((row) =>
    row.cells.filter((cell) => cell.status === status),
  );
}

export function getWeakDirectionsSorted(
  viewModel: AnalyticsDashboardViewModel = analyticsDashboardFixture,
): readonly WeakDirection[] {
  return [...viewModel.weakDirections].sort(
    (left, right) => right.signalStrength - left.signalStrength,
  );
}

export function getPrimaryWeakDirectionCandidate(
  viewModel: AnalyticsDashboardViewModel = analyticsDashboardFixture,
): WeakDirection | undefined {
  return getWeakDirectionsSorted(viewModel)[0];
}

export function getProgressDebtsByDomain(
  domainId: AnalyticsDomainId,
  viewModel: AnalyticsDashboardViewModel = analyticsDashboardFixture,
): readonly ProgressDebtItem[] {
  return viewModel.progressDebts.filter((item) => item.domainId === domainId);
}

export function getWarningsBySeverity(
  severity: AnalyticsWarningSeverity,
  viewModel: AnalyticsDashboardViewModel = analyticsDashboardFixture,
): readonly LoadRecoveryWarning[] {
  return viewModel.warnings.filter((warning) => warning.severity === severity);
}

export function getBalanceMetricByDomain(
  domainId: AnalyticsDomainId,
  viewModel: AnalyticsDashboardViewModel = analyticsDashboardFixture,
): BalanceRingMetric | undefined {
  return viewModel.balanceRings.find((metric) => metric.id === domainId);
}

export function getDomainTabById(
  domainId: AnalyticsDomainId,
  viewModel: AnalyticsDashboardViewModel = analyticsDashboardFixture,
): DomainDashboardTab | undefined {
  return viewModel.domainTabs.find((tab) => tab.id === domainId);
}

export function getWeeklySeriesById(
  seriesId: string,
  viewModel: AnalyticsDashboardViewModel = analyticsDashboardFixture,
): WeeklyProgressSeries | undefined {
  return viewModel.weeklyProgress.find((series) => series.id === seriesId);
}

export function getLatestWeeklyPoint(
  series: WeeklyProgressSeries,
): WeeklyProgressPoint | undefined {
  return series.points[series.points.length - 1];
}

export function getAverageWeeklyScore(series: WeeklyProgressSeries): number {
  if (series.points.length === 0) {
    return 0;
  }

  const total = series.points.reduce((sum, point) => sum + point.score, 0);

  return Number((total / series.points.length).toFixed(1));
}

export function getLoadRecoveryGap(point: WeeklyProgressPoint): number {
  return Number((point.load - point.recovery).toFixed(1));
}

export function getWeeklyLoadRecoveryGaps(
  viewModel: AnalyticsDashboardViewModel = analyticsDashboardFixture,
): readonly {
  readonly day: string;
  readonly date: string;
  readonly gap: number;
  readonly status: AnalyticsSignalStatus;
  readonly accessibleLabel: string;
}[] {
  const balanceSeries = getWeeklySeriesById("balance", viewModel);

  if (!balanceSeries) {
    return [];
  }

  return balanceSeries.points.map((point) => {
    const gap = getLoadRecoveryGap(point);
    const status = gap > 1.5 ? "excess" : gap < 0 ? "optimal" : "low";

    return {
      day: point.day,
      date: point.date,
      gap,
      status,
      accessibleLabel: `${point.day}: load and recovery gap is ${gap}. This is a planning signal only.`,
    };
  });
}

export function countHeatmapCellsByStatus(
  status: AnalyticsSignalStatus,
  viewModel: AnalyticsDashboardViewModel = analyticsDashboardFixture,
): number {
  return getHeatmapCellsByStatus(status, viewModel).length;
}

export function createAnalyticsDashboardSelectors(
  viewModel: AnalyticsDashboardViewModel = analyticsDashboardFixture,
) {
  return {
    balanceMetrics: getBalanceMetricsSorted(viewModel),
    domainTabs: getDomainTabsSorted(viewModel),
    heatmapRows: getHeatmapRowsSorted(viewModel),
    heatmapDays: getHeatmapDays(viewModel),
    weakDirections: getWeakDirectionsSorted(viewModel),
    primaryWeakDirection: getPrimaryWeakDirectionCandidate(viewModel),
    warningCount: viewModel.warnings.length,
    lowHeatmapCellCount: countHeatmapCellsByStatus("low", viewModel),
    excessHeatmapCellCount: countHeatmapCellsByStatus("excess", viewModel),
    loadRecoveryGaps: getWeeklyLoadRecoveryGaps(viewModel),
  };
}
