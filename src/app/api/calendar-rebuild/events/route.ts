import { NextResponse } from "next/server";

import type {
  CalendarEvent,
  CalendarEventKind,
  CalendarEventLayer,
  CalendarEventSource,
  CalendarEventStatus,
} from "../../../../features/calendar-core/types";
import { auth0 } from "../../../../../lib/auth0";
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
  const { appUser, errorResponse } = await getCurrentUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const hasRange = isValidDate(start) && isValidDate(end);

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

  if (hasRange && start && end) {
    calendarEventsQuery = calendarEventsQuery.lt("start_time", end).gt("end_time", start);
    timeBlocksQuery = timeBlocksQuery.lt("start_time", end).gt("end_time", start);
  }

  const [
    { data: calendarRows, error: calendarError },
    { data: timeBlockRows, error: timeBlockError },
  ] = await Promise.all([calendarEventsQuery, timeBlocksQuery]);

  if (calendarError) {
    return NextResponse.json({ error: calendarError.message }, { status: 500 });
  }

  if (timeBlockError) {
    return NextResponse.json({ error: timeBlockError.message }, { status: 500 });
  }

  /* Step 8A active rows filter */
  const activeCalendarRows = (calendarRows ?? []).filter(isActiveCalendarRow);
  const activeTimeBlockRows = (timeBlockRows ?? []).filter(isActiveCalendarRow);

  const events = [
    ...(activeCalendarRows.map(mapCalendarEvent).filter(Boolean) as CalendarEvent[]),
    ...(activeTimeBlockRows.map(mapTimeBlock).filter(Boolean) as CalendarEvent[]),
  ].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());

  return NextResponse.json({
    ok: true,
    events,
    sources: {
      calendarEvents: activeCalendarRows.length,
      timeBlocks: activeTimeBlockRows.length,
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

  return NextResponse.json({
    ok: true,
    event,
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

  return NextResponse.json({
    ok: true,
    event: mapCalendarEvent(calendarEvent),
  });
}
