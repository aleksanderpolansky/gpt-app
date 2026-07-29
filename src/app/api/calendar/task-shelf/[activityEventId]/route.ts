import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    activityEventId: string;
  }>;
};

type JsonRecord = Record<string, unknown>;

type EditableScheduleMode =
  | "unscheduled"
  | "date_only"
  | "date_range"
  | "deadline"
  | "exact";

type UpdateBody = {
  title?: unknown;
  description?: unknown;
  scheduleModeCode?: unknown;
  scheduledDate?: unknown;
  scheduleStartDate?: unknown;
  scheduleEndDate?: unknown;
  deadlineAt?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  durationMinutes?: unknown;
};

const ACTIVE_PLANNED_STATUSES = ["draft", "planned", "confirmed"] as const;

const ACTIVITY_SELECT = [
  "id",
  "title",
  "input_text",
  "description",
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

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

function isDateKey(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(parsed.getTime());
}

function normalizeScheduleMode(value: unknown): EditableScheduleMode | null {
  const mode = asString(value);

  if (
    mode === "unscheduled" ||
    mode === "date_only" ||
    mode === "date_range" ||
    mode === "deadline" ||
    mode === "exact"
  ) {
    return mode;
  }

  return null;
}

function normalizeDeadline(value: unknown): string | null {
  const text = asString(value);

  if (!text) {
    return null;
  }

  const parsed = new Date(text);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeIsoDate(value: unknown): string | null {
  const text = asString(value);

  if (!text) {
    return null;
  }

  const parsed = new Date(text);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function calculateDurationMinutes(
  startedAt: string,
  endedAt: string,
): number | null {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return null;
  }

  return Math.round((end - start) / 60000);
}

function addMinutes(isoValue: string, minutes: number) {
  return new Date(
    new Date(isoValue).getTime() + minutes * 60_000,
  ).toISOString();
}

function titleForActivity(row: JsonRecord) {
  return (
    asString(row.title) ??
    asString(row.input_text) ??
    asString(row.description) ??
    "Planned activity"
  );
}

function toActivity(row: JsonRecord) {
  return {
    id: asString(row.id),
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
    updatedAt: asString(row.updated_at) ?? asString(row.created_at),
  };
}

async function resolveContext(context: RouteContext) {
  const { appUser, personActor, errorResponse } =
    await getActivityUserContext();

  if (errorResponse) {
    return {
      appUser: null,
      personActor: null,
      activityEventId: null,
      errorResponse,
    };
  }

  if (!appUser || !personActor) {
    return {
      appUser: null,
      personActor: null,
      activityEventId: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: "User context not found",
        },
        { status: 500 },
      ),
    };
  }

  const params = await context.params;
  const activityEventId = params.activityEventId?.trim();

  if (!activityEventId) {
    return {
      appUser: null,
      personActor: null,
      activityEventId: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: "Activity event id is required.",
        },
        { status: 400 },
      ),
    };
  }

  return {
    appUser,
    personActor,
    activityEventId,
    errorResponse: null,
  };
}

async function loadOwnedPlannedActivity(params: {
  activityEventId: string;
  userId: string;
  actorId: string;
}) {
  const { data, error } = await supabase
    .from("activity_events")
    .select(ACTIVITY_SELECT)
    .eq("id", params.activityEventId)
    .eq("user_id", params.userId)
    .eq("acting_as_actor_id", params.actorId)
    .eq("activity_role_code", "planned")
    .single();

  if (error || !data) {
    return {
      row: null,
      error: error?.message ?? "Activity event not found or access denied.",
    };
  }

  return {
    row: asRecord(data),
    error: null,
  };
}

async function cancelCalendarProjection(params: {
  activityEventId: string;
  userId: string;
}) {
  const { error } = await supabase
    .from("calendar_events")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("related_activity_event_id", params.activityEventId)
    .eq("user_id", params.userId)
    .not("status", "in", "(cancelled,archived,hidden)");

  return error?.message ?? null;
}

async function syncExactCalendarProjection(params: {
  activityEventId: string;
  userId: string;
  actorId: string;
  title: string;
  description: string | null;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  source: string | null;
}) {
  const { data: existingRows, error: existingError } = await supabase
    .from("calendar_events")
    .select("id")
    .eq("related_activity_event_id", params.activityEventId)
    .eq("user_id", params.userId)
    .limit(2);

  if (existingError) {
    return existingError.message;
  }

  const rows = Array.isArray(existingRows)
    ? existingRows.filter(
        (row): row is { id: string } =>
          Boolean(row) &&
          typeof row === "object" &&
          typeof (row as { id?: unknown }).id === "string",
      )
    : [];

  if (rows.length > 1) {
    return "More than one calendar projection exists for this activity.";
  }

  const projection = {
    user_id: params.userId,
    actor_id: params.actorId,
    related_activity_event_id: params.activityEventId,
    event_type: "planned_activity",
    temporal_direction: "future",
    title: params.title,
    description: params.description,
    start_time: params.startedAt,
    end_time: params.endedAt,
    duration_minutes: params.durationMinutes,
    status: "planned",
    source: params.source ?? "manual",
    updated_at: new Date().toISOString(),
  };

  if (rows.length === 1) {
    const { error } = await supabase
      .from("calendar_events")
      .update(projection)
      .eq("id", rows[0].id)
      .eq("user_id", params.userId);

    return error?.message ?? null;
  }

  const { error } = await supabase
    .from("calendar_events")
    .insert({
      ...projection,
      created_at: new Date().toISOString(),
    });

  return error?.message ?? null;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  const resolved = await resolveContext(context);

  if (resolved.errorResponse) {
    return resolved.errorResponse;
  }

  const {
    appUser,
    personActor,
    activityEventId,
  } = resolved;

  if (!appUser || !personActor || !activityEventId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Activity context could not be resolved.",
      },
      { status: 500 },
    );
  }

  let body: UpdateBody;

  try {
    body = (await request.json()) as UpdateBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body.",
      },
      { status: 400 },
    );
  }

  const current = await loadOwnedPlannedActivity({
    activityEventId,
    userId: appUser.id,
    actorId: personActor.id,
  });

  if (!current.row) {
    return NextResponse.json(
      {
        ok: false,
        error: current.error,
      },
      { status: 404 },
    );
  }

  const currentStatus = asString(current.row.status);

  if (
    !currentStatus ||
    !ACTIVE_PLANNED_STATUSES.includes(
      currentStatus as (typeof ACTIVE_PLANNED_STATUSES)[number],
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Only active planned activities can be edited.",
        status: currentStatus,
      },
      { status: 409 },
    );
  }

  const title = asString(body.title);
  const scheduleModeCode = normalizeScheduleMode(body.scheduleModeCode);

  if (!title || !scheduleModeCode) {
    return NextResponse.json(
      {
        ok: false,
        error: "title and a supported scheduleModeCode are required.",
        supportedScheduleModes: [
          "unscheduled",
          "date_only",
          "date_range",
          "deadline",
          "exact",
        ],
      },
      { status: 400 },
    );
  }

  const scheduledDate = asString(body.scheduledDate);
  const scheduleStartDate = asString(body.scheduleStartDate);
  const scheduleEndDate = asString(body.scheduleEndDate);
  const deadlineAt = normalizeDeadline(body.deadlineAt);
  const startedAt = normalizeIsoDate(body.startedAt);
  const requestedEndedAt = normalizeIsoDate(body.endedAt);
  const requestedDuration = asNumber(body.durationMinutes);
  const normalizedDuration =
    requestedDuration !== null && requestedDuration > 0
      ? Math.round(requestedDuration)
      : null;
  const endedAt =
    scheduleModeCode === "exact" &&
    startedAt &&
    !requestedEndedAt &&
    normalizedDuration
      ? addMinutes(startedAt, normalizedDuration)
      : requestedEndedAt;
  const exactDuration =
    scheduleModeCode === "exact" && startedAt && endedAt
      ? calculateDurationMinutes(startedAt, endedAt)
      : null;

  if (scheduleModeCode === "date_only" && !isDateKey(scheduledDate)) {
    return NextResponse.json(
      {
        ok: false,
        error: "scheduledDate is required for date_only.",
      },
      { status: 400 },
    );
  }

  if (
    scheduleModeCode === "date_range" &&
    (!isDateKey(scheduleStartDate) || !isDateKey(scheduleEndDate))
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "scheduleStartDate and scheduleEndDate are required for date_range.",
      },
      { status: 400 },
    );
  }

  if (
    scheduleModeCode === "date_range" &&
    scheduleStartDate &&
    scheduleEndDate &&
    scheduleEndDate < scheduleStartDate
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "scheduleEndDate must not be before scheduleStartDate.",
      },
      { status: 400 },
    );
  }

  if (scheduleModeCode === "deadline" && !deadlineAt) {
    return NextResponse.json(
      {
        ok: false,
        error: "deadlineAt is required for deadline.",
      },
      { status: 400 },
    );
  }

  if (
    scheduleModeCode === "exact" &&
    (!startedAt || !endedAt || exactDuration === null)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Valid startedAt and endedAt are required for exact scheduling.",
      },
      { status: 400 },
    );
  }

  const nowIso = new Date().toISOString();
  const updates: JsonRecord = {
    title,
    description: asNullableString(body.description),
    schedule_mode_code: scheduleModeCode,
    scheduled_date:
      scheduleModeCode === "date_only" ? scheduledDate : null,
    schedule_start_date:
      scheduleModeCode === "date_range" ? scheduleStartDate : null,
    schedule_end_date:
      scheduleModeCode === "date_range" ? scheduleEndDate : null,
    deadline_at:
      scheduleModeCode === "deadline" ? deadlineAt : null,
    started_at:
      scheduleModeCode === "exact" ? startedAt : null,
    ended_at:
      scheduleModeCode === "exact" ? endedAt : null,
    duration_minutes:
      scheduleModeCode === "exact"
        ? exactDuration
        : asNumber(current.row.duration_minutes),
    updated_at: nowIso,
  };

  const { data, error } = await supabase
    .from("activity_events")
    .update(updates)
    .eq("id", activityEventId)
    .eq("user_id", appUser.id)
    .eq("acting_as_actor_id", personActor.id)
    .eq("activity_role_code", "planned")
    .in("status", [...ACTIVE_PLANNED_STATUSES])
    .select(ACTIVITY_SELECT)
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to update planned activity.",
      },
      { status: 500 },
    );
  }

  const projectionWarning =
    scheduleModeCode === "exact" &&
    startedAt &&
    endedAt &&
    exactDuration !== null
      ? await syncExactCalendarProjection({
          activityEventId,
          userId: appUser.id,
          actorId: personActor.id,
          title,
          description: asNullableString(body.description),
          startedAt,
          endedAt,
          durationMinutes: exactDuration,
          source: asString(current.row.source),
        })
      : await cancelCalendarProjection({
          activityEventId,
          userId: appUser.id,
        });

  return NextResponse.json({
    ok: true,
    activity: toActivity(asRecord(data)),
    projectionDisposition:
      scheduleModeCode === "exact"
        ? "exact_projection_synchronized"
        : "non_exact_projection_cancelled_if_present",
    warning: projectionWarning,
  });
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  const resolved = await resolveContext(context);

  if (resolved.errorResponse) {
    return resolved.errorResponse;
  }

  const {
    appUser,
    personActor,
    activityEventId,
  } = resolved;

  if (!appUser || !personActor || !activityEventId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Activity context could not be resolved.",
      },
      { status: 500 },
    );
  }

  const current = await loadOwnedPlannedActivity({
    activityEventId,
    userId: appUser.id,
    actorId: personActor.id,
  });

  if (!current.row) {
    return NextResponse.json(
      {
        ok: false,
        error: current.error,
      },
      { status: 404 },
    );
  }

  const currentStatus = asString(current.row.status);

  if (
    !currentStatus ||
    !ACTIVE_PLANNED_STATUSES.includes(
      currentStatus as (typeof ACTIVE_PLANNED_STATUSES)[number],
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Only active planned activities can be cancelled.",
        status: currentStatus,
      },
      { status: 409 },
    );
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("activity_events")
    .update({
      status: "cancelled",
      updated_at: nowIso,
    })
    .eq("id", activityEventId)
    .eq("user_id", appUser.id)
    .eq("acting_as_actor_id", personActor.id)
    .eq("activity_role_code", "planned")
    .in("status", [...ACTIVE_PLANNED_STATUSES])
    .select(ACTIVITY_SELECT)
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to cancel planned activity.",
      },
      { status: 500 },
    );
  }

  const projectionWarning = await cancelCalendarProjection({
    activityEventId,
    userId: appUser.id,
  });

  return NextResponse.json({
    ok: true,
    activity: toActivity(asRecord(data)),
    projectionDisposition: "projection_cancelled_if_present",
    warning: projectionWarning,
  });
}
