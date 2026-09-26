import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";
import { listPublicGiftCertificates } from "@/app/certificates/gift-certificate-data";
import { isDashboardAnalyticsV4Supported } from "@/lib/dashboard/analytics-contract";
import { resolveLocalizedContentField } from "@/lib/localization/contentLocalization";
import {
  localizeGlobalSystemValueObject,
  normalizeGlobalSystemValueObjectLocale,
} from "@/lib/reality-core/global-system-value-object-localization";
import { aggregateRootTime } from "@/lib/dashboard/root-time-aggregation";
import {
  resolveMeasurementRollupV1,
  type MeasurementRollupFactV1,
} from "@/lib/reality-core/measurement-rollup-contract-v1";
import {
  readMeasurementRollupTargetMetadataV1,
  toMeasurementRollupDefinitionV1,
} from "@/lib/reality-core/measurement-rollup-target-metadata-v1";

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

type ObservationSeriesPoint = {
  date: string;
  valueNumber: number | null;
  observationCount: number;
};

type ObservationFactSeriesPayload = {
  ok?: boolean;
  kind?: string;
  valueObjectId?: string;
  valueObjectTitle?: string;
  parameterDefinitionId?: string;
  parameterCode?: string;
  parameterTitle?: string;
  unit?: string;
  totalValue?: number;
  resolvedObservationCount?: number;
  unknownObservationCount?: number;
  unitMismatchCount?: number;
  sourceFactCount?: number;
  sourceProjectionCount?: number;
  rollupApplied?: boolean;
  series?: ObservationSeriesPoint[];
  error?: string;
};

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asRecord(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Row;
}

function readObservationFactConfig(value: unknown): ObservationFactConfig | null {
  const row = asRecord(value);
  const valueObjectId = asString(row.valueObjectId)?.trim() ?? "";
  const parameterDefinitionId =
    asString(row.parameterDefinitionId)?.trim() ?? "";
  const parameterCode = asString(row.parameterCode)?.trim().toLowerCase() ?? "";
  const canonicalUnitCode =
    asString(row.canonicalUnitCode)?.trim().toLowerCase() ?? "";

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
    valueObjectTitle: asString(row.valueObjectTitle),
    parameterTitle: asString(row.parameterTitle),
  };
}

function readObservationFactMultiSeriesConfig(
  value: unknown,
): ObservationFactMultiSeriesConfig | null {
  const row = asRecord(value);
  const scaleMode = asString(row.scaleMode)?.trim().toLowerCase();
  const rawSeries = Array.isArray(row.series) ? row.series : [];

  if (scaleMode !== "independent" || rawSeries.length < 2 || rawSeries.length > 6) {
    return null;
  }

  const parsed: Array<
    ObservationFactNumericSeriesConfig | ObservationFactPresenceConfig
  > = [];
  const seenIds = new Set<string>();
  const seenSemanticKeys = new Set<string>();

  for (const raw of rawSeries) {
    const item = asRecord(raw);
    const id = asString(item.id)?.trim() ?? "";
    const kind = asString(item.kind)?.trim().toLowerCase() ?? "";
    const valueObjectId = asString(item.valueObjectId)?.trim() ?? "";
    const valueObjectTitle = asString(item.valueObjectTitle);

    if (!UUID_RE.test(id) || !UUID_RE.test(valueObjectId) || seenIds.has(id)) {
      return null;
    }
    seenIds.add(id);

    if (kind === "presence") {
      const semanticKey = `presence:${valueObjectId}`;
      if (seenSemanticKeys.has(semanticKey)) return null;
      seenSemanticKeys.add(semanticKey);
      parsed.push({
        id,
        kind: "presence",
        valueObjectId,
        valueObjectTitle,
      });
      continue;
    }

    if (kind !== "numeric") return null;

    const numeric = readObservationFactConfig(item);
    if (!numeric) return null;
    const semanticKey =
      `numeric:${numeric.valueObjectId}:${numeric.parameterDefinitionId}`;
    if (seenSemanticKeys.has(semanticKey)) return null;
    seenSemanticKeys.add(semanticKey);

    parsed.push({
      id,
      kind: "numeric",
      ...numeric,
    });
  }

  return {
    scaleMode: "independent",
    series: parsed,
  };
}

function rowDateKey(row: Row, timeZone: string): string | null {
  for (const key of ["occurred_at", "period_start", "effective_at", "created_at"]) {
    const raw = asString(row[key]);
    if (!raw) continue;
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return dateKeyInTimeZone(date, timeZone);
    }
  }

  return null;
}

function normalizeTimeZone(value: string | null): string {
  const candidate = value?.trim();
  if (!candidate || candidate.length > 100) return "UTC";

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return "UTC";
  }
}

function dateKeyInTimeZone(value: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day
    ? `${year}-${month}-${day}`
    : value.toISOString().slice(0, 10);
}

function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function eventDateKey(row: Row, timeZone: string): string | null {
  const startedAt = asString(row.started_at);

  if (startedAt) {
    const startedDate = new Date(startedAt);
    if (!Number.isNaN(startedDate.getTime())) {
      return dateKeyInTimeZone(startedDate, timeZone);
    }
  }

  const observedDate = asString(asRecord(row.metadata_json).observedDate);
  if (observedDate && /^\d{4}-\d{2}-\d{2}$/.test(observedDate)) return observedDate;

  const createdAt = asString(row.created_at);
  if (!createdAt) return null;

  const createdDate = new Date(createdAt);
  return Number.isNaN(createdDate.getTime())
    ? null
    : dateKeyInTimeZone(createdDate, timeZone);
}

function durationMinutesForRow(row: Row): number {
  const canonicalDuration = asNumber(row.duration_minutes);
  if (canonicalDuration !== null && canonicalDuration >= 0) return canonicalDuration;

  const startedAt = asString(row.started_at);
  const endedAt = asString(row.ended_at);
  if (!startedAt || !endedAt) return 0;

  const started = new Date(startedAt);
  const ended = new Date(endedAt);

  if (
    Number.isNaN(started.getTime()) ||
    Number.isNaN(ended.getTime()) ||
    ended.getTime() <= started.getTime()
  ) return 0;

  return (ended.getTime() - started.getTime()) / 60_000;
}


function factDateKey(row: Row, timeZone: string): string | null {
  const periodStart = asString(row.period_start);
  if (periodStart) {
    const date = new Date(periodStart);
    if (!Number.isNaN(date.getTime())) return dateKeyInTimeZone(date, timeZone);
  }

  const createdAt = asString(row.created_at);
  if (!createdAt) return null;
  const createdDate = new Date(createdAt);
  return Number.isNaN(createdDate.getTime())
    ? null
    : dateKeyInTimeZone(createdDate, timeZone);
}

function chunkStrings(values: readonly string[], size = 200): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function buildFactDurationByRootResponse(input: {
  readonly blockId: string;
  readonly appUserId: string;
  readonly actorId: string;
  readonly periodDays: number;
  readonly timeZone: string;
  readonly locale: ReturnType<typeof normalizeGlobalSystemValueObjectLocale>;
}) {
  const todayKey = dateKeyInTimeZone(new Date(), input.timeZone);
  const firstKey = shiftDateKey(todayKey, -(input.periodDays - 1));
  const queryFromKey = shiftDateKey(firstKey, -1);
  const queryFromIso = queryFromKey + "T00:00:00.000Z";

  const ownedFactRows: Row[] = [];
  const factPageSize = 1000;
  const factHardLimit = 50000;

  for (let offset = 0; offset < factHardLimit; offset += factPageSize) {
    const { data, error } = await supabase
      .from("activity_object_facts")
      .select("id,period_start,created_at,fact_status,measure_type")
      .eq("user_id", input.appUserId)
      .eq("acting_as_actor_id", input.actorId)
      .eq("fact_status", "confirmed")
      .eq("measure_type", "duration")
      .or("period_start.gte." + queryFromIso + ",created_at.gte." + queryFromIso)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + factPageSize - 1);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const page = Array.isArray(data) ? (data as Row[]) : [];
    ownedFactRows.push(...page);
    if (page.length < factPageSize) break;

    if (ownedFactRows.length >= factHardLimit) {
      return NextResponse.json(
        { ok: false, error: "DASHBOARD_ROOT_TIME_FACT_HARD_LIMIT_REACHED" },
        { status: 409 },
      );
    }
  }

  const eligibleBaseFacts = ownedFactRows.filter((row) => {
    const date = factDateKey(row, input.timeZone);
    return Boolean(date && date >= firstKey && date <= todayKey);
  });

  const eligibleFactIds = eligibleBaseFacts
    .map((row) => asString(row.id))
    .filter((value): value is string => Boolean(value));

  const analyticsRows: Row[] = [];
  for (const ids of chunkStrings(eligibleFactIds)) {
    const { data, error } = await supabase
      .from("activity_fact_analytics_inputs_v1")
      .select(
        "fact_id,activity_event_id,value_object_id,metric_value_numeric,unit,occurred_at,created_at,measure_type",
      )
      .in("fact_id", ids);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    analyticsRows.push(...(Array.isArray(data) ? (data as Row[]) : []));
  }

  const durationProjectionRows = analyticsRows.filter(
    (row) =>
      asString(row.measure_type) === "duration" &&
      Boolean(asString(row.value_object_id)),
  );

  const leafIds = Array.from(
    new Set(
      durationProjectionRows
        .map((row) => asString(row.value_object_id))
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const activityEventIds = Array.from(
    new Set(
      durationProjectionRows
        .map((row) => asString(row.activity_event_id))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const leafRows: Row[] = [];
  for (const ids of chunkStrings(leafIds)) {
    const { data, error } = await supabase
      .from("value_objects")
      .select("id,root_value_object_id")
      .in("id", ids);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    leafRows.push(...(Array.isArray(data) ? (data as Row[]) : []));
  }

  const leafToRoot = new Map<string, string>();
  for (const row of leafRows) {
    const leafId = asString(row.id);
    const rootId = asString(row.root_value_object_id);
    if (leafId && rootId) leafToRoot.set(leafId, rootId);
  }

  const eventDurationMinutes = new Map<string, number>();
  for (const ids of chunkStrings(activityEventIds)) {
    const { data, error } = await supabase
      .from("activity_events")
      .select("id,started_at,ended_at,duration_minutes")
      .eq("user_id", input.appUserId)
      .eq("acting_as_actor_id", input.actorId)
      .in("id", ids);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    for (const raw of Array.isArray(data) ? data : []) {
      const row = raw as Row;
      const activityEventId = asString(row.id);
      if (!activityEventId) continue;
      const minutes = durationMinutesForRow(row);
      if (Number.isFinite(minutes) && minutes >= 0) {
        eventDurationMinutes.set(activityEventId, minutes);
      }
    }
  }

  const aggregation = aggregateRootTime({
    facts: durationProjectionRows.flatMap((row) => {
      const activityEventId = asString(row.activity_event_id);
      const valueObjectId = asString(row.value_object_id);
      const valueNumeric = asNumber(row.metric_value_numeric);
      const unit = asString(row.unit);
      return activityEventId && valueObjectId && valueNumeric !== null && unit
        ? [{ activityEventId, valueObjectId, valueNumeric, unit }]
        : [];
    }),
    leafToRoot,
    eventDurationMinutes,
  });

  const rootIds = aggregation.roots.map((row) => row.rootValueObjectId);
  const rootRows: Row[] = [];
  for (const ids of chunkStrings(rootIds)) {
    const { data, error } = await supabase
      .from("value_objects")
      .select("id,title,canonical_key,scope_code,metadata_json")
      .in("id", ids);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    rootRows.push(...(Array.isArray(data) ? (data as Row[]) : []));
  }

  const rootTitles = new Map<string, string>();
  for (const row of rootRows) {
    const id = asString(row.id);
    if (!id) continue;

    const fallbackTitle = asString(row.title) ?? id;
    const localizedTitle =
      asString(row.scope_code) === "global"
        ? asString(
            localizeGlobalSystemValueObject(
              {
                canonical_key: asString(row.canonical_key),
                title: fallbackTitle,
              },
              input.locale,
            ).title,
          ) ?? fallbackTitle
        : resolveLocalizedContentField({
            metadata: row.metadata_json,
            locale: input.locale,
            fieldCode: "title",
            fallback: fallbackTitle,
          }) ?? fallbackTitle;

    rootTitles.set(id, localizedTitle);
  }

  const rootBreakdown = aggregation.roots.map((row) => ({
    rootValueObjectId: row.rootValueObjectId,
    rootTitle: rootTitles.get(row.rootValueObjectId) ?? row.rootValueObjectId,
    valueMinutes: row.valueMinutes,
    valueHours: Math.round((row.valueMinutes / 60) * 100) / 100,
    percentage:
      aggregation.totalSemanticMinutes > 0
        ? Math.round(
            (row.valueMinutes / aggregation.totalSemanticMinutes) * 10000,
          ) / 100
        : 0,
    activityCount: row.activityCount,
    factProjectionCount: row.factProjectionCount,
  }));

  return NextResponse.json({
    ok: true,
    kind: "fact-duration-by-root",
    blockId: input.blockId,
    timeZone: input.timeZone,
    locale: input.locale,
    sourceType: "facts",
    metricKey: "duration_minutes",
    aggregationKey: "sum",
    groupByKey: "observation_object",
    periodDays: input.periodDays,
    unit: "minutes",
    totalSemanticMinutes: aggregation.totalSemanticMinutes,
    uniqueActivityMinutes: aggregation.uniqueActivityMinutes,
    overlapDetected: aggregation.overlapDetected,
    skippedFactCount: aggregation.skippedFacts,
    sourceFactCount: eligibleBaseFacts.length,
    sourceProjectionCount: durationProjectionRows.length,
    aggregationPolicy:
      "owned confirmed duration facts -> final fact tags -> canonical measure values -> leaf root; once per activity/root; canonical activity duration preferred",
    schemaMode:
      "activity_fact_analytics_inputs_v1 (final tags + activity_event_measures value source)",
    rootBreakdown,
  });
}

async function buildObservationFactSeriesResponse(input: {
  readonly blockId: string;
  readonly appUserId: string;
  readonly actorId: string;
  readonly periodDays: number;
  readonly timeZone: string;
  readonly locale: ReturnType<typeof normalizeGlobalSystemValueObjectLocale>;
  readonly config: ObservationFactConfig;
}) {
  const { data: valueObjectData, error: valueObjectError } = await supabase
    .from("value_objects")
    .select(
      "id,title,canonical_key,status,scope_code,origin_type_code,ontology_node_role_code,node_role_code,owner_user_id,owner_actor_id,metadata_json",
    )
    .eq("id", input.config.valueObjectId)
    .maybeSingle();

  if (valueObjectError) {
    return NextResponse.json(
      { ok: false, error: valueObjectError.message },
      { status: 500 },
    );
  }

  const valueObject = (valueObjectData as Row | null) ?? null;
  if (!valueObject) {
    return NextResponse.json(
      { ok: false, error: "Observation object not found" },
      { status: 404 },
    );
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
    return NextResponse.json(
      { ok: false, error: "Observation object is not an accessible leaf" },
      { status: 403 },
    );
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
    return NextResponse.json(
      { ok: false, error: assignmentError.message },
      { status: 500 },
    );
  }

  const assignment = (assignmentData as Row | null) ?? null;
  const assignmentScope = asString(assignment?.assignment_scope_code);
  const assignmentAccessible = assignment
    ? isGlobalLeaf
      ? assignmentScope === "system"
      : assignmentScope === "actor" &&
        asString(assignment.owner_user_id) === input.appUserId &&
        asString(assignment.owner_actor_id) === input.actorId
    : false;

  if (!assignment || !assignmentAccessible) {
    return NextResponse.json(
      { ok: false, error: "Selected parameter is no longer assigned to this observation object" },
      { status: 409 },
    );
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
    return NextResponse.json(
      { ok: false, error: definitionError.message },
      { status: 500 },
    );
  }

  const definitionRow = (definitionData as Row | null) ?? null;
  if (!definitionRow) {
    return NextResponse.json(
      { ok: false, error: "Selected numeric parameter is not available" },
      { status: 409 },
    );
  }

  const parameterCode =
    asString(definitionRow.parameter_code)?.toLowerCase() ?? "";
  const canonicalUnitCode =
    asString(definitionRow.canonical_unit_code)?.toLowerCase() ?? "";

  if (
    parameterCode !== input.config.parameterCode ||
    canonicalUnitCode !== input.config.canonicalUnitCode
  ) {
    return NextResponse.json(
      { ok: false, error: "Selected parameter contract has changed" },
      { status: 409 },
    );
  }

  const fallbackTitle = asString(valueObject.title) ?? input.config.valueObjectId;
  const valueObjectTitle = isGlobalLeaf
    ? asString(
        localizeGlobalSystemValueObject(
          {
            canonical_key: asString(valueObject.canonical_key),
            title: fallbackTitle,
          },
          input.locale,
        ).title,
      ) ?? fallbackTitle
    : resolveLocalizedContentField({
        metadata: valueObject.metadata_json,
        locale: input.locale,
        fieldCode: "title",
        fallback: fallbackTitle,
      }) ?? fallbackTitle;

  const parameterTitle =
    asString(definitionRow.title) ??
    input.config.parameterTitle ??
    parameterCode;

  let rollupMetadata: ReturnType<
    typeof readMeasurementRollupTargetMetadataV1
  > = null;
  try {
    rollupMetadata = readMeasurementRollupTargetMetadataV1(
      valueObject.metadata_json,
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? `Measurement rollup metadata is invalid: ${error.message}`
            : "Measurement rollup metadata is invalid",
      },
      { status: 409 },
    );
  }

  const rollupDefinition =
    rollupMetadata &&
    rollupMetadata.parameterDefinitionId === input.config.parameterDefinitionId &&
    rollupMetadata.parameterCode === parameterCode &&
    rollupMetadata.canonicalUnitCode === canonicalUnitCode
      ? toMeasurementRollupDefinitionV1(
          input.config.valueObjectId,
          rollupMetadata,
        )
      : null;

  const relevantValueObjectIds = new Set<string>([
    input.config.valueObjectId,
    ...(rollupDefinition?.componentValueObjectIds ?? []),
  ]);

  const todayKey = dateKeyInTimeZone(new Date(), input.timeZone);
  const firstKey = shiftDateKey(todayKey, -(input.periodDays - 1));
  const queryFromKey = shiftDateKey(firstKey, -1);
  const queryFromIso = `${queryFromKey}T00:00:00.000Z`;

  const baseFacts: Row[] = [];
  const pageSize = 1000;
  const hardLimit = 50000;

  for (let offset = 0; offset < hardLimit; offset += pageSize) {
    const { data, error } = await supabase
      .from("activity_object_facts")
      .select(
        "id,activity_event_id,value_object_id,value_numeric,unit,measure_type,period_start,effective_at,created_at,fact_status,parameter_definition_id",
      )
      .eq("user_id", input.appUserId)
      .eq("acting_as_actor_id", input.actorId)
      .eq("fact_status", "confirmed")
      .eq("parameter_definition_id", input.config.parameterDefinitionId)
      .or(
        `period_start.gte.${queryFromIso},effective_at.gte.${queryFromIso},created_at.gte.${queryFromIso}`,
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const page = Array.isArray(data) ? (data as Row[]) : [];
    baseFacts.push(...page);
    if (page.length < pageSize) break;

    if (baseFacts.length >= hardLimit) {
      return NextResponse.json(
        { ok: false, error: "DASHBOARD_OBSERVATION_FACT_HARD_LIMIT_REACHED" },
        { status: 409 },
      );
    }
  }

  const eligibleBaseFacts = baseFacts.filter((row) => {
    const date = rowDateKey(row, input.timeZone);
    return Boolean(date && date >= firstKey && date <= todayKey);
  });

  const baseFactById = new Map<string, Row>();
  const baseDateByFactId = new Map<string, string>();
  const factIds = eligibleBaseFacts.flatMap((row) => {
    const factId = asString(row.id);
    const date = rowDateKey(row, input.timeZone);
    if (!factId || !date) return [];
    baseFactById.set(factId, row);
    baseDateByFactId.set(factId, date);
    return [factId];
  });

  const projectionRows: Row[] = [];
  const seenProjectionKeys = new Set<string>();

  const appendProjection = (factRow: Row, valueObjectId: string) => {
    const factId = asString(factRow.id);
    const activityEventId = asString(factRow.activity_event_id);
    const valueNumber = asNumber(factRow.value_numeric);
    const unit = asString(factRow.unit);
    if (!factId || !activityEventId || valueNumber === null || !unit) {
      return;
    }

    const projectionKey = `${factId}|${valueObjectId}`;
    if (seenProjectionKeys.has(projectionKey)) return;
    seenProjectionKeys.add(projectionKey);

    projectionRows.push({
      fact_id: factId,
      activity_event_id: activityEventId,
      value_object_id: valueObjectId,
      metric_value_numeric: valueNumber,
      unit,
      period_start: factRow.period_start,
      effective_at: factRow.effective_at,
      created_at: factRow.created_at,
      measure_type: factRow.measure_type,
    });
  };

  // The fact's direct value_object_id is always a valid fallback semantic target.
  for (const row of eligibleBaseFacts) {
    const directValueObjectId = asString(row.value_object_id);
    if (directValueObjectId) {
      appendProjection(row, directValueObjectId);
    }
  }

  // Preserve final effective semantic links without depending on the legacy
  // activity_fact_analytics_inputs_v1 column layout.
  for (const ids of chunkStrings(factIds)) {
    const { data, error } = await supabase
      .from("activity_fact_value_object_links_effective_v1")
      .select("fact_id,value_object_id,source_code,is_materialized")
      .in("fact_id", ids);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    for (const raw of Array.isArray(data) ? data : []) {
      const link = raw as Row;
      const factId = asString(link.fact_id);
      const valueObjectId = asString(link.value_object_id);
      if (!factId || !valueObjectId) continue;

      const factRow = baseFactById.get(factId);
      if (!factRow) continue;
      appendProjection(factRow, valueObjectId);
    }
  }

  const relevantRows = projectionRows.filter((row) => {
    const valueObjectId = asString(row.value_object_id);
    const value = asNumber(row.metric_value_numeric);
    return Boolean(
      valueObjectId &&
        relevantValueObjectIds.has(valueObjectId) &&
        value !== null,
    );
  });

  const buckets = new Map<
    string,
    { valueNumber: number | null; observationCount: number }
  >();

  for (let offset = 0; offset < input.periodDays; offset += 1) {
    buckets.set(shiftDateKey(firstKey, offset), {
      valueNumber: null,
      observationCount: 0,
    });
  }

  const addResolvedValue = (date: string | null, value: number) => {
    if (!date || !buckets.has(date) || !Number.isFinite(value)) return;
    const bucket = buckets.get(date);
    if (!bucket) return;

    bucket.valueNumber =
      bucket.valueNumber === null ? value : bucket.valueNumber + value;
    bucket.observationCount += 1;
  };

  let resolvedObservationCount = 0;
  let unknownObservationCount = 0;
  let unitMismatchCount = 0;
  let discrepancyCount = 0;
  let directCount = 0;
  let derivedCount = 0;
  let directVerifiedCount = 0;

  if (rollupDefinition) {
    const rowsByEventId = new Map<string, Row[]>();

    for (const row of relevantRows) {
      const activityEventId = asString(row.activity_event_id);
      if (!activityEventId) {
        unknownObservationCount += 1;
        continue;
      }

      const current = rowsByEventId.get(activityEventId) ?? [];
      current.push(row);
      rowsByEventId.set(activityEventId, current);
    }

    for (const [activityEventId, eventRows] of rowsByEventId.entries()) {
      const rollupFacts: MeasurementRollupFactV1[] = [];
      const seenProjectionKeys = new Set<string>();

      for (const row of eventRows) {
        const factId = asString(row.fact_id);
        const valueObjectId = asString(row.value_object_id);
        const valueNumber = asNumber(row.metric_value_numeric);
        const unitCode = asString(row.unit)?.toLowerCase() ?? "";

        if (!factId || !valueObjectId || valueNumber === null || !unitCode) {
          continue;
        }

        const projectionKey = `${factId}|${valueObjectId}`;
        if (seenProjectionKeys.has(projectionKey)) continue;
        seenProjectionKeys.add(projectionKey);

        rollupFacts.push({
          factId: projectionKey,
          activityEventId,
          measurementBundleId: null,
          parameterCode,
          valueObjectId,
          valueNumber,
          unitCode,
        });
      }

      if (rollupFacts.length === 0) {
        unknownObservationCount += 1;
        continue;
      }

      const resolution = resolveMeasurementRollupV1({
        definition: rollupDefinition,
        facts: rollupFacts,
        activityEventId,
      });

      if (resolution.status === "unit_mismatch") {
        unitMismatchCount += 1;
      }
      if (resolution.status === "discrepancy") {
        discrepancyCount += 1;
      }
      if (resolution.status === "direct") {
        directCount += 1;
      }
      if (resolution.status === "derived") {
        derivedCount += 1;
      }
      if (resolution.status === "direct_verified") {
        directVerifiedCount += 1;
      }

      if (
        resolution.effectiveValueNumber === null ||
        resolution.effectiveUnitCode !== canonicalUnitCode
      ) {
        unknownObservationCount += 1;
        continue;
      }

      const firstFactId = asString(eventRows[0]?.fact_id);
      const date =
        (firstFactId ? baseDateByFactId.get(firstFactId) : null) ??
        rowDateKey(eventRows[0] ?? {}, input.timeZone);

      addResolvedValue(date, resolution.effectiveValueNumber);
      resolvedObservationCount += 1;
    }
  } else {
    const seenFactIds = new Set<string>();

    for (const row of relevantRows) {
      if (asString(row.value_object_id) !== input.config.valueObjectId) {
        continue;
      }

      const factId = asString(row.fact_id);
      const valueNumber = asNumber(row.metric_value_numeric);
      const unitCode = asString(row.unit)?.toLowerCase() ?? "";
      if (!factId || valueNumber === null) continue;
      if (seenFactIds.has(factId)) continue;
      seenFactIds.add(factId);

      if (unitCode !== canonicalUnitCode) {
        unitMismatchCount += 1;
        unknownObservationCount += 1;
        continue;
      }

      const date =
        baseDateByFactId.get(factId) ??
        rowDateKey(row, input.timeZone);

      addResolvedValue(date, valueNumber);
      resolvedObservationCount += 1;
    }
  }

  const series = Array.from(buckets.entries()).map(([date, bucket]) => ({
    date,
    valueNumber:
      bucket.valueNumber === null
        ? null
        : Math.round(bucket.valueNumber * 10000) / 10000,
    observationCount: bucket.observationCount,
  }));

  const totalValue =
    Math.round(
      series.reduce(
        (sum, row) => sum + (row.valueNumber === null ? 0 : row.valueNumber),
        0,
      ) * 10000,
    ) / 10000;

  return NextResponse.json({
    ok: true,
    kind: "observation-fact-series",
    blockId: input.blockId,
    timeZone: input.timeZone,
    locale: input.locale,
    sourceType: "facts",
    metricKey: "numeric_value",
    aggregationKey: "sum",
    groupByKey: "day",
    periodDays: input.periodDays,
    valueObjectId: input.config.valueObjectId,
    valueObjectTitle,
    parameterDefinitionId: input.config.parameterDefinitionId,
    parameterCode,
    parameterTitle,
    unit: canonicalUnitCode,
    totalValue,
    resolvedObservationCount,
    unknownObservationCount,
    unitMismatchCount,
    sourceFactCount: eligibleBaseFacts.length,
    sourceProjectionCount: relevantRows.length,
    rollupApplied: Boolean(rollupDefinition),
    rollup: rollupDefinition
      ? {
          sourceValueObjectIds: rollupDefinition.componentValueObjectIds,
          directCount,
          derivedCount,
          directVerifiedCount,
          discrepancyCount,
          missingValuePolicy: rollupDefinition.missingValuePolicy,
          directValuePolicy: rollupDefinition.directValuePolicy,
          discrepancyToleranceAbsolute:
            rollupDefinition.discrepancyToleranceAbsolute,
        }
      : null,
    series,
  });
}

async function buildObservationPresenceSeriesResponse(input: {
  readonly blockId: string;
  readonly appUserId: string;
  readonly actorId: string;
  readonly periodDays: number;
  readonly timeZone: string;
  readonly locale: ReturnType<typeof normalizeGlobalSystemValueObjectLocale>;
  readonly config: ObservationFactPresenceConfig;
}) {
  const { data: valueObjectData, error: valueObjectError } = await supabase
    .from("value_objects")
    .select(
      "id,title,canonical_key,status,scope_code,ontology_node_role_code,node_role_code,owner_user_id,owner_actor_id,metadata_json",
    )
    .eq("id", input.config.valueObjectId)
    .maybeSingle();

  if (valueObjectError) {
    return NextResponse.json(
      { ok: false, error: valueObjectError.message },
      { status: 500 },
    );
  }

  const valueObject = (valueObjectData as Row | null) ?? null;
  if (!valueObject) {
    return NextResponse.json(
      { ok: false, error: "Observation object not found" },
      { status: 404 },
    );
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
    return NextResponse.json(
      { ok: false, error: "Observation object is not an accessible leaf" },
      { status: 403 },
    );
  }

  const fallbackTitle = asString(valueObject.title) ?? input.config.valueObjectId;
  const valueObjectTitle = isGlobalLeaf
    ? asString(
        localizeGlobalSystemValueObject(
          {
            canonical_key: asString(valueObject.canonical_key),
            title: fallbackTitle,
          },
          input.locale,
        ).title,
      ) ?? fallbackTitle
    : resolveLocalizedContentField({
        metadata: valueObject.metadata_json,
        locale: input.locale,
        fieldCode: "title",
        fallback: fallbackTitle,
      }) ?? fallbackTitle;

  const todayKey = dateKeyInTimeZone(new Date(), input.timeZone);
  const firstKey = shiftDateKey(todayKey, -(input.periodDays - 1));
  const queryFromKey = shiftDateKey(firstKey, -1);
  const queryFromIso = `${queryFromKey}T00:00:00.000Z`;

  const baseFacts: Row[] = [];
  const pageSize = 1000;
  const hardLimit = 50000;

  for (let offset = 0; offset < hardLimit; offset += pageSize) {
    const { data, error } = await supabase
      .from("activity_object_facts")
      .select(
        "id,value_object_id,period_start,effective_at,created_at,fact_status",
      )
      .eq("user_id", input.appUserId)
      .eq("acting_as_actor_id", input.actorId)
      .eq("fact_status", "confirmed")
      .or(
        `period_start.gte.${queryFromIso},effective_at.gte.${queryFromIso},created_at.gte.${queryFromIso}`,
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const page = Array.isArray(data) ? (data as Row[]) : [];
    baseFacts.push(...page);
    if (page.length < pageSize) break;

    if (baseFacts.length >= hardLimit) {
      return NextResponse.json(
        { ok: false, error: "DASHBOARD_OBSERVATION_PRESENCE_HARD_LIMIT_REACHED" },
        { status: 409 },
      );
    }
  }

  const eligibleFacts = baseFacts.filter((row) => {
    const date = rowDateKey(row, input.timeZone);
    return Boolean(date && date >= firstKey && date <= todayKey);
  });

  const dateByFactId = new Map<string, string>();
  const matchedFactIds = new Set<string>();
  const factIds: string[] = [];

  for (const row of eligibleFacts) {
    const factId = asString(row.id);
    const date = rowDateKey(row, input.timeZone);
    if (!factId || !date) continue;

    dateByFactId.set(factId, date);
    factIds.push(factId);

    if (asString(row.value_object_id) === input.config.valueObjectId) {
      matchedFactIds.add(factId);
    }
  }

  for (const ids of chunkStrings(factIds)) {
    const { data, error } = await supabase
      .from("activity_fact_value_object_links_effective_v1")
      .select("fact_id,value_object_id")
      .in("fact_id", ids)
      .eq("value_object_id", input.config.valueObjectId);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    for (const raw of Array.isArray(data) ? data : []) {
      const factId = asString((raw as Row).fact_id);
      if (factId) matchedFactIds.add(factId);
    }
  }

  const buckets = new Map<
    string,
    { valueNumber: number | null; observationCount: number }
  >();

  for (let offset = 0; offset < input.periodDays; offset += 1) {
    buckets.set(shiftDateKey(firstKey, offset), {
      valueNumber: null,
      observationCount: 0,
    });
  }

  for (const factId of matchedFactIds) {
    const date = dateByFactId.get(factId);
    if (!date || !buckets.has(date)) continue;

    const bucket = buckets.get(date);
    if (!bucket) continue;

    bucket.valueNumber = 1;
    bucket.observationCount += 1;
  }

  const series = Array.from(buckets.entries()).map(([date, bucket]) => ({
    date,
    valueNumber: bucket.valueNumber,
    observationCount: bucket.observationCount,
  }));

  return NextResponse.json({
    ok: true,
    kind: "observation-presence-series",
    blockId: input.blockId,
    timeZone: input.timeZone,
    locale: input.locale,
    sourceType: "facts",
    metricKey: "presence",
    aggregationKey: "presence",
    groupByKey: "day",
    periodDays: input.periodDays,
    valueObjectId: input.config.valueObjectId,
    valueObjectTitle,
    parameterTitle: null,
    unit: "presence",
    totalValue: series.reduce(
      (sum, row) => sum + (row.valueNumber === null ? 0 : row.valueNumber),
      0,
    ),
    resolvedObservationCount: matchedFactIds.size,
    unknownObservationCount: 0,
    sourceFactCount: eligibleFacts.length,
    sourceProjectionCount: matchedFactIds.size,
    rollupApplied: false,
    series,
  });
}

async function buildObservationFactMultiSeriesResponse(input: {
  readonly blockId: string;
  readonly appUserId: string;
  readonly actorId: string;
  readonly periodDays: number;
  readonly timeZone: string;
  readonly locale: ReturnType<typeof normalizeGlobalSystemValueObjectLocale>;
  readonly config: ObservationFactMultiSeriesConfig;
}) {
  const factSeries = [];

  for (const seriesConfig of input.config.series) {
    const response =
      seriesConfig.kind === "presence"
        ? await buildObservationPresenceSeriesResponse({
            blockId: input.blockId,
            appUserId: input.appUserId,
            actorId: input.actorId,
            periodDays: input.periodDays,
            timeZone: input.timeZone,
            locale: input.locale,
            config: seriesConfig,
          })
        : await buildObservationFactSeriesResponse({
            blockId: input.blockId,
            appUserId: input.appUserId,
            actorId: input.actorId,
            periodDays: input.periodDays,
            timeZone: input.timeZone,
            locale: input.locale,
            config: seriesConfig,
          });

    if (!response.ok) return response;

    const payload = (await response.json()) as ObservationFactSeriesPayload;
    if (!payload.ok || !Array.isArray(payload.series)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            payload.error ?? "Could not resolve one of the multi-series fact rows",
        },
        { status: 500 },
      );
    }

    factSeries.push({
      id: seriesConfig.id,
      kind: seriesConfig.kind,
      valueObjectId: seriesConfig.valueObjectId,
      valueObjectTitle:
        payload.valueObjectTitle ??
        seriesConfig.valueObjectTitle ??
        seriesConfig.valueObjectId,
      parameterDefinitionId:
        seriesConfig.kind === "numeric"
          ? seriesConfig.parameterDefinitionId
          : null,
      parameterCode:
        seriesConfig.kind === "numeric" ? seriesConfig.parameterCode : null,
      parameterTitle:
        seriesConfig.kind === "numeric"
          ? payload.parameterTitle ?? seriesConfig.parameterTitle
          : null,
      unit:
        seriesConfig.kind === "numeric"
          ? payload.unit ?? seriesConfig.canonicalUnitCode
          : "presence",
      resolvedObservationCount: payload.resolvedObservationCount ?? 0,
      unknownObservationCount: payload.unknownObservationCount ?? 0,
      rollupApplied: payload.rollupApplied ?? false,
      points: payload.series,
    });
  }

  return NextResponse.json({
    ok: true,
    kind: "observation-fact-multi-series",
    blockId: input.blockId,
    timeZone: input.timeZone,
    locale: input.locale,
    sourceType: "facts",
    metricKey: "multi_series",
    aggregationKey: "sum",
    groupByKey: "day",
    periodDays: input.periodDays,
    scaleMode: input.config.scaleMode,
    factSeries,
  });
}

async function buildCertificateMapResponse(blockId: string) {
  try {
    const certificates = await listPublicGiftCertificates();
    const markers = certificates
      .filter(
        (item) =>
          item.flowState === "available" &&
          item.publicVisibilityStatus === "visible" &&
          item.providerLocation?.latitude !== null &&
          item.providerLocation?.latitude !== undefined &&
          item.providerLocation?.longitude !== null &&
          item.providerLocation?.longitude !== undefined,
      )
      .map((item) => ({
        activityEventId: item.activityEventId,
        title: item.title,
        providerDisplayName: item.providerDisplayName,
        latitude: item.providerLocation?.latitude ?? null,
        longitude: item.providerLocation?.longitude ?? null,
        city: item.providerLocation?.city ?? null,
        district: item.providerLocation?.district ?? null,
        countryCode: item.providerLocation?.countryCode ?? null,
        pointsPrice: item.pointsPrice,
        moneyRemainder: item.moneyRemainder,
        providerCurrency: item.providerCurrency,
      }))
      .filter(
        (item) =>
          typeof item.latitude === "number" &&
          Number.isFinite(item.latitude) &&
          typeof item.longitude === "number" &&
          Number.isFinite(item.longitude),
      );

    return NextResponse.json({
      ok: true,
      kind: "certificate-map",
      blockId,
      availableCertificateCount: markers.length,
      markers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not load certificate map",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();

  if (errorResponse) return errorResponse;

  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "Dashboard actor context not found" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const blockId = url.searchParams.get("blockId")?.trim();
  const timeZone = normalizeTimeZone(url.searchParams.get("timeZone"));
  const locale = normalizeGlobalSystemValueObjectLocale(
    url.searchParams.get("locale"),
  );

  if (!blockId) {
    return NextResponse.json(
      { ok: false, error: "Analytics block id is required" },
      { status: 400 },
    );
  }

  const { data: blockRaw, error: blockError } = await supabase
    .from("dashboard_analytics_blocks")
    .select("*")
    .eq("id", blockId)
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
    .eq("is_visible", true)
    .single();

  if (blockError || !blockRaw) {
    return NextResponse.json(
      { ok: false, error: blockError?.message ?? "Analytics block not found" },
      { status: blockError?.code === "PGRST116" ? 404 : 500 },
    );
  }

  const block = blockRaw as Row;
  const input = {
    visualizationType: asString(block.visualization_type) as
      | "line"
      | "bar"
      | "metric"
      | "map"
      | "donut",
    sourceType: asString(block.source_type) as
      | "activities"
      | "facts"
      | "certificates",
    metricKey: asString(block.metric_key) ?? "",
    aggregationKey: asString(block.aggregation_key) as "sum" | "count",
    groupByKey: asString(block.group_by_key) as
      | "day"
      | "observation_object"
      | "location",
    periodDays: Number(block.period_days),
  };

  if (!isDashboardAnalyticsV4Supported(input)) {
    return NextResponse.json(
      { ok: false, error: "Analytics block configuration is not executable in v4" },
      { status: 422 },
    );
  }

  if (
    input.visualizationType === "line" &&
    input.sourceType === "facts" &&
    input.metricKey === "multi_series" &&
    input.aggregationKey === "sum" &&
    input.groupByKey === "day"
  ) {
    const config = readObservationFactMultiSeriesConfig(block.config_json);
    if (!config) {
      return NextResponse.json(
        {
          ok: false,
          error: "Multi-series observation fact analytics configuration is incomplete",
        },
        { status: 422 },
      );
    }

    return buildObservationFactMultiSeriesResponse({
      blockId,
      appUserId: appUser.id,
      actorId: personActor.id,
      periodDays: input.periodDays,
      timeZone,
      locale,
      config,
    });
  }

  if (
    (input.visualizationType === "line" ||
      input.visualizationType === "bar" ||
      input.visualizationType === "metric") &&
    input.sourceType === "facts" &&
    input.metricKey === "numeric_value" &&
    input.aggregationKey === "sum" &&
    input.groupByKey === "day"
  ) {
    const config = readObservationFactConfig(block.config_json);
    if (!config) {
      return NextResponse.json(
        { ok: false, error: "Observation fact analytics configuration is incomplete" },
        { status: 422 },
      );
    }

    return buildObservationFactSeriesResponse({
      blockId,
      appUserId: appUser.id,
      actorId: personActor.id,
      periodDays: input.periodDays,
      timeZone,
      locale,
      config,
    });
  }

  if (
    input.visualizationType === "donut" &&
    input.sourceType === "facts" &&
    input.metricKey === "duration_minutes" &&
    input.aggregationKey === "sum" &&
    input.groupByKey === "observation_object"
  ) {
    return buildFactDurationByRootResponse({
      blockId,
      appUserId: appUser.id,
      actorId: personActor.id,
      periodDays: input.periodDays,
      timeZone,
      locale,
    });
  }

  if (input.visualizationType === "map" && input.sourceType === "certificates") {
    return buildCertificateMapResponse(blockId);
  }

  const todayKey = dateKeyInTimeZone(new Date(), timeZone);
  const firstKey = shiftDateKey(todayKey, -(input.periodDays - 1));
  const queryFromKey = shiftDateKey(firstKey, -1);
  const queryFromIso = `${queryFromKey}T00:00:00.000Z`;

  const { data: eventRowsRaw, error: eventsError } = await supabase
    .from("activity_events")
    .select("id,status,activity_role_code,started_at,ended_at,duration_minutes,created_at,metadata_json")
    .eq("user_id", appUser.id)
    .eq("acting_as_actor_id", personActor.id)
    .eq("activity_role_code", "actual")
    .neq("status", "cancelled")
    .neq("status", "archived")
    .or(`started_at.gte.${queryFromIso},created_at.gte.${queryFromIso}`)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (eventsError) {
    return NextResponse.json({ ok: false, error: eventsError.message }, { status: 500 });
  }

  const buckets = new Map<string, { valueMinutes: number; activityCount: number }>();

  for (let offset = 0; offset < input.periodDays; offset += 1) {
    buckets.set(shiftDateKey(firstKey, offset), { valueMinutes: 0, activityCount: 0 });
  }

  for (const rawRow of Array.isArray(eventRowsRaw) ? eventRowsRaw : []) {
    const row = rawRow as Row;
    const date = eventDateKey(row, timeZone);
    if (!date || !buckets.has(date)) continue;

    const current = buckets.get(date);
    if (!current) continue;

    current.valueMinutes += durationMinutesForRow(row);
    current.activityCount += 1;
  }

  const series = Array.from(buckets.entries()).map(([date, bucket]) => ({
    date,
    valueMinutes: Math.round(bucket.valueMinutes * 100) / 100,
    valueHours: Math.round((bucket.valueMinutes / 60) * 100) / 100,
    activityCount: bucket.activityCount,
  }));

  const totalMinutes =
    Math.round(series.reduce((sum, row) => sum + row.valueMinutes, 0) * 100) / 100;

  return NextResponse.json({
    ok: true,
    kind:
      input.metricKey === "activity_count"
        ? "activity-count"
        : "activity-duration",
    blockId,
    timeZone,
    sourceType: input.sourceType,
    metricKey: input.metricKey,
    aggregationKey: input.aggregationKey,
    groupByKey: input.groupByKey,
    periodDays: input.periodDays,
    unit: "minutes",
    totalMinutes,
    activityCount: series.reduce((sum, row) => sum + row.activityCount, 0),
    series,
  });
}