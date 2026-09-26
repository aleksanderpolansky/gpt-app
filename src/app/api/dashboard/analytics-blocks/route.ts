import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";
import {
  isDashboardAnalyticsAggregation,
  isDashboardAnalyticsGrouping,
  isDashboardAnalyticsSourceType,
  isDashboardAnalyticsV4Supported,
  isDashboardAnalyticsVisualizationType,
  type DashboardAnalyticsBlock,
  type DashboardAnalyticsCreateInput,
} from "@/lib/dashboard/analytics-contract";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PARAMETER_CODE_RE = /^[a-z][a-z0-9_]{0,79}$/;
const UNIT_CODE_RE = /^[a-z][a-z0-9_]{0,79}$/;

type ObservationFactConfig = {
  valueObjectId: string;
  parameterDefinitionId: string;
  parameterCode: string;
  canonicalUnitCode: string;
  valueObjectTitle: string | null;
  parameterTitle: string | null;
};

type ObservationFactPresenceConfig = {
  id: string;
  kind: "presence";
  valueObjectId: string;
  valueObjectTitle: string | null;
};

type ObservationFactNumericSeriesConfig = ObservationFactConfig & {
  id: string;
  kind: "numeric";
};

type ObservationFactMultiSeriesConfig = {
  scaleMode: "independent";
  series: Array<ObservationFactNumericSeriesConfig | ObservationFactPresenceConfig>;
};

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

function mapBlock(row: Row): DashboardAnalyticsBlock {
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

async function resolveContext() {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();
  if (errorResponse) return { appUser: null, personActor: null, errorResponse };
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
  if (errorResponse || !appUser || !personActor) return errorResponse;

  const { data, error } = await supabase
    .from("dashboard_analytics_blocks")
    .select("*")
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    blocks: (Array.isArray(data) ? data : []).map((row) => mapBlock(row as Row)),
  });
}

function parseObservationFactConfig(value: unknown): ObservationFactConfig | null {
  const row = asRecord(value);
  const valueObjectId = asString(row.valueObjectId)?.trim() ?? "";
  const parameterDefinitionId =
    asString(row.parameterDefinitionId)?.trim() ?? "";
  const parameterCode = asString(row.parameterCode)?.trim().toLowerCase() ?? "";
  const canonicalUnitCode =
    asString(row.canonicalUnitCode)?.trim().toLowerCase() ?? "";
  const valueObjectTitle = asString(row.valueObjectTitle)?.trim().slice(0, 200) ?? null;
  const parameterTitle = asString(row.parameterTitle)?.trim().slice(0, 200) ?? null;

  if (
    !UUID_RE.test(valueObjectId) ||
    !UUID_RE.test(parameterDefinitionId) ||
    !PARAMETER_CODE_RE.test(parameterCode) ||
    !UNIT_CODE_RE.test(canonicalUnitCode)
  ) {
    return null;
  }

  return {
    valueObjectId,
    parameterDefinitionId,
    parameterCode,
    canonicalUnitCode,
    valueObjectTitle,
    parameterTitle,
  };
}

function parseObservationFactMultiSeriesConfig(
  value: unknown,
): ObservationFactMultiSeriesConfig | null {
  const row = asRecord(value);
  const scaleMode = asString(row.scaleMode)?.trim().toLowerCase();
  const rawSeries = Array.isArray(row.series) ? row.series : [];

  if (scaleMode !== "independent" || rawSeries.length < 2 || rawSeries.length > 6) {
    return null;
  }

  const parsedSeries: Array<
    ObservationFactNumericSeriesConfig | ObservationFactPresenceConfig
  > = [];
  const seenIds = new Set<string>();
  const seenSemanticKeys = new Set<string>();

  for (const raw of rawSeries) {
    const item = asRecord(raw);
    const id = asString(item.id)?.trim() ?? "";
    const kind = asString(item.kind)?.trim().toLowerCase() ?? "";
    const valueObjectId = asString(item.valueObjectId)?.trim() ?? "";
    const valueObjectTitle =
      asString(item.valueObjectTitle)?.trim().slice(0, 200) ?? null;

    if (!UUID_RE.test(id) || !UUID_RE.test(valueObjectId) || seenIds.has(id)) {
      return null;
    }

    seenIds.add(id);

    if (kind === "presence") {
      const semanticKey = `presence:${valueObjectId}`;
      if (seenSemanticKeys.has(semanticKey)) return null;
      seenSemanticKeys.add(semanticKey);
      parsedSeries.push({
        id,
        kind: "presence",
        valueObjectId,
        valueObjectTitle,
      });
      continue;
    }

    if (kind !== "numeric") return null;

    const numericConfig = parseObservationFactConfig(item);
    if (!numericConfig) return null;

    const semanticKey =
      `numeric:${numericConfig.valueObjectId}:${numericConfig.parameterDefinitionId}`;
    if (seenSemanticKeys.has(semanticKey)) return null;
    seenSemanticKeys.add(semanticKey);

    parsedSeries.push({
      id,
      kind: "numeric",
      ...numericConfig,
    });
  }

  return {
    scaleMode: "independent",
    series: parsedSeries,
  };
}

function isObservationFactMultiSeriesInput(
  input: Pick<
    DashboardAnalyticsCreateInput,
    | "visualizationType"
    | "sourceType"
    | "metricKey"
    | "aggregationKey"
    | "groupByKey"
  >,
): boolean {
  return (
    input.visualizationType === "line" &&
    input.sourceType === "facts" &&
    input.metricKey === "multi_series" &&
    input.aggregationKey === "sum" &&
    input.groupByKey === "day"
  );
}

function isObservationFactSeriesInput(
  input: Pick<
    DashboardAnalyticsCreateInput,
    | "visualizationType"
    | "sourceType"
    | "metricKey"
    | "aggregationKey"
    | "groupByKey"
  >,
): boolean {
  return (
    (input.visualizationType === "line" ||
      input.visualizationType === "bar" ||
      input.visualizationType === "metric") &&
    input.sourceType === "facts" &&
    input.metricKey === "numeric_value" &&
    input.aggregationKey === "sum" &&
    input.groupByKey === "day"
  );
}

async function validateObservationFactConfig(input: {
  config: ObservationFactConfig;
  appUserId: string;
  actorId: string;
}): Promise<ObservationFactConfig> {
  const { data: valueObjectData, error: valueObjectError } = await supabase
    .from("value_objects")
    .select(
      "id,title,status,scope_code,origin_type_code,ontology_node_role_code,node_role_code,owner_user_id,owner_actor_id",
    )
    .eq("id", input.config.valueObjectId)
    .maybeSingle();

  if (valueObjectError) {
    throw new Error(`DASHBOARD_FACT_VALUE_OBJECT_READ_FAILED:${valueObjectError.message}`);
  }

  const valueObject = (valueObjectData as Row | null) ?? null;
  if (!valueObject) {
    throw new Error("DASHBOARD_FACT_VALUE_OBJECT_NOT_FOUND");
  }

  const isGlobalLeaf =
    asString(valueObject.scope_code) === "global" &&
    asString(valueObject.status) === "active" &&
    asString(valueObject.ontology_node_role_code) === "leaf";

  const isOwnedLeaf =
    asString(valueObject.owner_user_id) === input.appUserId &&
    asString(valueObject.owner_actor_id) === input.actorId &&
    ["active", "draft"].includes(asString(valueObject.status) ?? "") &&
    (asString(valueObject.ontology_node_role_code) === "leaf" ||
      asString(valueObject.node_role_code) === "activity_leaf");

  if (!isGlobalLeaf && !isOwnedLeaf) {
    throw new Error("DASHBOARD_FACT_VALUE_OBJECT_NOT_ACCESSIBLE_LEAF");
  }

  const { data: assignmentData, error: assignmentError } = await supabase
    .from("value_object_parameter_assignments")
    .select(
      "id,parameter_definition_id,status,assignment_scope_code,owner_user_id,owner_actor_id",
    )
    .eq("value_object_id", input.config.valueObjectId)
    .eq("parameter_definition_id", input.config.parameterDefinitionId)
    .eq("status", "active")
    .maybeSingle();

  if (assignmentError) {
    throw new Error(`DASHBOARD_FACT_ASSIGNMENT_READ_FAILED:${assignmentError.message}`);
  }

  const assignment = (assignmentData as Row | null) ?? null;
  if (!assignment) {
    throw new Error("DASHBOARD_FACT_PARAMETER_NOT_ASSIGNED");
  }

  const assignmentScope = asString(assignment.assignment_scope_code);
  const assignmentAccessible = isGlobalLeaf
    ? assignmentScope === "system"
    : assignmentScope === "actor" &&
      asString(assignment.owner_user_id) === input.appUserId &&
      asString(assignment.owner_actor_id) === input.actorId;

  if (!assignmentAccessible) {
    throw new Error("DASHBOARD_FACT_PARAMETER_ASSIGNMENT_NOT_ACCESSIBLE");
  }

  const { data: definitionData, error: definitionError } = await supabase
    .from("value_object_parameter_definitions")
    .select(
      "id,parameter_code,title,value_type_code,canonical_unit_code,status",
    )
    .eq("id", input.config.parameterDefinitionId)
    .eq("status", "active")
    .eq("value_type_code", "numeric")
    .maybeSingle();

  if (definitionError) {
    throw new Error(`DASHBOARD_FACT_PARAMETER_READ_FAILED:${definitionError.message}`);
  }

  const definition = (definitionData as Row | null) ?? null;
  if (!definition) {
    throw new Error("DASHBOARD_FACT_NUMERIC_PARAMETER_NOT_FOUND");
  }

  const parameterCode = asString(definition.parameter_code)?.toLowerCase() ?? "";
  const canonicalUnitCode =
    asString(definition.canonical_unit_code)?.toLowerCase() ?? "";

  if (
    parameterCode !== input.config.parameterCode ||
    canonicalUnitCode !== input.config.canonicalUnitCode
  ) {
    throw new Error("DASHBOARD_FACT_PARAMETER_CONTRACT_CHANGED");
  }

  return {
    ...input.config,
    valueObjectTitle:
      asString(valueObject.title)?.slice(0, 200) ??
      input.config.valueObjectTitle,
    parameterTitle:
      asString(definition.title)?.slice(0, 200) ??
      input.config.parameterTitle,
  };
}

async function validateObservationPresenceConfig(input: {
  config: ObservationFactPresenceConfig;
  appUserId: string;
  actorId: string;
}): Promise<ObservationFactPresenceConfig> {
  const { data: valueObjectData, error: valueObjectError } = await supabase
    .from("value_objects")
    .select(
      "id,title,status,scope_code,ontology_node_role_code,node_role_code,owner_user_id,owner_actor_id",
    )
    .eq("id", input.config.valueObjectId)
    .maybeSingle();

  if (valueObjectError) {
    throw new Error(
      `DASHBOARD_FACT_VALUE_OBJECT_READ_FAILED:${valueObjectError.message}`,
    );
  }

  const valueObject = (valueObjectData as Row | null) ?? null;
  if (!valueObject) {
    throw new Error("DASHBOARD_FACT_VALUE_OBJECT_NOT_FOUND");
  }

  const isGlobalLeaf =
    asString(valueObject.scope_code) === "global" &&
    asString(valueObject.status) === "active" &&
    asString(valueObject.ontology_node_role_code) === "leaf";

  const isOwnedLeaf =
    asString(valueObject.owner_user_id) === input.appUserId &&
    asString(valueObject.owner_actor_id) === input.actorId &&
    ["active", "draft"].includes(asString(valueObject.status) ?? "") &&
    (asString(valueObject.ontology_node_role_code) === "leaf" ||
      asString(valueObject.node_role_code) === "activity_leaf");

  if (!isGlobalLeaf && !isOwnedLeaf) {
    throw new Error("DASHBOARD_FACT_VALUE_OBJECT_NOT_ACCESSIBLE_LEAF");
  }

  return {
    ...input.config,
    valueObjectTitle:
      asString(valueObject.title)?.slice(0, 200) ??
      input.config.valueObjectTitle,
  };
}

async function validateObservationFactMultiSeriesConfig(input: {
  config: ObservationFactMultiSeriesConfig;
  appUserId: string;
  actorId: string;
}): Promise<ObservationFactMultiSeriesConfig> {
  const validated: Array<
    ObservationFactNumericSeriesConfig | ObservationFactPresenceConfig
  > = [];

  for (const series of input.config.series) {
    if (series.kind === "presence") {
      validated.push(
        await validateObservationPresenceConfig({
          config: series,
          appUserId: input.appUserId,
          actorId: input.actorId,
        }),
      );
      continue;
    }

    const numeric = await validateObservationFactConfig({
      config: series,
      appUserId: input.appUserId,
      actorId: input.actorId,
    });

    validated.push({
      id: series.id,
      kind: "numeric",
      ...numeric,
    });
  }

  return {
    scaleMode: "independent",
    series: validated,
  };
}

function parseCreateInput(value: unknown): DashboardAnalyticsCreateInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;

  if (
    !isDashboardAnalyticsVisualizationType(body.visualizationType) ||
    !isDashboardAnalyticsSourceType(body.sourceType) ||
    !isDashboardAnalyticsAggregation(body.aggregationKey) ||
    !isDashboardAnalyticsGrouping(body.groupByKey)
  ) return null;

  const metricKey = typeof body.metricKey === "string" ? body.metricKey.trim() : "";
  const periodDays = Number(body.periodDays);
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 120)
      : null;

  if (!metricKey || !Number.isFinite(periodDays)) return null;

  const config = asRecord(body.config);

  return {
    title,
    visualizationType: body.visualizationType,
    sourceType: body.sourceType,
    metricKey,
    aggregationKey: body.aggregationKey,
    groupByKey: body.groupByKey,
    periodDays,
    config,
  };
}

export async function POST(request: Request) {
  const { appUser, personActor, errorResponse } = await resolveContext();
  if (errorResponse || !appUser || !personActor) return errorResponse;

  const rawBody = await request.json().catch(() => null);
  const input = parseCreateInput(rawBody);

  if (!input) {
    return NextResponse.json(
      { ok: false, error: "Invalid analytics block configuration" },
      { status: 400 },
    );
  }

  if (!isDashboardAnalyticsV4Supported(input)) {
    return NextResponse.json(
      { ok: false, error: "This analytics combination is not enabled in dashboard analytics v4" },
      { status: 422 },
    );
  }

  let observationFactConfig: ObservationFactConfig | null = null;
  let observationFactMultiSeriesConfig: ObservationFactMultiSeriesConfig | null =
    null;

  if (isObservationFactMultiSeriesInput(input)) {
    const parsedConfig = parseObservationFactMultiSeriesConfig(input.config);
    if (!parsedConfig) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "At least two valid observation fact series are required (maximum six)",
        },
        { status: 400 },
      );
    }

    try {
      observationFactMultiSeriesConfig =
        await validateObservationFactMultiSeriesConfig({
          config: parsedConfig,
          appUserId: appUser.id,
          actorId: personActor.id,
        });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Invalid multi-series observation fact configuration",
        },
        { status: 422 },
      );
    }
  } else if (isObservationFactSeriesInput(input)) {
    const parsedConfig = parseObservationFactConfig(input.config);
    if (!parsedConfig) {
      return NextResponse.json(
        { ok: false, error: "Observation object and numeric parameter are required" },
        { status: 400 },
      );
    }

    try {
      observationFactConfig = await validateObservationFactConfig({
        config: parsedConfig,
        appUserId: appUser.id,
        actorId: personActor.id,
      });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error instanceof Error ? error.message : "Invalid observation fact configuration",
        },
        { status: 422 },
      );
    }
  }

  const { data: previousRows, error: previousError } = await supabase
    .from("dashboard_analytics_blocks")
    .select("sort_order")
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (previousError) {
    return NextResponse.json({ ok: false, error: previousError.message }, { status: 500 });
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
        contract: observationFactMultiSeriesConfig
          ? "dashboard-analytics-v4"
          : observationFactConfig
            ? "dashboard-analytics-v3"
            : "dashboard-analytics-v2",
        layoutWidth: input.visualizationType === "map" ? "full" : "half",
        ...(observationFactMultiSeriesConfig ?? observationFactConfig ?? {}),
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

  return NextResponse.json({ ok: true, block: mapBlock(data as Row) });
}

export async function DELETE(request: Request) {
  const { appUser, personActor, errorResponse } = await resolveContext();
  if (errorResponse || !appUser || !personActor) return errorResponse;

  const url = new URL(request.url);
  const blockId = url.searchParams.get("id")?.trim();
  if (!blockId) {
    return NextResponse.json({ ok: false, error: "Analytics block id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("dashboard_analytics_blocks")
    .delete()
    .eq("id", blockId)
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}