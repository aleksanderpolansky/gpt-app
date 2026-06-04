export { AnalyticsDashboard } from "./analytics-dashboard";
export { AnalyticsSummaryHeader } from "./analytics-summary-header";
export { AnalyticsKpiCard } from "./analytics-kpi-card";
export { BalanceRings } from "./balance-rings";
export { WeeklyProgressChart } from "./weekly-progress-chart";
export { FocusHeatmap } from "./focus-heatmap";
export { WeakDirectionsWidget } from "./weak-directions-widget";
export { DomainDashboardTabs } from "./domain-dashboard-tabs";
export { ProgressDebtList } from "./progress-debt-list";
export { LoadRecoveryWarnings } from "./load-recovery-warnings";
export { AnalyticsNavigationLinks } from "./analytics-navigation-links";
export { AnalyticsReadOnlyBoundary } from "./analytics-read-only-boundary";

export { analyticsDashboardFixture } from "./analytics-dashboard.fixtures";

export {
  analyticsDomainOrder,
  clampAnalyticsScore,
  compareAnalyticsDomains,
  countHeatmapCellsByStatus,
  createAnalyticsDashboardSelectors,
  formatAnalyticsScore,
  formatSignalStrength,
  getAnalyticsStatusDescription,
  getAnalyticsStatusLabel,
  getAverageWeeklyScore,
  getBalanceMetricByDomain,
  getBalanceMetricsSorted,
  getDomainTabById,
  getDomainTabsSorted,
  getHeatmapCellsByStatus,
  getHeatmapDays,
  getHeatmapRowsSorted,
  getLatestWeeklyPoint,
  getLoadRecoveryGap,
  getPrimaryWeakDirectionCandidate,
  getProgressDebtsByDomain,
  getSignalStatusFromScore,
  getWarningsBySeverity,
  getWeakDirectionsSorted,
  getWeeklyLoadRecoveryGaps,
  getWeeklySeriesById,
} from "./analytics-dashboard.utils";

export type {
  AnalyticsDashboardViewModel,
  AnalyticsDashboardViewModel as AnalyticsDashboardData,
  AnalyticsDomainId,
  AnalyticsEvidenceItem,
  AnalyticsEvidenceKind,
  AnalyticsNavigationLink,
  AnalyticsPeriod,
  AnalyticsReadOnlyBoundary as AnalyticsReadOnlyBoundaryModel,
  AnalyticsSignalStatus,
  AnalyticsSourceContext,
  AnalyticsSummaryCard,
  AnalyticsTone,
  AnalyticsTrend,
  AnalyticsWarningSeverity,
  BalanceRingMetric,
  BalanceRingSegment,
  DomainDashboardTab,
  FocusHeatmapCell,
  FocusHeatmapRow,
  LoadRecoveryWarning,
  ProgressDebtItem,
  WeakDirection,
  WeeklyProgressPoint,
  WeeklyProgressSeries,
} from "./analytics-dashboard.types";
