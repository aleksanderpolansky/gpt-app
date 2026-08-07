export const DASHBOARD_ANALYTICS_VISUALIZATION_TYPES = [
  "line",
  "bar",
  "metric",
  "map",
  "donut",
  "radar",
  "heatmap",
  "scatter",
  "progress",
] as const;

export type DashboardAnalyticsVisualizationType =
  (typeof DASHBOARD_ANALYTICS_VISUALIZATION_TYPES)[number];

export const DASHBOARD_ANALYTICS_SOURCE_TYPES = [
  "activities",
  "facts",
  "observation_objects",
  "calendar",
  "commerce",
  "points",
  "certificates",
] as const;

export type DashboardAnalyticsSourceType =
  (typeof DASHBOARD_ANALYTICS_SOURCE_TYPES)[number];

export const DASHBOARD_ANALYTICS_AGGREGATIONS = [
  "sum",
  "average",
  "count",
  "min",
  "max",
  "latest",
  "change",
] as const;

export type DashboardAnalyticsAggregation =
  (typeof DASHBOARD_ANALYTICS_AGGREGATIONS)[number];

export const DASHBOARD_ANALYTICS_GROUPINGS = [
  "day",
  "week",
  "month",
  "category",
  "observation_object",
  "profile",
  "location",
] as const;

export type DashboardAnalyticsGrouping =
  (typeof DASHBOARD_ANALYTICS_GROUPINGS)[number];

export const DASHBOARD_ANALYTICS_PERIOD_DAYS = [7, 14, 30] as const;

export type DashboardAnalyticsPeriodDays =
  (typeof DASHBOARD_ANALYTICS_PERIOD_DAYS)[number];

export type DashboardAnalyticsBlock = {
  readonly id: string;
  readonly title: string | null;
  readonly visualizationType: DashboardAnalyticsVisualizationType;
  readonly sourceType: DashboardAnalyticsSourceType;
  readonly metricKey: string;
  readonly aggregationKey: DashboardAnalyticsAggregation;
  readonly groupByKey: DashboardAnalyticsGrouping;
  readonly periodDays: number;
  readonly sortOrder: number;
  readonly config: Record<string, unknown>;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
};

export type DashboardAnalyticsCreateInput = {
  readonly title?: string | null;
  readonly visualizationType: DashboardAnalyticsVisualizationType;
  readonly sourceType: DashboardAnalyticsSourceType;
  readonly metricKey: string;
  readonly aggregationKey: DashboardAnalyticsAggregation;
  readonly groupByKey: DashboardAnalyticsGrouping;
  readonly periodDays: number;
};

export const DASHBOARD_ANALYTICS_V1_SUPPORTED_VISUALIZATIONS =
  new Set<DashboardAnalyticsVisualizationType>(["line", "bar", "metric"]);

export const DASHBOARD_ANALYTICS_V1_SUPPORTED_PERIODS =
  new Set<number>(DASHBOARD_ANALYTICS_PERIOD_DAYS);

export function isDashboardAnalyticsV1Supported(
  input: Pick<
    DashboardAnalyticsCreateInput,
    | "visualizationType"
    | "sourceType"
    | "metricKey"
    | "aggregationKey"
    | "groupByKey"
    | "periodDays"
  >,
): boolean {
  return (
    DASHBOARD_ANALYTICS_V1_SUPPORTED_VISUALIZATIONS.has(input.visualizationType) &&
    input.sourceType === "activities" &&
    input.metricKey === "duration_minutes" &&
    input.aggregationKey === "sum" &&
    input.groupByKey === "day" &&
    DASHBOARD_ANALYTICS_V1_SUPPORTED_PERIODS.has(input.periodDays)
  );
}

export function isDashboardAnalyticsV2Supported(
  input: Pick<
    DashboardAnalyticsCreateInput,
    | "visualizationType"
    | "sourceType"
    | "metricKey"
    | "aggregationKey"
    | "groupByKey"
    | "periodDays"
  >,
): boolean {
  if (
    input.visualizationType === "map" &&
    input.sourceType === "certificates" &&
    input.metricKey === "available_certificates" &&
    input.aggregationKey === "count" &&
    input.groupByKey === "location"
  ) {
    return true;
  }

  return isDashboardAnalyticsV1Supported(input);
}

export function isDashboardAnalyticsVisualizationType(
  value: unknown,
): value is DashboardAnalyticsVisualizationType {
  return typeof value === "string" &&
    (DASHBOARD_ANALYTICS_VISUALIZATION_TYPES as readonly string[]).includes(value);
}

export function isDashboardAnalyticsSourceType(
  value: unknown,
): value is DashboardAnalyticsSourceType {
  return typeof value === "string" &&
    (DASHBOARD_ANALYTICS_SOURCE_TYPES as readonly string[]).includes(value);
}

export function isDashboardAnalyticsAggregation(
  value: unknown,
): value is DashboardAnalyticsAggregation {
  return typeof value === "string" &&
    (DASHBOARD_ANALYTICS_AGGREGATIONS as readonly string[]).includes(value);
}

export function isDashboardAnalyticsGrouping(
  value: unknown,
): value is DashboardAnalyticsGrouping {
  return typeof value === "string" &&
    (DASHBOARD_ANALYTICS_GROUPINGS as readonly string[]).includes(value);
}