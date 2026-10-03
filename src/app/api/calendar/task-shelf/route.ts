import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

type TaskViewKey =
  | "today"
  | "week"
  | "overdue"
  | "unscheduled"
  | "completed";

type RecurrenceInfo = {
  ruleId: string;
  frequencyCode: string;
  intervalCount: number;
  occurrenceOrdinal: number | null;
};

type ShelfItem = {
  kind: "planned" | "completed";
  id: string;
  plannedActivityEventId: string | null;
  actualActivityEventId: string | null;
  title: string;
  inputText: string | null;
  description: string | null;
  source: string | null;
  privacyScope: string | null;
  status: string | null;
  scheduleModeCode: string | null;
  scheduledDate: string | null;
  scheduleStartDate: string | null;
  scheduleEndDate: string | null;
  deadlineAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number | null;
  dueAt: string | null;
  enrichmentStatus: string | null;
  enrichmentUpdatedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  needsClarification: boolean;
  recurrence: RecurrenceInfo | null;
};

const ACTIVE_PLANNED_STATUSES = ["draft", "planned", "confirmed"] as const;
const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 100;
const DEFAULT_SCAN_LIMIT = 500;
const MAX_SCAN_LIMIT = 800;
const COMPLETED_HISTORY_LIMIT = 80;

function asRecords(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is JsonRecord =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function parseIntegerParam(
  searchParams: URLSearchParams,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const raw = searchParams.get(name);
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(maximum, Math.max(minimum, parsed));
}

function isDateKey(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function normalizeTimeZone(value: string | null) {
  const candidate = value?.trim() || "UTC";

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return "UTC";
  }
}

function dateKeyInTimeZone(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day
    ? `${year}-${month}-${day}`
    : value.toISOString().slice(0, 10);
}

function addDays(dateKey: string, delta: number) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function weekBounds(focusDate: string) {
  const date = new Date(`${focusDate}T12:00:00.000Z`);
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = addDays(focusDate, mondayOffset);

  return {
    start,
    end: addDays(start, 6),
  };
}

function titleForActivity(row: JsonRecord) {
  return (
    asString(row.title) ??
    asString(row.description) ??
    asString(row.input_text) ??
    "Untitled activity"
  );
}

function dueTimestamp(row: JsonRecord) {
  const mode = asString(row.schedule_mode_code);

  if (mode === "deadline") {
    const value = asString(row.deadline_at);
    if (!value) return null;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  if (mode === "exact") {
    const value = asString(row.started_at);
    if (!value) return null;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  const dateKey =
    mode === "date_only"
      ? asString(row.scheduled_date)
      : mode === "date_range"
        ? asString(row.schedule_end_date) ?? asString(row.schedule_start_date)
        : null;

  if (!isDateKey(dateKey)) return null;

  return Date.parse(`${dateKey}T23:59:59.999Z`);
}

function scheduleBounds(row: JsonRecord, timeZone: string) {
  const mode = asString(row.schedule_mode_code);

  if (mode === "date_only") {
    const date = asString(row.scheduled_date);
    return isDateKey(date) ? { start: date, end: date } : null;
  }

  if (mode === "date_range") {
    const start = asString(row.schedule_start_date);
    const end = asString(row.schedule_end_date) ?? start;

    return isDateKey(start) && isDateKey(end)
      ? { start, end }
      : null;
  }

  if (mode === "deadline") {
    const deadline = asString(row.deadline_at);
    if (!deadline) return null;

    const parsed = new Date(deadline);
    if (Number.isNaN(parsed.getTime())) return null;

    const date = dateKeyInTimeZone(parsed, timeZone);
    return { start: date, end: date };
  }

  if (mode === "exact") {
    const startedAt = asString(row.started_at);
    if (!startedAt) return null;

    const parsed = new Date(startedAt);
    if (Number.isNaN(parsed.getTime())) return null;

    const date = dateKeyInTimeZone(parsed, timeZone);
    return { start: date, end: date };
  }

  return null;
}

function toPlannedShelfItem(
  row: JsonRecord,
  latestRun: JsonRecord | null,
  recurrence: RecurrenceInfo | null,
): ShelfItem | null {
  const id = asString(row.id);
  if (!id) return null;

  const enrichmentStatus = latestRun
    ? asString(latestRun.status)
    : null;

  const due = dueTimestamp(row);

  return {
    kind: "planned",
    id,
    plannedActivityEventId: id,
    actualActivityEventId: null,
    title: titleForActivity(row),
    inputText: asString(row.input_text),
    description: asString(row.description),
    source: asString(row.source),
    privacyScope: asString(row.privacy_scope),
    status: asString(row.status),
    scheduleModeCode: asString(row.schedule_mode_code),
    scheduledDate: asString(row.scheduled_date),
    scheduleStartDate: asString(row.schedule_start_date),
    scheduleEndDate: asString(row.schedule_end_date),
    deadlineAt: asString(row.deadline_at),
    startedAt: asString(row.started_at),
    endedAt: asString(row.ended_at),
    durationMinutes: asNumber(row.duration_minutes),
    dueAt: due === null ? null : new Date(due).toISOString(),
    enrichmentStatus,
    enrichmentUpdatedAt: latestRun
      ? asString(latestRun.updated_at) ?? asString(latestRun.created_at)
      : null,
    updatedAt: asString(row.updated_at) ?? asString(row.created_at),
    completedAt: null,
    needsClarification: enrichmentStatus === "needs_clarification",
    recurrence,
  };
}

function toCompletedShelfItem(params: {
  actual: JsonRecord;
  planned: JsonRecord | null;
  recurrence: RecurrenceInfo | null;
}): ShelfItem | null {
  const actualId = asString(params.actual.id);
  const plannedId = asString(params.actual.fulfills_planned_activity_event_id);

  if (!actualId || !plannedId) return null;

  const planned = params.planned ?? {};

  return {
    kind: "completed",
    id: actualId,
    plannedActivityEventId: plannedId,
    actualActivityEventId: actualId,
    title:
      titleForActivity(params.actual) ||
      titleForActivity(planned),
    inputText:
      asString(params.actual.input_text) ??
      asString(planned.input_text),
    description:
      asString(params.actual.description) ??
      asString(planned.description),
    source: asString(params.actual.source),
    privacyScope:
      asString(params.actual.privacy_scope) ??
      asString(planned.privacy_scope),
    status: asString(params.actual.status),
    scheduleModeCode: asString(planned.schedule_mode_code),
    scheduledDate: asString(planned.scheduled_date),
    scheduleStartDate: asString(planned.schedule_start_date),
    scheduleEndDate: asString(planned.schedule_end_date),
    deadlineAt: asString(planned.deadline_at),
    startedAt: asString(planned.started_at),
    endedAt: asString(planned.ended_at),
    durationMinutes: asNumber(planned.duration_minutes),
    dueAt: dueTimestamp(planned) === null
      ? null
      : new Date(dueTimestamp(planned)!).toISOString(),
    enrichmentStatus: null,
    enrichmentUpdatedAt: null,
    updatedAt:
      asString(params.actual.updated_at) ??
      asString(params.actual.created_at),
    completedAt:
      asString(params.actual.ended_at) ??
      asString(params.actual.updated_at) ??
      asString(params.actual.created_at),
    needsClarification: false,
    recurrence: params.recurrence,
  };
}

function compareDueAscending(left: ShelfItem, right: ShelfItem) {
  const leftValue = left.dueAt ? Date.parse(left.dueAt) : Number.MAX_SAFE_INTEGER;
  const rightValue = right.dueAt ? Date.parse(right.dueAt) : Number.MAX_SAFE_INTEGER;
  return leftValue - rightValue;
}

function compareUpdatedDescending(left: ShelfItem, right: ShelfItem) {
  const leftValue = left.updatedAt ? Date.parse(left.updatedAt) : 0;
  const rightValue = right.updatedAt ? Date.parse(right.updatedAt) : 0;
  return rightValue - leftValue;
}

function compareCompletedDescending(left: ShelfItem, right: ShelfItem) {
  const leftValue = left.completedAt ? Date.parse(left.completedAt) : 0;
  const rightValue = right.completedAt ? Date.parse(right.completedAt) : 0;
  return rightValue - leftValue;
}

function buildGroup(key: TaskViewKey, items: ShelfItem[], limit: number) {
  return {
    key,
    totalCount: items.length,
    items: items.slice(0, limit),
  };
}

export async function GET(request: Request) {
  const { appUser, personActor, errorResponse } =
    await getActivityUserContext();

  if (errorResponse) return errorResponse;

  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "User context not found" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const limit = parseIntegerParam(
    url.searchParams,
    "limit",
    DEFAULT_LIMIT,
    5,
    MAX_LIMIT,
  );
  const scanLimit = parseIntegerParam(
    url.searchParams,
    "scanLimit",
    DEFAULT_SCAN_LIMIT,
    50,
    MAX_SCAN_LIMIT,
  );
  const timeZone = normalizeTimeZone(url.searchParams.get("timeZone"));
  const todayDate = dateKeyInTimeZone(new Date(), timeZone);
  const requestedFocusDate = url.searchParams.get("focusDate");
  const focusDate = isDateKey(requestedFocusDate)
    ? requestedFocusDate
    : todayDate;
  const week = weekBounds(focusDate);

  const plannedSelect = [
    "id",
    "title",
    "description",
    "input_text",
    "source",
    "privacy_scope",
    "status",
    "activity_role_code",
    "schedule_mode_code",
    "scheduled_date",
    "schedule_start_date",
    "schedule_end_date",
    "deadline_at",
    "started_at",
    "ended_at",
    "duration_minutes",
    "created_at",
    "updated_at",
  ].join(",");

  const { data: plannedRowsRaw, error: plannedError } =
    await supabase
      .from("activity_events")
      .select(plannedSelect)
      .eq("user_id", appUser.id)
      .eq("acting_as_actor_id", personActor.id)
      .eq("activity_role_code", "planned")
      .in("status", [...ACTIVE_PLANNED_STATUSES])
      .order("updated_at", { ascending: false })
      .limit(scanLimit);

  if (plannedError) {
    return NextResponse.json(
      { ok: false, error: plannedError.message },
      { status: 500 },
    );
  }

  const plannedRows = asRecords(plannedRowsRaw);
  const plannedById = new Map<string, JsonRecord>();
  const plannedIds: string[] = [];

  for (const row of plannedRows) {
    const id = asString(row.id);
    if (!id) continue;
    plannedById.set(id, row);
    plannedIds.push(id);
  }

  const recurrenceSourceIds = new Set<string>();

  if (plannedIds.length > 0) {
    const { data, error } = await supabase
      .from("activity_recurrence_rules")
      .select("source_activity_event_id,status_code")
      .in("source_activity_event_id", plannedIds)
      .in("status_code", ["active", "paused"]);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    for (const row of asRecords(data)) {
      const id = asString(row.source_activity_event_id);
      if (id) recurrenceSourceIds.add(id);
    }
  }

  const fulfilledPlannedIds = new Set<string>();

  if (plannedIds.length > 0) {
    const { data, error } = await supabase
      .from("activity_events")
      .select("fulfills_planned_activity_event_id")
      .eq("user_id", appUser.id)
      .eq("acting_as_actor_id", personActor.id)
      .eq("activity_role_code", "actual")
      .eq("status", "completed")
      .in("fulfills_planned_activity_event_id", plannedIds)
      .limit(MAX_SCAN_LIMIT);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    for (const row of asRecords(data)) {
      const plannedId = asString(row.fulfills_planned_activity_event_id);
      if (plannedId) fulfilledPlannedIds.add(plannedId);
    }
  }

  const recurrenceByActivityId = new Map<string, RecurrenceInfo>();

  if (plannedIds.length > 0) {
    const { data: occurrenceRowsRaw, error: occurrenceError } =
      await supabase
        .from("activity_recurrence_occurrences")
        .select(
          "materialized_activity_event_id,recurrence_rule_id,occurrence_ordinal,status_code",
        )
        .in("materialized_activity_event_id", plannedIds)
        .in("status_code", ["active", "rescheduled"]);

    if (occurrenceError) {
      return NextResponse.json(
        { ok: false, error: occurrenceError.message },
        { status: 500 },
      );
    }

    const occurrenceRows = asRecords(occurrenceRowsRaw);
    const ruleIds = [
      ...new Set(
        occurrenceRows
          .map((row) => asString(row.recurrence_rule_id))
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    const rulesById = new Map<string, JsonRecord>();

    if (ruleIds.length > 0) {
      const { data: ruleRowsRaw, error: rulesError } =
        await supabase
          .from("activity_recurrence_rules")
          .select("id,frequency_code,interval_count,status_code")
          .in("id", ruleIds);

      if (rulesError) {
        return NextResponse.json(
          { ok: false, error: rulesError.message },
          { status: 500 },
        );
      }

      for (const row of asRecords(ruleRowsRaw)) {
        const id = asString(row.id);
        if (id) rulesById.set(id, row);
      }
    }

    for (const occurrence of occurrenceRows) {
      const activityId = asString(
        occurrence.materialized_activity_event_id,
      );
      const ruleId = asString(occurrence.recurrence_rule_id);
      const rule = ruleId ? rulesById.get(ruleId) : null;

      if (!activityId || !ruleId || !rule) continue;

      recurrenceByActivityId.set(activityId, {
        ruleId,
        frequencyCode: asString(rule.frequency_code) ?? "unknown",
        intervalCount: Math.max(1, asNumber(rule.interval_count) ?? 1),
        occurrenceOrdinal: asNumber(occurrence.occurrence_ordinal),
      });
    }
  }

  const latestRunByActivityId = new Map<string, JsonRecord>();

  if (plannedIds.length > 0) {
    const { data: runRowsRaw, error: runError } =
      await supabase
        .from("activity_semantic_enrichment_runs_cux4")
        .select(
          "id,activity_event_id,status,attempt_no,created_at,updated_at",
        )
        .eq("owner_user_id", appUser.id)
        .eq("owner_actor_id", personActor.id)
        .in("activity_event_id", plannedIds)
        .order("updated_at", { ascending: false })
        .limit(MAX_SCAN_LIMIT);

    if (runError) {
      return NextResponse.json(
        { ok: false, error: runError.message },
        { status: 500 },
      );
    }

    for (const row of asRecords(runRowsRaw)) {
      const activityId = asString(row.activity_event_id);
      if (activityId && !latestRunByActivityId.has(activityId)) {
        latestRunByActivityId.set(activityId, row);
      }
    }
  }

  const today: ShelfItem[] = [];
  const weekItems: ShelfItem[] = [];
  const overdue: ShelfItem[] = [];
  const unscheduled: ShelfItem[] = [];

  for (const row of plannedRows) {
    const activityId = asString(row.id);
    if (!activityId) continue;

    if (
      recurrenceSourceIds.has(activityId) ||
      fulfilledPlannedIds.has(activityId)
    ) {
      continue;
    }

    const item = toPlannedShelfItem(
      row,
      latestRunByActivityId.get(activityId) ?? null,
      recurrenceByActivityId.get(activityId) ?? null,
    );

    if (!item) continue;

    if (item.scheduleModeCode === "unscheduled") {
      unscheduled.push(item);
      continue;
    }

    const bounds = scheduleBounds(row, timeZone);
    if (!bounds) continue;

    if (bounds.end < todayDate) {
      overdue.push(item);
    }

    if (
      bounds.start <= todayDate &&
      bounds.end >= todayDate
    ) {
      today.push(item);
    }

    if (
      bounds.start <= week.end &&
      bounds.end >= week.start
    ) {
      weekItems.push(item);
    }
  }

  const { data: completedRowsRaw, error: completedError } =
    await supabase
      .from("activity_events")
      .select(
        [
          "id",
          "title",
          "description",
          "input_text",
          "source",
          "privacy_scope",
          "status",
          "ended_at",
          "created_at",
          "updated_at",
          "fulfills_planned_activity_event_id",
        ].join(","),
      )
      .eq("user_id", appUser.id)
      .eq("acting_as_actor_id", personActor.id)
      .eq("activity_role_code", "actual")
      .eq("status", "completed")
      .not("fulfills_planned_activity_event_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(COMPLETED_HISTORY_LIMIT);

  if (completedError) {
    return NextResponse.json(
      { ok: false, error: completedError.message },
      { status: 500 },
    );
  }

  const completed = asRecords(completedRowsRaw)
    .map((actual) => {
      const plannedId = asString(
        actual.fulfills_planned_activity_event_id,
      );

      return toCompletedShelfItem({
        actual,
        planned: plannedId ? plannedById.get(plannedId) ?? null : null,
        recurrence: plannedId
          ? recurrenceByActivityId.get(plannedId) ?? null
          : null,
      });
    })
    .filter((item): item is ShelfItem => Boolean(item));

  today.sort(compareDueAscending);
  weekItems.sort(compareDueAscending);
  overdue.sort(compareDueAscending);
  unscheduled.sort(compareUpdatedDescending);
  completed.sort(compareCompletedDescending);

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    focusDate,
    todayDate,
    weekStartDate: week.start,
    weekEndDate: week.end,
    timeZone,
    scannedPlannedActivities: plannedRows.length,
    recurrenceSourcesExcluded: recurrenceSourceIds.size,
    fulfilledPlansExcluded: fulfilledPlannedIds.size,
    groups: {
      today: buildGroup("today", today, limit),
      week: buildGroup("week", weekItems, limit),
      overdue: buildGroup("overdue", overdue, limit),
      unscheduled: buildGroup("unscheduled", unscheduled, limit),
      completed: buildGroup("completed", completed, limit),
    },
  });
}
