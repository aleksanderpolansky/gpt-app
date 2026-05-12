import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DEFAULT_LIMIT,
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
  ACTIVITY_RECORDING_MAX_LIMIT,
} from "../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type ActivityEventRow = {
  id: string;
  user_id: string;
  performed_by_actor_id: string | null;
  acting_as_actor_id: string | null;
  acting_for_actor_id: string | null;
  activity_type_id: string | null;
  template_id: string | null;
  event_code: string | null;
  input_text: string | null;
  title: string | null;
  description: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | string | null;
  source: string;
  status: string;
  privacy_scope: string;
  processing_status: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  activity_template_id: string | null;
};

type DailyAggregateRow = {
  id: string;
  user_id: string;
  aggregate_date: string;
  aggregate_type: string;
  aggregate_key: string;
  metric_key: string;
  metric_value_numeric: number | string;
  metric_value_text: string | null;
  metric_unit: string | null;
  source: string;
  last_event_id: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type CurrentSnapshotRow = {
  id: string;
  user_id: string;
  snapshot_entity_type: string;
  snapshot_entity_key: string;
  metric_key: string;
  metric_value_numeric: number | string | null;
  metric_value_text: string | null;
  metric_unit: string | null;
  last_event_id: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type CountMap = Record<string, number>;

type NumericTotalMap = Record<
  string,
  {
    aggregateType: string;
    totalNumericValue: number;
    itemsCount: number;
  }
>;

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    const parsed = Number.parseFloat(normalized);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function parseLimit(searchParams: URLSearchParams): number {
  const rawLimit = searchParams.get("limit");

  if (!rawLimit) {
    return ACTIVITY_RECORDING_DEFAULT_LIMIT;
  }

  const parsedLimit = Number.parseInt(rawLimit, 10);

  if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
    return ACTIVITY_RECORDING_DEFAULT_LIMIT;
  }

  return Math.min(parsedLimit, ACTIVITY_RECORDING_MAX_LIMIT);
}

function resolveDate(searchParams: URLSearchParams): string {
  const rawDate = searchParams.get("date");

  if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return rawDate;
  }

  return new Date().toISOString().slice(0, 10);
}

function buildUtcDayRange(date: string) {
  const from = `${date}T00:00:00.000Z`;
  const toDate = new Date(from);
  toDate.setUTCDate(toDate.getUTCDate() + 1);

  return {
    from,
    to: toDate.toISOString(),
  };
}

function isInsideRange(value: string | null, from: string, to: string) {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();
  const fromTimestamp = new Date(from).getTime();
  const toTimestamp = new Date(to).getTime();

  if (
    Number.isNaN(timestamp) ||
    Number.isNaN(fromTimestamp) ||
    Number.isNaN(toTimestamp)
  ) {
    return false;
  }

  return timestamp >= fromTimestamp && timestamp < toTimestamp;
}

function getEventDayAnchor(event: ActivityEventRow) {
  return event.started_at ?? event.created_at;
}

function countBy<T>(items: T[], getKey: (item: T) => string | null): CountMap {
  const result: CountMap = {};

  for (const item of items) {
    const key = getKey(item) ?? "unknown";
    result[key] = (result[key] ?? 0) + 1;
  }

  return result;
}

function normalizeEvent(event: ActivityEventRow) {
  return {
    id: event.id,
    title: event.title,
    status: event.status,
    source: event.source,
    privacyScope: event.privacy_scope,
    processingStatus: event.processing_status,
    startedAt: event.started_at,
    endedAt: event.ended_at,
    durationMinutes: asNumber(event.duration_minutes),
    comment: event.description ?? event.input_text,
    activityTypeId: event.activity_type_id,
    activityTemplateId: event.activity_template_id,
    legacyTemplateId: event.template_id,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
}

function normalizeDailyAggregate(row: DailyAggregateRow) {
  return {
    id: row.id,
    aggregateDate: row.aggregate_date,
    aggregateType: row.aggregate_type,
    aggregateKey: row.aggregate_key,
    metricKey: row.metric_key,
    metricValueNumeric: asNumber(row.metric_value_numeric) ?? 0,
    metricValueText: row.metric_value_text,
    metricUnit: row.metric_unit,
    source: row.source,
    lastEventId: row.last_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeCurrentSnapshot(row: CurrentSnapshotRow) {
  return {
    id: row.id,
    snapshotEntityType: row.snapshot_entity_type,
    snapshotEntityKey: row.snapshot_entity_key,
    metricKey: row.metric_key,
    metricValueNumeric: asNumber(row.metric_value_numeric),
    metricValueText: row.metric_value_text,
    metricUnit: row.metric_unit,
    lastEventId: row.last_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function summarizeDailyAggregates(rows: DailyAggregateRow[]) {
  const totalsByAggregateType: NumericTotalMap = {};

  for (const row of rows) {
    const value = asNumber(row.metric_value_numeric) ?? 0;
    const existing = totalsByAggregateType[row.aggregate_type] ?? {
      aggregateType: row.aggregate_type,
      totalNumericValue: 0,
      itemsCount: 0,
    };

    existing.totalNumericValue += value;
    existing.itemsCount += 1;

    totalsByAggregateType[row.aggregate_type] = existing;
  }

  return Object.values(totalsByAggregateType).sort((a, b) =>
    a.aggregateType.localeCompare(b.aggregateType)
  );
}

function summarizeEvents(events: ActivityEventRow[]) {
  const totalDurationMinutes = events.reduce((sum, event) => {
    return sum + (asNumber(event.duration_minutes) ?? 0);
  }, 0);

  const completedEvents = events.filter((event) => event.status === "completed");
  const openEvents = events.filter(
    (event) =>
      event.status === "started" ||
      event.status === "paused" ||
      event.processing_status === "pending"
  );

  return {
    totalEvents: events.length,
    completedEvents: completedEvents.length,
    openEvents: openEvents.length,
    totalDurationMinutes,
    byStatus: countBy(events, (event) => event.status),
    byProcessingStatus: countBy(events, (event) => event.processing_status),
    bySource: countBy(events, (event) => event.source),
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
  const date = resolveDate(url.searchParams);
  const limit = parseLimit(url.searchParams);
  const dayRange = buildUtcDayRange(date);

  const { data: rawEvents, error: eventsError } = await supabase
    .from("activity_events")
    .select("*")
    .eq("user_id", appUser.id)
    .or(`started_at.gte.${dayRange.from},created_at.gte.${dayRange.from}`)
    .order("created_at", { ascending: false })
    .limit(500);

  if (eventsError) {
    return NextResponse.json(
      {
        ok: false,
        error: eventsError.message,
      },
      { status: 500 }
    );
  }

  const allCandidateEvents = (rawEvents ?? []) as ActivityEventRow[];

  const dayEvents = allCandidateEvents
    .filter((event) =>
      isInsideRange(getEventDayAnchor(event), dayRange.from, dayRange.to)
    )
    .sort((a, b) => {
      const bTime = new Date(b.created_at).getTime();
      const aTime = new Date(a.created_at).getTime();

      return bTime - aTime;
    });

  const { data: dailyAggregatesData, error: dailyAggregatesError } =
    await supabase
      .from("daily_aggregates")
      .select("*")
      .eq("user_id", appUser.id)
      .eq("aggregate_date", date)
      .order("aggregate_type", { ascending: true })
      .order("aggregate_key", { ascending: true })
      .order("metric_key", { ascending: true });

  if (dailyAggregatesError) {
    return NextResponse.json(
      {
        ok: false,
        error: dailyAggregatesError.message,
      },
      { status: 500 }
    );
  }

  const { data: currentSnapshotsData, error: currentSnapshotsError } =
    await supabase
      .from("current_snapshots")
      .select("*")
      .eq("user_id", appUser.id)
      .order("updated_at", { ascending: false })
      .limit(100);

  if (currentSnapshotsError) {
    return NextResponse.json(
      {
        ok: false,
        error: currentSnapshotsError.message,
      },
      { status: 500 }
    );
  }

  const dailyAggregates = (dailyAggregatesData ?? []) as DailyAggregateRow[];
  const currentSnapshots = (currentSnapshotsData ?? []) as CurrentSnapshotRow[];

  const latestEvents = dayEvents.slice(0, limit);
  const openEvents = dayEvents.filter(
    (event) =>
      event.status === "started" ||
      event.status === "paused" ||
      event.processing_status === "pending"
  );

  return NextResponse.json({
    ok: true,
    date,
    timezoneMode: "UTC",
    dayRange,
    filters: {
      limit,
    },
    summary: {
      events: summarizeEvents(dayEvents),
      dailyAggregates: {
        totalRows: dailyAggregates.length,
        totalsByAggregateType: summarizeDailyAggregates(dailyAggregates),
      },
      currentSnapshots: {
        totalRows: currentSnapshots.length,
      },
    },
    latestEvents: latestEvents.map(normalizeEvent),
    openEvents: openEvents.map(normalizeEvent),
    dailyAggregates: dailyAggregates.map(normalizeDailyAggregate),
    currentSnapshots: currentSnapshots.map(normalizeCurrentSnapshot),
    note:
      "This day summary currently uses UTC dates. Local timezone support can be added later for user-facing daily reports.",
  });
}
