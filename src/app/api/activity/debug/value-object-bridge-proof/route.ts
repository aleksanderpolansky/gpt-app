import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextResponse } from "next/server";

import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

const ENDPOINT = "/api/activity/debug/value-object-bridge-proof";
const P4_STEP = "P4.10.0-C8-P3-B7-C2-D-B3";

type Row = Record<string, unknown>;

type NormalizedError = {
  message: string;
  details: string | null;
  hint: string | null;
  code: string | null;
};

type TableProof = {
  key: string;
  table: string;
  ok: boolean;
  count: number;
  rows: Row[];
  column: string | null;
  valuesCount: number;
  skipped: boolean;
  skipReason: string | null;
  triedColumns: string[];
  error: NormalizedError | null;
};

type CandidateGroup = {
  values: string[];
  columns: string[];
};

const supabaseAny = supabase as unknown as {
  from: (table: string) => unknown;
};

const EXPECTED_FREE_TEXT_CATEGORY_SLUGS = [
  "walking",
  "work",
  "commute-to-work",
  "walking-to-work",
  "duration-minutes",
];

function isRecord(value: unknown): value is Row {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeError(error: unknown): NormalizedError | null {
  if (!isRecord(error)) {
    return null;
  }

  const message =
    typeof error.message === "string" ? error.message : "Unknown Supabase error";

  return {
    message,
    details: typeof error.details === "string" ? error.details : null,
    hint: typeof error.hint === "string" ? error.hint : null,
    code: typeof error.code === "string" ? error.code : null,
  };
}

function asRows(data: unknown): Row[] {
  if (Array.isArray(data)) {
    return data.filter(isRecord);
  }

  if (isRecord(data)) {
    return [data];
  }

  return [];
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  );
}

function getString(row: Row, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function getNestedString(row: Row, objectKeys: string[], valueKeys: string[]) {
  for (const objectKey of objectKeys) {
    const nested = row[objectKey];

    if (!isRecord(nested)) {
      continue;
    }

    const value = getString(nested, valueKeys);

    if (value) {
      return value;
    }
  }

  return null;
}

function collectIds(rows: Row[], keys: string[]) {
  return uniqueStrings(rows.map((row) => getString(row, keys)));
}

function collectCategorySlugs(rows: Row[]) {
  return uniqueStrings(
    rows.map((row) => {
      return (
        getString(row, [
          "candidate_slug",
          "candidateSlug",
          "category_slug",
          "categorySlug",
          "semantic_slug",
          "semanticSlug",
          "slug",
          "category_key",
          "categoryKey",
          "key",
          "name",
          "label",
        ]) ??
        getNestedString(
          row,
          ["metadata_json", "metadata", "details_json", "details"],
          [
            "candidate_slug",
            "candidateSlug",
            "category_slug",
            "categorySlug",
            "semantic_slug",
            "semanticSlug",
            "slug",
            "category_key",
            "categoryKey",
            "key",
            "name",
            "label",
          ]
        )
      );
    })
  );
}

async function executeQuery(
  key: string,
  table: string,
  column: string | null,
  valuesCount: number,
  buildQuery: (baseQuery: any) => PromiseLike<unknown>
): Promise<TableProof> {
  try {
    const baseQuery = (supabaseAny.from(table) as any).select("*");
    const result = (await buildQuery(baseQuery)) as {
      data?: unknown;
      error?: unknown;
    };

    const error = normalizeError(result.error);

    if (error) {
      return {
        key,
        table,
        ok: false,
        count: 0,
        rows: [],
        column,
        valuesCount,
        skipped: false,
        skipReason: null,
        triedColumns: column ? [column] : [],
        error,
      };
    }

    const rows = asRows(result.data);

    return {
      key,
      table,
      ok: true,
      count: rows.length,
      rows,
      column,
      valuesCount,
      skipped: false,
      skipReason: null,
      triedColumns: column ? [column] : [],
      error: null,
    };
  } catch (error) {
    return {
      key,
      table,
      ok: false,
      count: 0,
      rows: [],
      column,
      valuesCount,
      skipped: false,
      skipReason: null,
      triedColumns: column ? [column] : [],
      error: normalizeError(error) ?? {
        message: error instanceof Error ? error.message : "Unknown thrown error",
        details: null,
        hint: null,
        code: null,
      },
    };
  }
}

async function selectById(
  key: string,
  table: string,
  id: string,
  appUserId: string | null = null
) {
  return executeQuery(key, table, "id", 1, (query) => {
    let nextQuery = query.eq("id", id);

    if (appUserId) {
      nextQuery = nextQuery.eq("user_id", appUserId);
    }

    return nextQuery.limit(1);
  });
}

async function selectEqWithCandidateColumns(
  key: string,
  table: string,
  columns: string[],
  value: string
): Promise<TableProof> {
  let firstOkZero: TableProof | null = null;
  let lastResult: TableProof | null = null;
  const triedColumns: string[] = [];

  for (const column of columns) {
    triedColumns.push(column);

    const result = await executeQuery(key, table, column, 1, (query) =>
      query.eq(column, value).limit(500)
    );

    result.triedColumns = [...triedColumns];
    lastResult = result;

    if (result.ok && result.count > 0) {
      return result;
    }

    if (result.ok && result.count === 0 && !firstOkZero) {
      firstOkZero = result;
    }

    if (!result.ok && result.error?.code !== "42703") {
      return result;
    }
  }

  if (firstOkZero) {
    return firstOkZero;
  }

  if (lastResult) {
    return lastResult;
  }

  return {
    key,
    table,
    ok: true,
    count: 0,
    rows: [],
    column: null,
    valuesCount: 0,
    skipped: true,
    skipReason: "No candidate columns were available or no query was attempted.",
    triedColumns,
    error: null,
  };
}

async function selectInWithCandidateGroups(
  key: string,
  table: string,
  groups: CandidateGroup[]
): Promise<TableProof> {
  let firstOkZero: TableProof | null = null;
  let lastResult: TableProof | null = null;
  const triedColumns: string[] = [];

  for (const group of groups) {
    const values = uniqueStrings(group.values);

    if (values.length === 0) {
      continue;
    }

    for (const column of group.columns) {
      triedColumns.push(column);

      const result = await executeQuery(key, table, column, values.length, (query) =>
        query.in(column, values).limit(1000)
      );

      result.triedColumns = [...triedColumns];
      lastResult = result;

      if (result.ok && result.count > 0) {
        return result;
      }

      if (result.ok && result.count === 0 && !firstOkZero) {
        firstOkZero = result;
      }

      if (!result.ok && result.error?.code !== "42703") {
        return result;
      }
    }
  }

  if (firstOkZero) {
    return firstOkZero;
  }

  if (lastResult) {
    return lastResult;
  }

  return {
    key,
    table,
    ok: true,
    count: 0,
    rows: [],
    column: null,
    valuesCount: 0,
    skipped: true,
    skipReason: "No candidate values available.",
    triedColumns: [],
    error: null,
  };
}

function limitRows(rows: Row[], limit = 5) {
  return rows.slice(0, limit);
}

function tableSummary(result: TableProof) {
  return {
    key: result.key,
    table: result.table,
    ok: result.ok,
    count: result.count,
    column: result.column,
    valuesCount: result.valuesCount,
    skipped: result.skipped,
    skipReason: result.skipReason,
    triedColumns: result.triedColumns,
    error: result.error,
  };
}

export async function GET(request: Request) {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  if (!ACTIVITY_RECORDING_ENABLED) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId")?.trim();

  if (!eventId) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        p4Step: P4_STEP,
        error: "Missing eventId query parameter.",
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
        p4Step: P4_STEP,
        error: "User context not found.",
      },
      { status: 500 }
    );
  }

  const tableResults: TableProof[] = [];

  const eventResult = await selectById("event", "activity_events", eventId, appUser.id);
  tableResults.push(eventResult);

  const event = eventResult.rows[0] ?? null;

  const activityEventValueObjectLinksResult =
    await selectEqWithCandidateColumns(
      "activityEventValueObjectLinks",
      "activity_event_value_object_links",
      ["event_id", "source_event_id", "activity_id", "activity_record_id"],
      eventId
    );
  tableResults.push(activityEventValueObjectLinksResult);

  const activityEventValueObjectInstanceLinksResult =
    await selectEqWithCandidateColumns(
      "activityEventValueObjectInstanceLinks",
      "activity_event_value_object_instance_links",
      ["event_id", "source_event_id", "activity_id", "activity_record_id"],
      eventId
    );
  tableResults.push(activityEventValueObjectInstanceLinksResult);

  const initialValueObjectIds = collectIds(
    [
      ...activityEventValueObjectLinksResult.rows,
      ...activityEventValueObjectInstanceLinksResult.rows,
    ],
    [
      "value_object_id",
      "valueObjectId",
      "target_value_object_id",
      "targetValueObjectId",
      "object_id",
      "objectId",
    ]
  );

  const initialValueObjectInstanceIds = collectIds(
    [
      ...activityEventValueObjectLinksResult.rows,
      ...activityEventValueObjectInstanceLinksResult.rows,
    ],
    [
      "value_object_instance_id",
      "valueObjectInstanceId",
      "instance_id",
      "instanceId",
      "target_value_object_instance_id",
      "targetValueObjectInstanceId",
    ]
  );

  const valueObjectInstancesResult = await selectInWithCandidateGroups(
    "valueObjectInstances",
    "value_object_instances",
    [
      {
        values: initialValueObjectInstanceIds,
        columns: ["id"],
      },
      {
        values: initialValueObjectIds,
        columns: ["value_object_id", "object_id"],
      },
    ]
  );
  tableResults.push(valueObjectInstancesResult);

  const valueObjectIdsFromInstances = collectIds(valueObjectInstancesResult.rows, [
    "value_object_id",
    "valueObjectId",
    "object_id",
    "objectId",
  ]);

  const valueObjectIds = uniqueStrings([
    ...initialValueObjectIds,
    ...valueObjectIdsFromInstances,
  ]);

  const valueObjectInstanceIds = uniqueStrings([
    ...initialValueObjectInstanceIds,
    ...collectIds(valueObjectInstancesResult.rows, ["id"]),
  ]);

  const valueObjectsResult = await selectInWithCandidateGroups(
    "valueObjects",
    "value_objects",
    [
      {
        values: valueObjectIds,
        columns: ["id"],
      },
    ]
  );
  tableResults.push(valueObjectsResult);

  const stateDeltasResult = await selectInWithCandidateGroups(
    "stateDeltas",
    "value_object_state_deltas",
    [
      {
        values: valueObjectInstanceIds,
        columns: ["value_object_instance_id", "instance_id"],
      },
      {
        values: valueObjectIds,
        columns: ["value_object_id", "object_id"],
      },
    ]
  );
  tableResults.push(stateDeltasResult);

  const dailyAggregatesResult = await selectInWithCandidateGroups(
    "dailyAggregates",
    "value_object_daily_aggregates",
    [
      {
        values: valueObjectInstanceIds,
        columns: ["value_object_instance_id", "instance_id"],
      },
      {
        values: valueObjectIds,
        columns: ["value_object_id", "object_id"],
      },
    ]
  );
  tableResults.push(dailyAggregatesResult);

  const stateSnapshotsResult = await selectInWithCandidateGroups(
    "stateSnapshots",
    "value_object_state_snapshots",
    [
      {
        values: valueObjectInstanceIds,
        columns: ["value_object_instance_id", "instance_id"],
      },
      {
        values: valueObjectIds,
        columns: ["value_object_id", "object_id"],
      },
    ]
  );
  tableResults.push(stateSnapshotsResult);

  const usageAggregatesResult = await selectInWithCandidateGroups(
    "usageAggregates",
    "value_object_usage_aggregates",
    [
      {
        values: valueObjectInstanceIds,
        columns: ["value_object_instance_id", "instance_id"],
      },
      {
        values: valueObjectIds,
        columns: ["value_object_id", "object_id"],
      },
    ]
  );
  tableResults.push(usageAggregatesResult);

  const valueObjectCategoryLinksResult = await selectInWithCandidateGroups(
    "valueObjectCategoryLinks",
    "value_object_category_links",
    [
      {
        values: valueObjectIds,
        columns: ["value_object_id", "object_id"],
      },
      {
        values: valueObjectInstanceIds,
        columns: ["value_object_instance_id", "instance_id"],
      },
    ]
  );
  tableResults.push(valueObjectCategoryLinksResult);

  const categoryIds = collectIds(valueObjectCategoryLinksResult.rows, [
    "category_id",
    "categoryId",
    "linked_category_id",
    "linkedCategoryId",
  ]);

  const categorySlugsFromLinks = collectCategorySlugs(
    valueObjectCategoryLinksResult.rows
  );

  const categoryReferenceResult =
    categoryIds.length > 0 && categorySlugsFromLinks.length === 0
      ? await selectInWithCandidateGroups(
          "categoryReferences",
          "contextual_category_events",
          [
            {
              values: categoryIds,
              columns: ["id", "category_id"],
            },
          ]
        )
      : {
          key: "categoryReferences",
          table: "contextual_category_events",
          ok: true,
          count: 0,
          rows: [],
          column: null,
          valuesCount: categoryIds.length,
          skipped: true,
          skipReason:
            categoryIds.length === 0
              ? "No category ids available."
              : "Category slugs already available from value_object_category_links.",
          triedColumns: [],
          error: null,
        };

  tableResults.push(categoryReferenceResult);

  const categorySlugsFromReferences = collectCategorySlugs(
    categoryReferenceResult.rows
  );

  const categorySlugs = uniqueStrings([
    ...categorySlugsFromLinks,
    ...categorySlugsFromReferences,
  ]);

  const errors = tableResults
    .filter((result) => !result.ok)
    .map((result) => ({
      key: result.key,
      table: result.table,
      column: result.column,
      triedColumns: result.triedColumns,
      error: result.error,
    }));

  const expectedCategorySlugsFound = EXPECTED_FREE_TEXT_CATEGORY_SLUGS.filter(
    (slug) => categorySlugs.includes(slug)
  );

  const missingExpectedCategorySlugs = EXPECTED_FREE_TEXT_CATEGORY_SLUGS.filter(
    (slug) => !categorySlugs.includes(slug)
  );

  const missingArtifacts = {
    event: !event,
    activityEventValueObjectLinks:
      activityEventValueObjectLinksResult.rows.length === 0,
    activityEventValueObjectInstanceLinks:
      activityEventValueObjectInstanceLinksResult.rows.length === 0,
    valueObjects: valueObjectsResult.rows.length === 0,
    valueObjectInstances: valueObjectInstancesResult.rows.length === 0,
    stateDeltas: stateDeltasResult.rows.length === 0,
    dailyAggregates: dailyAggregatesResult.rows.length === 0,
    stateSnapshots: stateSnapshotsResult.rows.length === 0,
    usageAggregates: usageAggregatesResult.rows.length === 0,
    valueObjectCategoryLinks: valueObjectCategoryLinksResult.rows.length === 0,
    categorySlugs: categorySlugs.length === 0,
    expectedFreeTextCategorySlugs: missingExpectedCategorySlugs.length > 0,
  };

  const criticalPass =
    Boolean(event) &&
    event?.status === "completed" &&
    event?.processing_status === "processed" &&
    activityEventValueObjectLinksResult.rows.length > 0 &&
    activityEventValueObjectInstanceLinksResult.rows.length > 0 &&
    valueObjectsResult.rows.length > 0 &&
    valueObjectInstancesResult.rows.length > 0 &&
    valueObjectCategoryLinksResult.rows.length > 0 &&
    errors.length === 0;

  const semanticPass =
    expectedCategorySlugsFound.length === EXPECTED_FREE_TEXT_CATEGORY_SLUGS.length;

  const ok = criticalPass && semanticPass;

  return NextResponse.json({
    ok,
    endpoint: ENDPOINT,
    p4Step: P4_STEP,
    mode: "read_only",
    eventId,
    criticalPass,
    semanticPass,
    proofSummary: {
      eventId,
      eventFound: Boolean(event),
      eventStatus: typeof event?.status === "string" ? event.status : null,
      eventProcessingStatus:
        typeof event?.processing_status === "string"
          ? event.processing_status
          : null,
      valueObjectIds,
      valueObjectInstanceIds,
      categoryIds,
      categorySlugsFromLinks,
      categorySlugsFromReferences,
      categorySlugs,
      expectedCategorySlugs: EXPECTED_FREE_TEXT_CATEGORY_SLUGS,
      expectedCategorySlugsFound,
      missingExpectedCategorySlugs,
      counts: {
        activityEventValueObjectLinks:
          activityEventValueObjectLinksResult.rows.length,
        activityEventValueObjectInstanceLinks:
          activityEventValueObjectInstanceLinksResult.rows.length,
        valueObjects: valueObjectsResult.rows.length,
        valueObjectInstances: valueObjectInstancesResult.rows.length,
        stateDeltas: stateDeltasResult.rows.length,
        dailyAggregates: dailyAggregatesResult.rows.length,
        stateSnapshots: stateSnapshotsResult.rows.length,
        usageAggregates: usageAggregatesResult.rows.length,
        valueObjectCategoryLinks: valueObjectCategoryLinksResult.rows.length,
        categorySlugs: categorySlugs.length,
        errors: errors.length,
      },
    },
    missingArtifacts,
    errors,
    tables: tableResults.map(tableSummary),
    proof: {
      event,
      activityEventValueObjectLinks: activityEventValueObjectLinksResult.rows,
      activityEventValueObjectInstanceLinks:
        activityEventValueObjectInstanceLinksResult.rows,
      valueObjects: valueObjectsResult.rows,
      valueObjectInstances: valueObjectInstancesResult.rows,
      stateDeltas: stateDeltasResult.rows,
      dailyAggregates: dailyAggregatesResult.rows,
      stateSnapshots: stateSnapshotsResult.rows,
      usageAggregates: usageAggregatesResult.rows,
      valueObjectCategoryLinks: valueObjectCategoryLinksResult.rows,
      categoryReferences: categoryReferenceResult.rows,
    },
    samples: {
      activityEventValueObjectLinks: limitRows(
        activityEventValueObjectLinksResult.rows
      ),
      activityEventValueObjectInstanceLinks: limitRows(
        activityEventValueObjectInstanceLinksResult.rows
      ),
      valueObjects: limitRows(valueObjectsResult.rows),
      valueObjectInstances: limitRows(valueObjectInstancesResult.rows),
      stateDeltas: limitRows(stateDeltasResult.rows),
      dailyAggregates: limitRows(dailyAggregatesResult.rows),
      stateSnapshots: limitRows(stateSnapshotsResult.rows),
      usageAggregates: limitRows(usageAggregatesResult.rows),
      valueObjectCategoryLinks: limitRows(valueObjectCategoryLinksResult.rows),
      categoryReferences: limitRows(categoryReferenceResult.rows),
    },
  });
}