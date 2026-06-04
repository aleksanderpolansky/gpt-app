export type AnalyticsTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "muted"
  | "neutral";

export type AnalyticsTrend = "up" | "down" | "flat";

export type AnalyticsSignalStatus =
  | "low"
  | "optimal"
  | "excess"
  | "blocked"
  | "unknown";

export type AnalyticsWarningSeverity = "info" | "notice" | "warning";

export type AnalyticsEvidenceKind =
  | "fixture"
  | "preview"
  | "activity"
  | "semantic-capital"
  | "calendar"
  | "manual";

export type AnalyticsDomainId =
  | "languages"
  | "work"
  | "health"
  | "family"
  | "recovery"
  | "marketing"
  | "management";

export interface AnalyticsPeriod {
  readonly label: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly timezone: string;
}

export interface AnalyticsSourceContext {
  readonly label: string;
  readonly description: string;
  readonly mode: "fixture-first" | "read-only-preview";
  readonly updatedAtLabel: string;
}

export interface AnalyticsSummaryCard {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly deltaLabel: string;
  readonly trend: AnalyticsTrend;
  readonly tone: AnalyticsTone;
  readonly explanation: string;
  readonly boundaryText: string;
}

export interface BalanceRingSegment {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly status: AnalyticsSignalStatus;
  readonly tone: AnalyticsTone;
}

export interface BalanceRingMetric {
  readonly id: AnalyticsDomainId;
  readonly label: string;
  readonly score: number;
  readonly maxScore: number;
  readonly currentLabel: string;
  readonly optimalRangeLabel: string;
  readonly tone: AnalyticsTone;
  readonly status: AnalyticsSignalStatus;
  readonly explanation: string;
  readonly segments: readonly BalanceRingSegment[];
}

export interface WeeklyProgressPoint {
  readonly day: string;
  readonly date: string;
  readonly score: number;
  readonly load: number;
  readonly recovery: number;
  readonly note: string;
}

export interface WeeklyProgressSeries {
  readonly id: string;
  readonly label: string;
  readonly tone: AnalyticsTone;
  readonly points: readonly WeeklyProgressPoint[];
}

export interface FocusHeatmapCell {
  readonly domainId: AnalyticsDomainId;
  readonly day: string;
  readonly score: number;
  readonly status: AnalyticsSignalStatus;
  readonly label: string;
  readonly accessibleLabel: string;
}

export interface FocusHeatmapRow {
  readonly domainId: AnalyticsDomainId;
  readonly label: string;
  readonly cells: readonly FocusHeatmapCell[];
}

export interface AnalyticsEvidenceItem {
  readonly id: string;
  readonly kind: AnalyticsEvidenceKind;
  readonly label: string;
  readonly description: string;
}

export interface WeakDirection {
  readonly id: string;
  readonly domainId: AnalyticsDomainId;
  readonly title: string;
  readonly reason: string;
  readonly signalStrength: number;
  readonly confidenceLabel: string;
  readonly tone: AnalyticsTone;
  readonly relatedEvidence: readonly AnalyticsEvidenceItem[];
  readonly constraints: readonly string[];
  readonly boundaryText: string;
}

export interface ProgressDebtItem {
  readonly id: string;
  readonly domainId: AnalyticsDomainId;
  readonly title: string;
  readonly gap: string;
  readonly cause: string;
  readonly lastActivity: string;
  readonly suggestedReview: string;
  readonly tone: AnalyticsTone;
  readonly boundaryText: string;
}

export interface LoadRecoveryWarning {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly severity: AnalyticsWarningSeverity;
  readonly evidence: readonly AnalyticsEvidenceItem[];
  readonly boundaryText: string;
}

export interface DomainDashboardTab {
  readonly id: AnalyticsDomainId;
  readonly label: string;
  readonly score: number;
  readonly status: AnalyticsSignalStatus;
  readonly summary: string;
  readonly relatedRoutes: readonly AnalyticsNavigationLink[];
}

export interface AnalyticsNavigationLink {
  readonly label: string;
  readonly href: string;
  readonly description: string;
}

export interface AnalyticsReadOnlyBoundary {
  readonly title: string;
  readonly items: readonly string[];
  readonly nextBlockLabel: string;
  readonly nextBlockHref: string;
}

export interface AnalyticsDashboardViewModel {
  readonly period: AnalyticsPeriod;
  readonly sourceContext: AnalyticsSourceContext;
  readonly summaryCards: readonly AnalyticsSummaryCard[];
  readonly balanceRings: readonly BalanceRingMetric[];
  readonly weeklyProgress: readonly WeeklyProgressSeries[];
  readonly heatmap: readonly FocusHeatmapRow[];
  readonly weakDirections: readonly WeakDirection[];
  readonly domainTabs: readonly DomainDashboardTab[];
  readonly progressDebts: readonly ProgressDebtItem[];
  readonly warnings: readonly LoadRecoveryWarning[];
  readonly navigationLinks: readonly AnalyticsNavigationLink[];
  readonly readOnlyBoundary: AnalyticsReadOnlyBoundary;
}
