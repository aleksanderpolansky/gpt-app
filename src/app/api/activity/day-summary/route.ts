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

const DEFAULT_TIMEZONE = "Europe/Warsaw";

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

type DayRange = {
  from: string;
  to: string;
  timezone: string;
  localDate: string;
};

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

function isValidDateString(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function resolveTimezone(searchParams: URLSearchParams): string {
  const rawTimezone = searchParams.get("timezone");
  const timezone = rawTimezone?.trim() || DEFAULT_TIMEZONE;

  if (!isValidTimeZone(timezone)) {
    return DEFAULT_TIMEZONE;
  }

  return timezone;
}

function getDatePartsInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return new Date().toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

function resolveDate(searchParams: URLSearchParams, timezone: string): string {
  const rawDate = searchParams.get("date");

  if (isValidDateString(rawDate)) {
    return rawDate;
  }

  return getDatePartsInTimezone(new Date(), timezone);
}

function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return asUtc - date.getTime();
}

function localDateTimeToUtcIso(
  date: string,
  timezone: string,
  hour: number,
  minute: number,
  second: number,
  millisecond: number
): string {
  const [year, month, day] = date.split("-").map((part) => Number(part));
  const utcGuess = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond
  );

  const firstOffset = getTimezoneOffsetMs(new Date(utcGuess), timezone);
  const firstUtc = utcGuess - firstOffset;
  const secondOffset = getTimezoneOffsetMs(new Date(firstUtc), timezone);
  const finalUtc = utcGuess - secondOffset;

  return new Date(finalUtc).toISOString();
}

function addDaysToDateString(date: string, days: number): string {
  const [year, month, day] = date.split("-").map((part) => Number(part));
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);

  return utcDate.toISOString().slice(0, 10);
}

function buildLocalDayRange(date: string, timezone: string): DayRange {
  const nextDate = addDaysToDateString(date, 1);

  return {
    from: localDateTimeToUtcIso(date, timezone, 0, 0, 0, 0),
    to: localDateTimeToUtcIso(nextDate, timezone, 0, 0, 0, 0),
    timezone,
    localDate: date,
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
  const timezone = resolveTimezone(url.searchParams);
  const date = resolveDate(url.searchParams, timezone);
  const limit = parseLimit(url.searchParams);
  const dayRange = buildLocalDayRange(date, timezone);

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
    timezone,
    timezoneMode: "local",
    dayRange,
    filters: {
      limit,
      timezone,
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
      "This day summary uses the requested local timezone for event day boundaries. daily_aggregates are still matched by aggregate_date and should be aligned with the same timezone in the impact processor in a later step.",
  });
}