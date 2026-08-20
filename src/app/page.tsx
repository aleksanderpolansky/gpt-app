import { FigmaDashboardContent } from "../components/figma-dashboard/figma-dashboard";
import { normalizeLocale } from "../i18n";
import type { DashboardAnalyticsBlock } from "../lib/dashboard/analytics-contract";
import { getActivityUserContext } from "../../lib/activity/activityUserContext";
import { supabase } from "../../lib/supabase";

type HomeSearchParams = {
  readonly locale?: string | string[];
  readonly lang?: string | string[];
};

type HomeProps = {
  readonly searchParams: Promise<HomeSearchParams>;
};

type Row = Record<string, unknown>;

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function mapDashboardAnalyticsBlock(row: Row): DashboardAnalyticsBlock {
  return {
    id: String(row.id),
    title: asString(row.title),
    visualizationType: asString(row.visualization_type) as DashboardAnalyticsBlock["visualizationType"],
    sourceType: asString(row.source_type) as DashboardAnalyticsBlock["sourceType"],
    metricKey: String(row.metric_key),
    aggregationKey: asString(row.aggregation_key) as DashboardAnalyticsBlock["aggregationKey"],
    groupByKey: asString(row.group_by_key) as DashboardAnalyticsBlock["groupByKey"],
    periodDays: asNumber(row.period_days),
    sortOrder: asNumber(row.sort_order),
    config: asRecord(row.config_json),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

async function loadInitialDashboardAnalyticsBlocks(): Promise<DashboardAnalyticsBlock[] | null> {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();

  if (errorResponse || !appUser || !personActor) {
    return errorResponse?.status === 401 ? [] : null;
  }

  const { data, error } = await supabase
    .from("dashboard_analytics_blocks")
    .select("*")
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return null;

  return (Array.isArray(data) ? data : []).map((row) =>
    mapDashboardAnalyticsBlock(row as Row),
  );
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: HomeProps) {
  const [params, initialAnalyticsBlocks] = await Promise.all([
    searchParams,
    loadInitialDashboardAnalyticsBlocks(),
  ]);
  const initialLocale = normalizeLocale(
    firstSearchParam(params.locale) ?? firstSearchParam(params.lang),
  );

  return (
    <FigmaDashboardContent
      initialLocale={initialLocale}
      initialAnalyticsBlocks={initialAnalyticsBlocks}
    />
  );
}
