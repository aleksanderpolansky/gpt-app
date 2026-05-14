import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type GenericRow = Record<string, unknown>;

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value.length > 0)
    )
  );
}

function parseList(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseLimit(value: string | null) {
  if (!value) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
}

function getId(row: GenericRow) {
  return asString(row.id);
}

function getStringField(row: GenericRow, field: string) {
  return asString(row[field]);
}

function mergeRows(existing: GenericRow[], incoming: GenericRow[]) {
  const byId = new Map<string, GenericRow>();

  for (const row of existing) {
    const id = getId(row);

    if (id) {
      byId.set(id, row);
    }
  }

  for (const row of incoming) {
    const id = getId(row);

    if (id) {
      byId.set(id, row);
    }
  }

  return Array.from(byId.values());
}

function addIdsFromRows(params: {
  rows: GenericRow[];
  eventIds: Set<string>;
  rawSignalIds: Set<string>;
  correctionIds: Set<string>;
  processingRunIds: Set<string>;
}) {
  const { rows, eventIds, rawSignalIds, correctionIds, processingRunIds } =
    params;

  for (const row of rows) {
    const id = getId(row);
    const outputEventId = getStringField(row, "output_event_id");
    const eventId =
      getStringField(row, "event_id") ?? getStringField(row, "activity_event_id");
    const rawSignalId = getStringField(row, "raw_signal_id");
    const correctionId =
      getStringField(row, "activity_correction_id") ??
      getStringField(row, "correction_id");
    const processingRunId = getStringField(row, "processing_run_id");

    if (id && row.processing_status !== undefined && row.raw_payload !== undefined) {
      rawSignalIds.add(id);
    }

    if (id && row.correction_type !== undefined && row.changed_fields !== undefined) {
      correctionIds.add(id);
    }

    if (outputEventId) {
      eventIds.add(outputEventId);
    }

    if (eventId) {
      eventIds.add(eventId);
    }

    if (rawSignalId) {
      rawSignalIds.add(rawSignalId);
    }

    if (correctionId) {
      correctionIds.add(correctionId);
    }

    if (processingRunId) {
      processingRunIds.add(processingRunId);
    }
  }
}

async function fetchUserOwnedByIds(params: {
  table: string;
  userId: string;
  column: string;
  values: string[];
  limit: number;
  orderBy?: string;
  ascending?: boolean;
}) {
  const { table, userId, column, values, limit, orderBy, ascending } = params;

  if (values.length === 0) {
    return [];
  }

  let query = supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .in(column, values)
    .limit(limit);

  if (orderBy) {
    query = query.order(orderBy, { ascending: ascending ?? false });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return (data as GenericRow[] | null) ?? [];
}

async function fetchByEventIds(params: {
  table: string;
  column?: string;
  eventIds: string[];
  limit: number;
  orderBy?: string;
  ascending?: boolean;
}) {
  const { table, column, eventIds, limit, orderBy, ascending } = params;

  if (eventIds.length === 0) {
    return [];
  }

  let query = supabase
    .from(table)
    .select("*")
    .in(column ?? "event_id", eventIds)
    .limit(limit);

  if (orderBy) {
    query = query.order(orderBy, { ascending: ascending ?? false });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return (data as GenericRow[] | null) ?? [];
}

async function fetchTrace(params: {
  userId: string;
  eventIds: Set<string>;
  rawSignalIds: Set<string>;
  correctionIds: Set<string>;
  processingRunIds: Set<string>;
  limit: number;
}) {
  const { userId, eventIds, rawSignalIds, correctionIds, processingRunIds, limit } =
    params;

  let activityEvents: GenericRow[] = [];
  let rawActivitySignals: GenericRow[] = [];
  let activityProcessingLogs: GenericRow[] = [];
  let activityCorrections: GenericRow[] = [];
  let impactEvents: GenericRow[] = [];
  let eventLinks: GenericRow[] = [];

  activityEvents = mergeRows(
    activityEvents,
    await fetchUserOwnedByIds({
      table: "activity_events",
      userId,
      column: "id",
      values: Array.from(eventIds),
      limit,
      orderBy: "created_at",
      ascending: false,
    })
  );

  rawActivitySignals = mergeRows(
    rawActivitySignals,
    await fetchUserOwnedByIds({
      table: "raw_activity_signals",
      userId,
      column: "id",
      values: Array.from(rawSignalIds),
      limit,
      orderBy: "created_at",
      ascending: false,
    })
  );

  activityCorrections = mergeRows(
    activityCorrections,
    await fetchUserOwnedByIds({
      table: "activity_corrections",
      userId,
      column: "id",
      values: Array.from(correctionIds),
      limit,
      orderBy: "created_at",
      ascending: false,
    })
  );

  activityProcessingLogs = mergeRows(
    activityProcessingLogs,
    await fetchUserOwnedByIds({
      table: "activity_processing_logs",
      userId,
      column: "processing_run_id",
      values: Array.from(processingRunIds),
      limit,
      orderBy: "created_at",
      ascending: true,
    })
  );

  addIdsFromRows({
    rows: [
      ...activityEvents,
      ...rawActivitySignals,
      ...activityProcessingLogs,
      ...activityCorrections,
    ],
    eventIds,
    rawSignalIds,
    correctionIds,
    processingRunIds,
  });

  rawActivitySignals = mergeRows(
    rawActivitySignals,
    await fetchUserOwnedByIds({
      table: "raw_activity_signals",
      userId,
      column: "output_event_id",
      values: Array.from(eventIds),
      limit,
      orderBy: "created_at",
      ascending: false,
    })
  );

  activityCorrections = mergeRows(
    activityCorrections,
    await fetchUserOwnedByIds({
      table: "activity_corrections",
      userId,
      column: "event_id",
      values: Array.from(eventIds),
      limit,
      orderBy: "created_at",
      ascending: false,
    })
  );

  activityProcessingLogs = mergeRows(
    activityProcessingLogs,
    await fetchUserOwnedByIds({
      table: "activity_processing_logs",
      userId,
      column: "activity_event_id",
      values: Array.from(eventIds),
      limit,
      orderBy: "created_at",
      ascending: true,
    })
  );

  addIdsFromRows({
    rows: [
      ...activityEvents,
      ...rawActivitySignals,
      ...activityProcessingLogs,
      ...activityCorrections,
    ],
    eventIds,
    rawSignalIds,
    correctionIds,
    processingRunIds,
  });

  activityProcessingLogs = mergeRows(
    activityProcessingLogs,
    await fetchUserOwnedByIds({
      table: "activity_processing_logs",
      userId,
      column: "raw_signal_id",
      values: Array.from(rawSignalIds),
      limit,
      orderBy: "created_at",
      ascending: true,
    })
  );

  activityProcessingLogs = mergeRows(
    activityProcessingLogs,
    await fetchUserOwnedByIds({
      table: "activity_processing_logs",
      userId,
      column: "activity_correction_id",
      values: Array.from(correctionIds),
      limit,
      orderBy: "created_at",
      ascending: true,
    })
  );

  addIdsFromRows({
    rows: [
      ...activityEvents,
      ...rawActivitySignals,
      ...activityProcessingLogs,
      ...activityCorrections,
    ],
    eventIds,
    rawSignalIds,
    correctionIds,
    processingRunIds,
  });

  activityEvents = mergeRows(
    activityEvents,
    await fetchUserOwnedByIds({
      table: "activity_events",
      userId,
      column: "id",
      values: Array.from(eventIds),
      limit,
      orderBy: "created_at",
      ascending: false,
    })
  );

  impactEvents = mergeRows(
    impactEvents,
    await fetchByEventIds({
      table: "impact_events",
      eventIds: Array.from(eventIds),
      limit,
      orderBy: "created_at",
      ascending: true,
    })
  );

  eventLinks = mergeRows(
    eventLinks,
    await fetchByEventIds({
      table: "event_links",
      eventIds: Array.from(eventIds),
      limit,
      orderBy: "created_at",
      ascending: true,
    })
  );

  return {
    activityEvents,
    rawActivitySignals,
    activityProcessingLogs,
    activityCorrections,
    impactEvents,
    eventLinks,
  };
}

export async function GET(request: Request) {
  if (!ACTIVITY_RECORDING_ENABLED) {
    return NextResponse.json(
      {
        ok: false,
        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
      },
      { status: 503 }
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
        error: "User context not found",
      },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const limit = parseLimit(searchParams.get("limit"));

  const eventIds = new Set(
    unique([
      asString(searchParams.get("eventId")),
      ...parseList(searchParams.get("eventIds")),
    ])
  );

  const rawSignalIds = new Set(
    unique([
      asString(searchParams.get("rawSignalId")),
      ...parseList(searchParams.get("rawSignalIds")),
    ])
  );

  const correctionIds = new Set(
    unique([
      asString(searchParams.get("correctionId")),
      ...parseList(searchParams.get("correctionIds")),
    ])
  );

  const processingRunIds = new Set(
    unique([
      asString(searchParams.get("processingRunId")),
      ...parseList(searchParams.get("processingRunIds")),
    ])
  );

  const hasAnyFilter =
    eventIds.size > 0 ||
    rawSignalIds.size > 0 ||
    correctionIds.size > 0 ||
    processingRunIds.size > 0;

  if (!hasAnyFilter) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Provide at least one filter: eventId, rawSignalId, correctionId or processingRunId.",
        examples: [
          "/api/activity/debug-trace?eventId=<activity_event_id>",
          "/api/activity/debug-trace?rawSignalId=<raw_signal_id>",
          "/api/activity/debug-trace?processingRunId=<processing_run_id>",
          "/api/activity/debug-trace?correctionId=<activity_correction_id>",
        ],
      },
      { status: 400 }
    );
  }

  try {
    const trace = await fetchTrace({
      userId: appUser.id,
      eventIds,
      rawSignalIds,
      correctionIds,
      processingRunIds,
      limit,
    });

    return NextResponse.json({
      ok: true,
      endpoint: "/api/activity/debug-trace",
      filters: {
        eventIds: Array.from(eventIds),
        rawSignalIds: Array.from(rawSignalIds),
        correctionIds: Array.from(correctionIds),
        processingRunIds: Array.from(processingRunIds),
        limit,
      },
      summary: {
        activityEvents: trace.activityEvents.length,
        rawActivitySignals: trace.rawActivitySignals.length,
        activityProcessingLogs: trace.activityProcessingLogs.length,
        activityCorrections: trace.activityCorrections.length,
        impactEvents: trace.impactEvents.length,
        eventLinks: trace.eventLinks.length,
      },
      trace,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load activity debug trace.",
      },
      { status: 500 }
    );
  }
}
