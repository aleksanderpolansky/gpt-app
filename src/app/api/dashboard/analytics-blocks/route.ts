import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";
import {
  isDashboardAnalyticsAggregation,
  isDashboardAnalyticsGrouping,
  isDashboardAnalyticsSourceType,
  isDashboardAnalyticsV1Supported,
  isDashboardAnalyticsVisualizationType,
  type DashboardAnalyticsBlock,
  type DashboardAnalyticsCreateInput,
} from "@/lib/dashboard/analytics-contract";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function mapBlock(row: Row): DashboardAnalyticsBlock {
  return {
    id: String(row.id),
    title: asString(row.title),
    visualizationType:
      asString(row.visualization_type) as DashboardAnalyticsBlock["visualizationType"],
    sourceType:
      asString(row.source_type) as DashboardAnalyticsBlock["sourceType"],
    metricKey: String(row.metric_key),
    aggregationKey:
      asString(row.aggregation_key) as DashboardAnalyticsBlock["aggregationKey"],
    groupByKey:
      asString(row.group_by_key) as DashboardAnalyticsBlock["groupByKey"],
    periodDays: asNumber(row.period_days),
    sortOrder: asNumber(row.sort_order),
    config: asRecord(row.config_json),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

async function resolveContext() {
  const { appUser, personActor, errorResponse } =
    await getActivityUserContext();

  if (errorResponse) {
    return { appUser: null, personActor: null, errorResponse };
  }

  if (!appUser || !personActor) {
    return {
      appUser: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Dashboard actor context not found" },
        { status: 500 },
      ),
    };
  }

  return { appUser, personActor, errorResponse: null };
}

export async function GET() {
  const { appUser, personActor, errorResponse } = await resolveContext();

  if (errorResponse || !appUser || !personActor) {
    return errorResponse;
  }

  const { data, error } = await supabase
    .from("dashboard_analytics_blocks")
    .select("*")
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    blocks: (Array.isArray(data) ? data : []).map((row) =>
      mapBlock(row as Row),
    ),
  });
}

function parseCreateInput(value: unknown): DashboardAnalyticsCreateInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const body = value as Record<string, unknown>;

  if (
    !isDashboardAnalyticsVisualizationType(body.visualizationType) ||
    !isDashboardAnalyticsSourceType(body.sourceType) ||
    !isDashboardAnalyticsAggregation(body.aggregationKey) ||
    !isDashboardAnalyticsGrouping(body.groupByKey)
  ) {
    return null;
  }

  const metricKey =
    typeof body.metricKey === "string" ? body.metricKey.trim() : "";
  const periodDays = Number(body.periodDays);
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 120)
      : null;

  if (!metricKey || !Number.isFinite(periodDays)) {
    return null;
  }

  return {
    title,
    visualizationType: body.visualizationType,
    sourceType: body.sourceType,
    metricKey,
    aggregationKey: body.aggregationKey,
    groupByKey: body.groupByKey,
    periodDays,
  };
}

export async function POST(request: Request) {
  const { appUser, personActor, errorResponse } = await resolveContext();

  if (errorResponse || !appUser || !personActor) {
    return errorResponse;
  }

  const rawBody = await request.json().catch(() => null);
  const input = parseCreateInput(rawBody);

  if (!input) {
    return NextResponse.json(
      { ok: false, error: "Invalid analytics block configuration" },
      { status: 400 },
    );
  }

  if (!isDashboardAnalyticsV1Supported(input)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "This analytics combination is not enabled in dashboard analytics v1",
      },
      { status: 422 },
    );
  }

  const { data: previousRows, error: previousError } = await supabase
    .from("dashboard_analytics_blocks")
    .select("sort_order")
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (previousError) {
    return NextResponse.json(
      { ok: false, error: previousError.message },
      { status: 500 },
    );
  }

  const previousSortOrder =
    Array.isArray(previousRows) && previousRows.length > 0
      ? asNumber((previousRows[0] as Row).sort_order)
      : -1;

  const { data, error } = await supabase
    .from("dashboard_analytics_blocks")
    .insert({
      owner_user_id: appUser.id,
      owner_actor_id: personActor.id,
      title: input.title,
      visualization_type: input.visualizationType,
      source_type: input.sourceType,
      metric_key: input.metricKey,
      aggregation_key: input.aggregationKey,
      group_by_key: input.groupByKey,
      period_days: input.periodDays,
      sort_order: previousSortOrder + 1,
      config_json: {
        contract: "dashboard-analytics-v1",
      },
      is_visible: true,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Could not create analytics block" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    block: mapBlock(data as Row),
  });
}

export async function DELETE(request: Request) {
  const { appUser, personActor, errorResponse } = await resolveContext();

  if (errorResponse || !appUser || !personActor) {
    return errorResponse;
  }

  const url = new URL(request.url);
  const blockId = url.searchParams.get("id")?.trim();

  if (!blockId) {
    return NextResponse.json(
      { ok: false, error: "Analytics block id is required" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("dashboard_analytics_blocks")
    .delete()
    .eq("id", blockId)
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
