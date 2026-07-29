import { NextResponse } from "next/server";

import type {
  CalendarAllDayItem,
  CalendarAllDayScheduleMode,
  CalendarEvent,
  CalendarEventKind,
  CalendarEventLayer,
  CalendarEventSource,
  CalendarEventStatus,
} from "../../../../features/calendar-core/types";
import { auth0 } from "../../../../../lib/auth0";
import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";

type UserContext =
  | {
      appUser: Record<string, any>;
      errorResponse: null;
    }
  | {
      appUser: null;
      errorResponse: Response;
    };


/* Step 9A calendar event log types and helpers */
type CalendarEventLogAction = "created" | "updated" | "cancelled" | "restored";

type CalendarEventLogEntry = {
  id: string;
  eventId: string | null;
  eventTitle: string;
  action: CalendarEventLogAction;
  actorName: string;
  actorEmail: string | null;
  occurredAt: string;
  eventStartAt: string | null;
  eventEndAt: string | null;
  eventStatus: string | null;
  canEdit: boolean;
  canCancel: boolean;
  canRestore: boolean;
};

const ACTIVE_PLANNED_STATUSES = ["draft", "planned", "confirmed"] as const;
const ALL_DAY_SCHEDULE_MODES = ["date_only", "date_range", "deadline"] as const;
const MAX_ALL_DAY_SCAN_LIMIT = 500;

function normalizeLogAction(value: unknown): CalendarEventLogAction {
  const text = String(value ?? "").toLowerCase();

  if (text === "restored") {
    return "restored";
  }

  if (text === "cancelled" || text === "canceled") {
    return "cancelled";
  }

  if (text === "updated" || text === "edited") {
    return "updated";
  }

  return "created";
}

function getActorDisplayName(appUser: Record<string, any>) {
  return (
    asText(appUser.display_name) ??
    asText(appUser.full_name) ??
    asText(appUser.name) ??
    asText(appUser.email) ??
    "User"
  );
}

function getActorEmail(appUser: Record<string, any>) {
  return asText(appUser.email);
}

function isInactiveStatusValue(value: unknown) {
  const status = String(value ?? "").toLowerCase();

  return ["cancelled", "canceled", "rejected", "hidden", "archived"].includes(status);
}

function mapCalendarEventLogRow(row: Record<string, any>): CalendarEventLogEntry | null {
  if (!row.id) {
    return null;
  }

  const action = normalizeLogAction(row.action);
  const status = asText(row.event_status);
  const isInactive = isInactiveStatusValue(status);

  return {
    id: String(row.id),
    eventId: row.calendar_event_id ? `calendar:${String(row.calendar_event_id)}` : null,
    eventTitle: asText(row.event_title) ?? "Calendar event",
    action,
    actorName: asText(row.actor_name) ?? "User",
    actorEmail: asText(row.actor_email),
    occurredAt: asText(row.created_at) ?? new Date().toISOString(),
    eventStartAt: asText(row.event_start_time),
    eventEndAt: asText(row.event_end_time),
    eventStatus: status,
    canEdit: Boolean(row.calendar_event_id) && !isInactive,
    canCancel: Boolean(row.calendar_event_id) && !isInactive,
    canRestore: Boolean(row.calendar_event_id) && isInactive,
  };
}

function buildDerivedCalendarEventLogs(
  calendarRows: Record<string, any>[],
  appUser: Record<string, any>,
): CalendarEventLogEntry[] {
  const actorName = getActorDisplayName(appUser);
  const actorEmail = getActorEmail(appUser);
  const entries: CalendarEventLogEntry[] = [];

  for (const row of calendarRows) {
    if (!row.id) {
      continue;
    }

    const event = mapCalendarEvent(row);
    const createdAt = asText(row.created_at) ?? asText(row.start_time) ?? new Date().toISOString();
    const updatedAt = asText(row.updated_at);
    const title = event?.title ?? asText(row.title) ?? "Calendar event";
    const status = asText(row.status) ?? event?.status ?? null;
    const inactive = isInactiveStatusValue(status);

    entries.push({
      id: `derived-created:${String(row.id)}`,
      eventId: `calendar:${String(row.id)}`,
      eventTitle: title,
      action: "created",
      actorName,
      actorEmail,
      occurredAt: createdAt,
      eventStartAt: asText(row.start_time),
      eventEndAt: asText(row.end_time),
      eventStatus: status,
      canEdit: !inactive,
      canCancel: !inactive,
      canRestore: inactive,
    });

    if (updatedAt && Math.abs(new Date(updatedAt).getTime() - new Date(createdAt).getTime()) > 1000) {
      entries.push({
        id: `derived-updated:${String(row.id)}`,
        eventId: `calendar:${String(row.id)}`,
        eventTitle: title,
        action: inactive ? "cancelled" : "updated",
        actorName,
        actorEmail,
        occurredAt: updatedAt,
        eventStartAt: asText(row.start_time),
        eventEndAt: asText(row.end_time),
        eventStatus: status,
        canEdit: !inactive,
        canCancel: !inactive,
        canRestore: inactive,
      });
    }
  }

  return entries.sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
}

async function insertCalendarEventLog(
  action: CalendarEventLogAction,
  appUser: Record<string, any>,
  calendarEvent: Record<string, any>,
  metadata: Record<string, unknown> = {},
) {
  const event = mapCalendarEvent(calendarEvent);

  if (!event) {
    return null;
  }

  const { data, error } = await supabase
    .from("calendar_event_logs")
    .insert({
      user_id: appUser.id,
      calendar_event_id: calendarEvent.id,
      actor_id: calendarEvent.actor_id ?? null,
      actor_name: getActorDisplayName(appUser),
      actor_email: getActorEmail(appUser),
      action,
      event_title: event.title,
      event_start_time: event.startAt,
      event_end_time: event.endAt,
      event_status: asText(calendarEvent.status) ?? event.status,
      event_snapshot: calendarEvent,
      metadata_json: metadata,
    })
    .select("*")
    .single();

  if (error) {
    return null;
  }

  return data ? mapCalendarEventLogRow(data) : null;
}

async function readCalendarEventLogs(
  appUser: Record<string, any>,
  calendarRows: Record<string, any>[],
) {
  const canonicalProjectionIds = new Set(
    calendarRows
      .filter((row) => Boolean(asText(row.related_activity_event_id)))
      .map((row) => String(row.id)),
  );
  const standaloneCalendarRows = calendarRows.filter(
    (row) => !canonicalProjectionIds.has(String(row.id)),
  );

  const { data, error } = await supabase
    .from("calendar_event_logs")
    .select("*")
    .eq("user_id", appUser.id)
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) {
    return buildDerivedCalendarEventLogs(standaloneCalendarRows, appUser);
  }

  const storedLogs = ((data ?? []) as Record<string, any>[])
    .map(mapCalendarEventLogRow)
    .filter((entry): entry is CalendarEventLogEntry => Boolean(entry))
    .filter((entry) => {
      const storageId = entry.eventId?.startsWith("calendar:")
        ? entry.eventId.slice("calendar:".length)
        : null;

      return !storageId || !canonicalProjectionIds.has(storageId);
    });

  if (storedLogs.length > 0) {
    return storedLogs;
  }

  return buildDerivedCalendarEventLogs(standaloneCalendarRows, appUser);
}
function asText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isValidDate(value: string | null) {
  if (!value) {
    return false;
  }

  const parsed = new Date(value).getTime();

  return !Number.isNaN(parsed);
}

function isDateKey(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function asFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dateKeyFromTimestamp(value: string | null) {
  if (!value || !isValidDate(value)) {
    return null;
  }

  const isoDateKey = value.slice(0, 10);

  return isDateKey(isoDateKey) ? isoDateKey : null;
}

function dateOnlyDueAt(value: string | null) {
  return isDateKey(value) ? `${value}T23:59:59.999Z` : null;
}

function normalizeAllDayScheduleMode(value: unknown): CalendarAllDayScheduleMode | null {
  const text = asText(value);

  return ALL_DAY_SCHEDULE_MODES.includes(text as CalendarAllDayScheduleMode)
    ? (text as CalendarAllDayScheduleMode)
    : null;
}

function mapPlannedActivityAllDayItem(row: Record<string, any>): CalendarAllDayItem | null {
  const activityEventId = asText(row.id);
  const scheduleModeCode = normalizeAllDayScheduleMode(row.schedule_mode_code);

  if (!activityEventId || !scheduleModeCode) {
    return null;
  }

  const scheduledDate = asText(row.scheduled_date);
  const scheduleStartDate = asText(row.schedule_start_date);
  const scheduleEndDate = asText(row.schedule_end_date);
  const deadlineAt = asText(row.deadline_at);

  let startDate: string | null = null;
  let endDate: string | null = null;
  let dueAt: string | null = null;

  if (scheduleModeCode === "date_only") {
    startDate = isDateKey(scheduledDate) ? scheduledDate : null;
    endDate = startDate;
    dueAt = dateOnlyDueAt(startDate);
  } else if (scheduleModeCode === "date_range") {
    startDate = isDateKey(scheduleStartDate) ? scheduleStartDate : null;
    endDate = isDateKey(scheduleEndDate) ? scheduleEndDate : startDate;

    if (startDate && endDate && endDate < startDate) {
      return null;
    }

    dueAt = dateOnlyDueAt(endDate);
  } else {
    startDate = dateKeyFromTimestamp(deadlineAt);
    endDate = startDate;
    dueAt = deadlineAt;
  }

  if (!startDate || !endDate) {
    return null;
  }

  return {
    id: `activity:${activityEventId}`,
    activityEventId,
    title:
      asText(row.title) ??
      asText(row.description) ??
      asText(row.input_text) ??
      "Untitled planned activity",
    inputText: asText(row.input_text),
    description: asText(row.description),
    source: asText(row.source),
    privacyScope: asText(row.privacy_scope),
    status: asText(row.status),
    scheduleModeCode,
    scheduledDate,
    scheduleStartDate,
    scheduleEndDate,
    deadlineAt,
    startDate,
    endDate,
    startedAt: asText(row.started_at),
    endedAt: asText(row.ended_at),
    durationMinutes: asFiniteNumber(row.duration_minutes),
    dueAt,
    updatedAt: asText(row.updated_at) ?? asText(row.created_at),
  };
}

function allDayItemIntersectsDateRange(
  item: CalendarAllDayItem,
  rangeStartDate: string | null,
  rangeEndDateExclusive: string | null,
) {
  if (!rangeStartDate || !rangeEndDateExclusive) {
    return true;
  }

  return item.startDate < rangeEndDateExclusive && item.endDate >= rangeStartDate;
}

function normalizeKind(value: unknown): CalendarEventKind {
  const text = String(value ?? "").toLowerCase();

  if (text.includes("fact")) {
    return "activity_fact";
  }

  if (text.includes("external")) {
    return "external_event";
  }

  if (text.includes("time")) {
    return "time_block";
  }

  if (text.includes("candidate")) {
    return "candidate";
  }

  return "planned_activity";
}

function normalizeStatus(value: unknown): CalendarEventStatus {
  const text = String(value ?? "").toLowerCase();

  if (["done", "completed", "complete", "confirmed"].includes(text)) {
    return "done";
  }

  if (["candidate", "preview", "draft"].includes(text)) {
    return "candidate";
  }

  if (["cancelled", "canceled", "rejected", "hidden"].includes(text)) {
    return text === "hidden" ? "hidden" : "cancelled";
  }

  return "planned";
}

function normalizeSource(value: unknown): CalendarEventSource {
  const text = String(value ?? "").toLowerCase();

  if (text.includes("google")) {
    return "google_calendar";
  }

  if (text.includes("biometric")) {
    return "biometric_import";
  }

  if (text.includes("system")) {
    return "system";
  }

  if (text.includes("semantic") || text.includes("ai")) {
    return "ai_semantic_preview";
  }

  return "manual";
}

function inferLayer(value: unknown): CalendarEventLayer {
  const text = String(value ?? "").toLowerCase();

  if (text.includes("work") || text.includes("job") || text.includes("career")) {
    return "work";
  }

  if (text.includes("business") || text.includes("commercial")) {
    return "business";
  }

  if (text.includes("health") || text.includes("medical") || text.includes("doctor")) {
    return "health";
  }

  if (text.includes("certificate")) {
    return "certificates";
  }

  if (text.includes("points")) {
    return "points";
  }

  return "personal";
}

function mapCalendarEvent(row: Record<string, any>): CalendarEvent | null {
  const startAt = asText(row.start_time);
  const endAt = asText(row.end_time);

  if (!row.id || !startAt || !endAt) {
    return null;
  }

  return {
    id: `calendar:${String(row.id)}`,
    title: asText(row.title) ?? asText(row.event_type) ?? "Calendar event",
    description: asText(row.description),
    startAt,
    endAt,
    timezone: asText(row.timezone) ?? "Europe/Warsaw",
    kind: normalizeKind(row.event_type),
    status: normalizeStatus(row.status),
    source: normalizeSource(row.source),
    layer: inferLayer(row.event_type),
    isPrivate: true,
    semanticPreviewId: asText(row.semantic_preview_id),
    valueObjectIds: [],
  };
}

function mapTimeBlock(row: Record<string, any>): CalendarEvent | null {
  const startAt = asText(row.start_time);
  const endAt = asText(row.end_time);

  if (!row.id || !startAt || !endAt) {
    return null;
  }

  const blockType = asText(row.block_type) ?? "time block";
  const availability = asText(row.availability_status);

  return {
    id: `time-block:${String(row.id)}`,
    title: availability ? `${blockType} / ${availability}` : blockType,
    description: asText(row.description),
    startAt,
    endAt,
    timezone: asText(row.timezone) ?? "Europe/Warsaw",
    kind: "time_block",
    status: normalizeStatus(row.status),
    source: normalizeSource(row.source),
    layer: inferLayer(row.block_type),
    isPrivate: true,
    semanticPreviewId: null,
    valueObjectIds: [],
  };
}

/* Step 8A event management helpers */
function parseCalendarEventStorageId(value: unknown) {
  const text = asText(value);

  if (!text) {
    return null;
  }

  if (text.startsWith("calendar:")) {
    return text.slice("calendar:".length);
  }

  if (text.includes(":")) {
    return null;
  }

  return text;
}

function calculateDurationMinutes(startTime: string, endTime: string) {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return null;
  }

  return Math.round((end - start) / 60000);
}

function isActiveCalendarRow(row: Record<string, any>) {
  const status = String(row.status ?? "").toLowerCase();

  return !["cancelled", "canceled", "rejected", "hidden", "archived"].includes(status);
}
async function getCurrentUserContext(): Promise<UserContext> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      appUser: null,
      errorResponse: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("*")
    .eq("auth0_sub", session.user.sub)
    .single();

  if (appUserError || !appUser) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        { error: appUserError?.message ?? "App user not found" },
        { status: 500 },
      ),
    };
  }

  return {
    appUser,
    errorResponse: null,
  };
}

export async function GET(request: Request) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser || !personActor) {
    return NextResponse.json({ error: "Active actor context not found" }, { status: 500 });
  }

  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const requestedRangeStartDate = url.searchParams.get("startDate");
  const requestedRangeEndDate = url.searchParams.get("endDate");
  const rangeStartDate = isDateKey(requestedRangeStartDate)
    ? requestedRangeStartDate
    : null;
  const rangeEndDateExclusive = isDateKey(requestedRangeEndDate)
    ? requestedRangeEndDate
    : null;
  const hasRange = isValidDate(start) && isValidDate(end);
  const includeLog = url.searchParams.get("includeLog") === "1";

  let calendarEventsQuery = supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", appUser.id)
    .order("start_time", { ascending: true });

  let timeBlocksQuery = supabase
    .from("time_blocks")
    .select("*")
    .eq("user_id", appUser.id)
    .order("start_time", { ascending: true });

  const plannedActivitySelect = [
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

  const plannedActivitiesQuery = supabase
    .from("activity_events")
    .select(plannedActivitySelect)
    .eq("user_id", appUser.id)
    .eq("acting_as_actor_id", personActor.id)
    .eq("activity_role_code", "planned")
    .in("status", [...ACTIVE_PLANNED_STATUSES])
    .in("schedule_mode_code", [...ALL_DAY_SCHEDULE_MODES])
    .order("updated_at", { ascending: false })
    .limit(MAX_ALL_DAY_SCAN_LIMIT);

  if (hasRange && start && end) {
    calendarEventsQuery = calendarEventsQuery.lt("start_time", end).gt("end_time", start);
    timeBlocksQuery = timeBlocksQuery.lt("start_time", end).gt("end_time", start);
  }

  const [
    { data: calendarRows, error: calendarError },
    { data: timeBlockRows, error: timeBlockError },
    { data: plannedActivityRows, error: plannedActivityError },
  ] = await Promise.all([
    calendarEventsQuery,
    timeBlocksQuery,
    plannedActivitiesQuery,
  ]);

  if (calendarError) {
    return NextResponse.json({ error: calendarError.message }, { status: 500 });
  }

  if (timeBlockError) {
    return NextResponse.json({ error: timeBlockError.message }, { status: 500 });
  }

  if (plannedActivityError) {
    return NextResponse.json({ error: plannedActivityError.message }, { status: 500 });
  }

  /* Step 8A active rows filter */
  const activeCalendarRows = (calendarRows ?? []).filter(isActiveCalendarRow);
  const activeTimeBlockRows = (timeBlockRows ?? []).filter(isActiveCalendarRow);

  const events = [
    ...(activeCalendarRows.map(mapCalendarEvent).filter(Boolean) as CalendarEvent[]),
    ...(activeTimeBlockRows.map(mapTimeBlock).filter(Boolean) as CalendarEvent[]),
  ].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());

  const allDayItems = ((plannedActivityRows ?? []) as Record<string, any>[])
    .map(mapPlannedActivityAllDayItem)
    .filter((item): item is CalendarAllDayItem => Boolean(item))
    .filter((item) =>
      allDayItemIntersectsDateRange(item, rangeStartDate, rangeEndDateExclusive),
    )
    .sort((left, right) => {
      const dateComparison = left.startDate.localeCompare(right.startDate);

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return left.title.localeCompare(right.title);
    });

  const logs = includeLog ? await readCalendarEventLogs(appUser, calendarRows ?? []) : undefined;

  return NextResponse.json({
    ok: true,
    events,
    allDayItems,
    logs,
    sources: {
      calendarEvents: activeCalendarRows.length,
      timeBlocks: activeTimeBlockRows.length,
      plannedActivities: allDayItems.length,
    },
  });
}
export async function PATCH(request: Request) {
  const { appUser, errorResponse } = await getCurrentUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  const body = await request.json();
  const storageId = parseCalendarEventStorageId(body.id);

  if (!storageId) {
    return NextResponse.json({ error: "Editable calendar event id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  const title = asText(body.title);
  if (title) {
    updates.title = title;
  }

  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    updates.description = asText(body.description);
  }

  const startAt = asText(body.startAt);
  const endAt = asText(body.endAt);

  if (startAt || endAt) {
    if (!isValidDate(startAt) || !isValidDate(endAt) || !startAt || !endAt) {
      return NextResponse.json({ error: "Valid startAt and endAt are required" }, { status: 400 });
    }

    const durationMinutes = calculateDurationMinutes(startAt, endAt);

    if (durationMinutes === null) {
      return NextResponse.json({ error: "endAt must be after startAt" }, { status: 400 });
    }

    updates.start_time = startAt;
    updates.end_time = endAt;
    updates.duration_minutes = durationMinutes;
  }

  const requestedStatus = asText(body.status);
  if (requestedStatus) {
    const normalizedStatus = normalizeStatus(requestedStatus);
    updates.status = normalizedStatus === "done" ? "completed" : normalizedStatus;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const { data: previousCalendarEvent } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("id", storageId)
    .eq("user_id", appUser.id)
    .single();

  const { data: calendarEvent, error: updateError } = await supabase
    .from("calendar_events")
    .update(updates)
    .eq("id", storageId)
    .eq("user_id", appUser.id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const event = mapCalendarEvent(calendarEvent);
  const previousActive = previousCalendarEvent ? isActiveCalendarRow(previousCalendarEvent) : true;
  const nextActive = isActiveCalendarRow(calendarEvent);
  const logAction: CalendarEventLogAction = !previousActive && nextActive ? "restored" : "updated";
  const log = await insertCalendarEventLog(logAction, appUser, calendarEvent, {
    previous: previousCalendarEvent ?? null,
    updates,
  });

  return NextResponse.json({
    ok: true,
    event,
    log,
  });
}

export async function DELETE(request: Request) {
  const { appUser, errorResponse } = await getCurrentUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  const body = await request.json().catch(() => ({}));
  const storageId = parseCalendarEventStorageId(body.id);

  if (!storageId) {
    return NextResponse.json({ error: "Editable calendar event id is required" }, { status: 400 });
  }

  const { data: calendarEvent, error: cancelError } = await supabase
    .from("calendar_events")
    .update({ status: "cancelled" })
    .eq("id", storageId)
    .eq("user_id", appUser.id)
    .select("*")
    .single();

  if (cancelError) {
    return NextResponse.json({ error: cancelError.message }, { status: 500 });
  }

  const log = await insertCalendarEventLog("cancelled", appUser, calendarEvent);

  return NextResponse.json({
    ok: true,
    event: mapCalendarEvent(calendarEvent),
    log,
  });
}
