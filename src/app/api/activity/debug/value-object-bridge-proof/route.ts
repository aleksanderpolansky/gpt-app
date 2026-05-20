import { NextResponse } from "next/server";

import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

const ENDPOINT = "/api/activity/debug/value-object-bridge-proof";
const P4_STEP = "P4.10.0-C8-P3-B7-C2-D-B1";

type GenericRecord = Record<string, unknown>;

type QueryResult = {
  table: string;
  ok: boolean;
  rows: GenericRecord[];
  error: {
    message: string;
    details: string | null;
    hint: string | null;
    code: string | null;
  } | null;
};

function isRecord(value: unknown): value is GenericRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .map((value) => asString(value))
        .filter((value): value is string => Boolean(value))
    )
  );
}

function pickString(row: GenericRecord, keys: string[]) {
  for (const key of keys) {
    const value = asString(row[key]);
    if (value) {
      return value;
    }
  }

  return null;
}

function collectIds(rows: GenericRecord[], keys: string[]) {
  const values: string[] = [];

  for (const row of rows) {
    for (const key of keys) {
      const value = asString(row[key]);
      if (value) {
        values.push(value);
      }
    }
  }

  return uniqueStrings(values);
}

function extractCategorySlug(row: GenericRecord) {
  const directSlug = pickString(row, [
    "candidate_slug",
    "category_slug",
    "slug",
    "semantic_slug",
    "rubricator_slug",
    "category_key",
    "key",
  ]);

  if (directSlug) {
    return directSlug;
  }

  const metadata = row.metadata_json ?? row.metadata ?? row.extra_json;

  if (isRecord(metadata)) {
    return pickString(metadata, [
      "candidateSlug",
      "candidate_slug",
      "categorySlug",
      "category_slug",
      "slug",
      "semanticSlug",
      "semantic_slug",
    ]);
  }

  return null;
}

function mapRows(rows: unknown) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.filter(isRecord);
}

async function selectByEq(
  table: string,
  column: string,
  value: string
): Promise<QueryResult> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq(column, value);

  return {
    table,
    ok: !error,
    rows: mapRows(data),
    error: error
      ? {
          message: error.message,
          details: error.details ?? null,
          hint: error.hint ?? null,
          code: error.code ?? null,
        }
      : null,
  };
}

async function selectByIn(
  table: string,
  column: string,
  values: string[]
): Promise<QueryResult> {
  if (values.length === 0) {
    return {
      table,
      ok: true,
      rows: [],
      error: null,
    };
  }

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .in(column, values);

  return {
    table,
    ok: !error,
    rows: mapRows(data),
    error: error
      ? {
          message: error.message,
          details: error.details ?? null,
          hint: error.hint ?? null,
          code: error.code ?? null,
        }
      : null,
  };
}

function summarizeTable(result: QueryResult) {
  return {
    table: result.table,
    ok: result.ok,
    count: result.rows.length,
    error: result.error,
  };
}

function firstRows(rows: GenericRecord[], limit = 3) {
  return rows.slice(0, limit);
}

export async function GET(request: Request) {
  if (!ACTIVITY_RECORDING_ENABLED) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
      },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId")?.trim();

  if (!eventId) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: "Missing eventId query parameter.",
        example:
          "/api/activity/debug/value-object-bridge-proof?eventId=8c63cfc8-acb3-4a08-9de5-c5dbfd4c6d0a",
      },
      { status: 400 }
    );
  }

  const { appUser, errorResponse } = await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: "User context not found",
      },
      { status: 500 }
    );
  }

  const activityEventResult = await selectByEq("activity_events", "id", eventId);
  const event = activityEventResult.rows[0] ?? null;

  const eventUserId = event ? asString(event.user_id) : null;

  if (event && eventUserId && eventUserId !== appUser.id) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: "Activity event does not belong to the current authenticated user.",
      },
      { status: 403 }
    );
  }

  const activityEventValueObjectLinksResult = await selectByEq(
    "activity_event_value_object_links",
    "activity_event_id",
    eventId
  );

  const activityEventValueObjectInstanceLinksResult = await selectByEq(
    "activity_event_value_object_instance_links",
    "activity_event_id",
    eventId
  );

  const valueObjectIds = uniqueStrings([
    ...collectIds(activityEventValueObjectLinksResult.rows, [
      "value_object_id",
      "target_value_object_id",
      "object_id",
    ]),
    ...collectIds(activityEventValueObjectInstanceLinksResult.rows, [
      "value_object_id",
      "target_value_object_id",
      "object_id",
    ]),
  ]);

  const valueObjectInstanceIds = uniqueStrings([
    ...collectIds(activityEventValueObjectLinksResult.rows, [
      "value_object_instance_id",
      "instance_id",
      "target_value_object_instance_id",
    ]),
    ...collectIds(activityEventValueObjectInstanceLinksResult.rows, [
      "value_object_instance_id",
      "instance_id",
      "target_value_object_instance_id",
    ]),
  ]);

  const valueObjectsResult = await selectByIn(
    "value_objects",
    "id",
    valueObjectIds
  );

  const valueObjectInstancesResult = await selectByIn(
    "value_object_instances",
    "id",
    valueObjectInstanceIds
  );

  const instanceValueObjectIds = collectIds(valueObjectInstancesResult.rows, [
    "value_object_id",
    "object_id",
  ]);

  const allValueObjectIds = uniqueStrings([
    ...valueObjectIds,
    ...instanceValueObjectIds,
  ]);

  const allValueObjectInstanceIds = uniqueStrings([
    ...valueObjectInstanceIds,
    ...collectIds(valueObjectInstancesResult.rows, ["id"]),
  ]);

  const stateDeltasByEventResult = await selectByEq(
    "value_object_state_deltas",
    "activity_event_id",
    eventId
  );

  const stateDeltasByInstanceResult = await selectByIn(
    "value_object_state_deltas",
    "value_object_instance_id",
    allValueObjectInstanceIds
  );

  const dailyAggregatesResult = await selectByIn(
    "value_object_daily_aggregates",
    "value_object_id",
    allValueObjectIds
  );

  const stateSnapshotsResult = await selectByIn(
    "value_object_state_snapshots",
    "value_object_id",
    allValueObjectIds
  );

  const usageAggregatesResult = await selectByIn(
    "value_object_usage_aggregates",
    "value_object_id",
    allValueObjectIds
  );

  const categoryLinksResult = await selectByIn(
    "value_object_category_links",
    "value_object_id",
    allValueObjectIds
  );

  const categoryIds = collectIds(categoryLinksResult.rows, ["category_id"]);
  const categorySlugsFromLinks = uniqueStrings(
    categoryLinksResult.rows.map(extractCategorySlug)
  );

  const allResults = [
    activityEventResult,
    activityEventValueObjectLinksResult,
    activityEventValueObjectInstanceLinksResult,
    valueObjectsResult,
    valueObjectInstancesResult,
    stateDeltasByEventResult,
    stateDeltasByInstanceResult,
    dailyAggregatesResult,
    stateSnapshotsResult,
    usageAggregatesResult,
    categoryLinksResult,
  ];

  const errors = allResults
    .filter((result) => !result.ok)
    .map((result) => ({
      table: result.table,
      error: result.error,
    }));

  const missingArtifacts = {
    event: !event,
    activityEventValueObjectLinks:
      activityEventValueObjectLinksResult.rows.length === 0,
    activityEventValueObjectInstanceLinks:
      activityEventValueObjectInstanceLinksResult.rows.length === 0,
    valueObjects: valueObjectsResult.rows.length === 0,
    valueObjectInstances: valueObjectInstancesResult.rows.length === 0,
    stateDeltas:
      stateDeltasByEventResult.rows.length === 0 &&
      stateDeltasByInstanceResult.rows.length === 0,
    dailyAggregates: dailyAggregatesResult.rows.length === 0,
    stateSnapshots: stateSnapshotsResult.rows.length === 0,
    usageAggregates: usageAggregatesResult.rows.length === 0,
    valueObjectCategoryLinks: categoryLinksResult.rows.length === 0,
    categorySlugs: categorySlugsFromLinks.length === 0,
  };

  const proofSummary = {
    eventId,
    eventFound: Boolean(event),
    eventStatus: event ? asString(event.status) : null,
    eventProcessingStatus: event ? asString(event.processing_status) : null,
    valueObjectIds: allValueObjectIds,
    valueObjectInstanceIds: allValueObjectInstanceIds,
    categoryIds,
    categorySlugsFromLinks,
    counts: {
      activityEventValueObjectLinks:
        activityEventValueObjectLinksResult.rows.length,
      activityEventValueObjectInstanceLinks:
        activityEventValueObjectInstanceLinksResult.rows.length,
      valueObjects: valueObjectsResult.rows.length,
      valueObjectInstances: valueObjectInstancesResult.rows.length,
      stateDeltasByEvent: stateDeltasByEventResult.rows.length,
      stateDeltasByInstance: stateDeltasByInstanceResult.rows.length,
      dailyAggregates: dailyAggregatesResult.rows.length,
      stateSnapshots: stateSnapshotsResult.rows.length,
      usageAggregates: usageAggregatesResult.rows.length,
      valueObjectCategoryLinks: categoryLinksResult.rows.length,
      categorySlugsFromLinks: categorySlugsFromLinks.length,
      errors: errors.length,
    },
  };

  return NextResponse.json({
    ok: errors.length === 0 && Boolean(event),
    endpoint: ENDPOINT,
    p4Step: P4_STEP,
    mode: "read_only_value_object_bridge_proof",
    eventId,
    proofSummary,
    missingArtifacts,
    errors,
    tables: allResults.map(summarizeTable),
    proof: {
      event,
      activityEventValueObjectLinks: activityEventValueObjectLinksResult.rows,
      activityEventValueObjectInstanceLinks:
        activityEventValueObjectInstanceLinksResult.rows,
      valueObjects: valueObjectsResult.rows,
      valueObjectInstances: valueObjectInstancesResult.rows,
      stateDeltasByEvent: stateDeltasByEventResult.rows,
      stateDeltasByInstance: stateDeltasByInstanceResult.rows,
      dailyAggregates: dailyAggregatesResult.rows,
      stateSnapshots: stateSnapshotsResult.rows,
      usageAggregates: usageAggregatesResult.rows,
      valueObjectCategoryLinks: categoryLinksResult.rows,
      categoryIds,
      categorySlugsFromLinks,
    },
    samples: {
      activityEventValueObjectLinks: firstRows(
        activityEventValueObjectLinksResult.rows
      ),
      activityEventValueObjectInstanceLinks: firstRows(
        activityEventValueObjectInstanceLinksResult.rows
      ),
      valueObjects: firstRows(valueObjectsResult.rows),
      valueObjectInstances: firstRows(valueObjectInstancesResult.rows),
      stateDeltasByEvent: firstRows(stateDeltasByEventResult.rows),
      stateDeltasByInstance: firstRows(stateDeltasByInstanceResult.rows),
      dailyAggregates: firstRows(dailyAggregatesResult.rows),
      stateSnapshots: firstRows(stateSnapshotsResult.rows),
      usageAggregates: firstRows(usageAggregatesResult.rows),
      valueObjectCategoryLinks: firstRows(categoryLinksResult.rows),
    },
  });
}