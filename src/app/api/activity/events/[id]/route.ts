import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
import { recalculateActivityImpacts } from "../../../../../../lib/activity/activityImpactProcessor";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

const DEFAULT_CORRECTION_TIMEZONE = "Europe/Warsaw";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ActivityEventRow = {
  id: string;
  user_id: string;
  performed_by_actor_id: string | null;
  acting_as_actor_id: string | null;
  acting_for_actor_id: string | null;
  activity_type_id: string | null;
  activity_template_id: string | null;
  template_id: string | null;
  event_code: string | null;
  input_text: string | null;
  title: string | null;
  description: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | string | null;
  source: string | null;
  status: string;
  privacy_scope: string | null;
  processing_status: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type CorrectionPatchBody = {
  durationMinutes?: unknown;
  comment?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  status?: unknown;
  reason?: unknown;
};

type ResolvedCorrectionTiming =
  | {
      ok: true;
      startedAt: string | null;
      endedAt: string | null;
      durationMinutes: number | null;
      timingChanged: boolean;
      durationChanged: boolean;
    }
  | {
      ok: false;
      error: string;
    };

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

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

function valuesDiffer(left: unknown, right: unknown) {
  return String(left ?? "") !== String(right ?? "");
}

function dateValuesDiffer(left: string | null, right: string | null) {
  if (!left && !right) {
    return false;
  }

  if (!left || !right) {
    return true;
  }

  const leftDate = new Date(left);
  const rightDate = new Date(right);

  if (
    Number.isNaN(leftDate.getTime()) ||
    Number.isNaN(rightDate.getTime())
  ) {
    return valuesDiffer(left, right);
  }

  return leftDate.getTime() !== rightDate.getTime();
}

function normalizeIsoDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
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

function resolveAggregateDateForAudit(startedAt: string | null) {
  if (startedAt) {
    const date = new Date(startedAt);

    if (!Number.isNaN(date.getTime())) {
      return getDatePartsInTimezone(date, DEFAULT_CORRECTION_TIMEZONE);
    }
  }

  return getDatePartsInTimezone(new Date(), DEFAULT_CORRECTION_TIMEZONE);
}

function resolveCorrectionTiming(params: {
  event: ActivityEventRow;
  body: CorrectionPatchBody;
}): ResolvedCorrectionTiming {
  const { event, body } = params;

  const hasStartedAtPatch =
    Object.prototype.hasOwnProperty.call(body, "startedAt") ||
    Object.prototype.hasOwnProperty.call(body, "startTime");

  const hasEndedAtPatch =
    Object.prototype.hasOwnProperty.call(body, "endedAt") ||
    Object.prototype.hasOwnProperty.call(body, "endTime");

  const hasDurationPatch = Object.prototype.hasOwnProperty.call(
    body,
    "durationMinutes"
  );

  const rawStartedAt = hasStartedAtPatch
    ? asString(body.startedAt) ?? asString(body.startTime)
    : event.started_at;

  const rawEndedAt = hasEndedAtPatch
    ? asString(body.endedAt) ?? asString(body.endTime)
    : event.ended_at;

  const patchedDuration = hasDurationPatch
    ? asNumber(body.durationMinutes)
    : asNumber(event.duration_minutes);

  if (hasDurationPatch && patchedDuration === null) {
    return {
      ok: false,
      error: "durationMinutes must be a valid number.",
    };
  }

  if (patchedDuration !== null && patchedDuration < 0) {
    return {
      ok: false,
      error: "durationMinutes must be greater than or equal to 0.",
    };
  }

  const startedAt = normalizeIsoDate(rawStartedAt);
  const endedAt = normalizeIsoDate(rawEndedAt);

  if (rawStartedAt && !startedAt) {
    return {
      ok: false,
      error: "Invalid startedAt or startTime.",
    };
  }

  if (rawEndedAt && !endedAt) {
    return {
      ok: false,
      error: "Invalid endedAt or endTime.",
    };
  }

  if (hasDurationPatch && patchedDuration !== null) {
    if (startedAt && !hasEndedAtPatch) {
      const startedDate = new Date(startedAt);
      const recalculatedEndedAt = new Date(
        startedDate.getTime() + patchedDuration * 60000
      ).toISOString();

      return {
        ok: true,
        startedAt,
        endedAt: recalculatedEndedAt,
        durationMinutes: patchedDuration,
        timingChanged:
          dateValuesDiffer(startedAt, event.started_at) ||
          dateValuesDiffer(recalculatedEndedAt, event.ended_at),
        durationChanged: valuesDiffer(patchedDuration, event.duration_minutes),
      };
    }

    if (endedAt && !hasStartedAtPatch) {
      const endedDate = new Date(endedAt);
      const recalculatedStartedAt = new Date(
        endedDate.getTime() - patchedDuration * 60000
      ).toISOString();

      return {
        ok: true,
        startedAt: recalculatedStartedAt,
        endedAt,
        durationMinutes: patchedDuration,
        timingChanged:
          dateValuesDiffer(recalculatedStartedAt, event.started_at) ||
          dateValuesDiffer(endedAt, event.ended_at),
        durationChanged: valuesDiffer(patchedDuration, event.duration_minutes),
      };
    }
  }

  if (startedAt && endedAt) {
    const startedDate = new Date(startedAt);
    const endedDate = new Date(endedAt);

    if (endedDate.getTime() < startedDate.getTime()) {
      return {
        ok: false,
        error: "endedAt must be greater than or equal to startedAt.",
      };
    }

    const calculatedDurationMinutes = Math.round(
      (endedDate.getTime() - startedDate.getTime()) / 60000
    );

    return {
      ok: true,
      startedAt,
      endedAt,
      durationMinutes: calculatedDurationMinutes,
      timingChanged:
        dateValuesDiffer(startedAt, event.started_at) ||
        dateValuesDiffer(endedAt, event.ended_at),
      durationChanged: valuesDiffer(
        calculatedDurationMinutes,
        event.duration_minutes
      ),
    };
  }

  return {
    ok: true,
    startedAt,
    endedAt,
    durationMinutes: patchedDuration,
    timingChanged:
      dateValuesDiffer(startedAt, event.started_at) ||
      dateValuesDiffer(endedAt, event.ended_at),
    durationChanged: valuesDiffer(patchedDuration, event.duration_minutes),
  };
}

async function getActivityEvent(params: { eventId: string; userId: string }) {
  const { eventId, userId } = params;

  const { data, error } = await supabase
    .from("activity_events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ActivityEventRow | null) ?? null;
}

async function getImpactEventsForAudit(eventId: string) {
  const { data, error } = await supabase
    .from("impact_events")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function getDailyAggregatesForAudit(params: {
  userId: string;
  aggregateDate: string;
}) {
  const { userId, aggregateDate } = params;

  const { data, error } = await supabase
    .from("daily_aggregates")
    .select("*")
    .eq("user_id", userId)
    .eq("aggregate_date", aggregateDate)
    .order("aggregate_type", { ascending: true })
    .order("aggregate_key", { ascending: true })
    .order("metric_key", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function getCurrentSnapshotsForAudit(params: {
  userId: string;
  eventId: string;
}) {
  const { userId, eventId } = params;

  const { data, error } = await supabase
    .from("current_snapshots")
    .select("*")
    .eq("user_id", userId)
    .eq("last_event_id", eventId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

function resolveCorrectionType(changedFields: string[]) {
  if (
    changedFields.includes("started_at") ||
    changedFields.includes("ended_at")
  ) {
    return "timing_correction";
  }

  if (changedFields.includes("duration_minutes")) {
    return "duration_correction";
  }

  if (changedFields.includes("description")) {
    return "comment_correction";
  }

  return "manual_patch";
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/events/[id]",
    methods: ["PATCH"],
    enabled: ACTIVITY_RECORDING_ENABLED,
    status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
    supportedPatchFields: {
      durationMinutes: "number, non-negative",
      comment: "string",
      startedAt: "ISO date string",
      endedAt: "ISO date string",
      reason: "string",
    },
    currentLimit:
      "B11.3a supports completed event timing/duration/comment corrections. Status rollback/cancel corrections are planned as a separate step.",
  });
}

export async function PATCH(request: Request, context: RouteContext) {
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

  const params = await context.params;
  const eventId = params.id?.trim();

  if (!eventId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Activity event id is required.",
      },
      { status: 400 }
    );
  }

  let body: CorrectionPatchBody;

  try {
    body = (await request.json()) as CorrectionPatchBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  const unsupportedStatus = asString(body.status);

  if (unsupportedStatus && unsupportedStatus !== "completed") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Status corrections to non-completed states are not enabled in B11.3a. They require rollback-only correction mode.",
        requestedStatus: unsupportedStatus,
        supportedNow: ["completed"],
        plannedNext: "B11.3b or B11.4 status correction rollback-only flow",
      },
      { status: 400 }
    );
  }

  let previousEvent: ActivityEventRow | null;

  try {
    previousEvent = await getActivityEvent({
      eventId,
      userId: appUser.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load activity event.",
      },
      { status: 500 }
    );
  }

  if (!previousEvent) {
    return NextResponse.json(
      {
        ok: false,
        error: "Activity event not found or access denied.",
      },
      { status: 404 }
    );
  }

  if (previousEvent.status !== "completed") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "B11.3a correction route only supports completed events. Started/paused/status corrections will be handled separately.",
        currentStatus: previousEvent.status,
      },
      { status: 409 }
    );
  }

  const timing = resolveCorrectionTiming({
    event: previousEvent,
    body,
  });

  if (!timing.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: timing.error,
      },
      { status: 400 }
    );
  }

  const hasCommentPatch = Object.prototype.hasOwnProperty.call(
    body,
    "comment"
  );

  const patchedComment = hasCommentPatch
    ? asString(body.comment)
    : previousEvent.description;

  const changedFields: string[] = [];

  if (
    timing.timingChanged &&
    dateValuesDiffer(timing.startedAt, previousEvent.started_at)
  ) {
    changedFields.push("started_at");
  }

  if (
    timing.timingChanged &&
    dateValuesDiffer(timing.endedAt, previousEvent.ended_at)
  ) {
    changedFields.push("ended_at");
  }

  if (timing.durationChanged) {
    changedFields.push("duration_minutes");
  }

  if (
    hasCommentPatch &&
    valuesDiffer(patchedComment, previousEvent.description)
  ) {
    changedFields.push("description");
  }

  if (changedFields.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "No supported fields changed.",
      },
      { status: 400 }
    );
  }

  const reason = asString(body.reason);
  const previousAggregateDate = resolveAggregateDateForAudit(
    previousEvent.started_at
  );

  let previousImpactEvents: unknown[] = [];
  let previousDailyAggregates: unknown[] = [];
  let previousCurrentSnapshots: unknown[] = [];

  try {
    previousImpactEvents = await getImpactEventsForAudit(previousEvent.id);
    previousDailyAggregates = await getDailyAggregatesForAudit({
      userId: appUser.id,
      aggregateDate: previousAggregateDate,
    });
    previousCurrentSnapshots = await getCurrentSnapshotsForAudit({
      userId: appUser.id,
      eventId: previousEvent.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to collect previous correction audit state.",
      },
      { status: 500 }
    );
  }

  const nowIso = new Date().toISOString();
  const existingMetadata = asRecord(previousEvent.metadata_json);

  const { data: updatedEventData, error: updateError } = await supabase
    .from("activity_events")
    .update({
      started_at: timing.startedAt,
      ended_at: timing.endedAt,
      duration_minutes: timing.durationMinutes,
      description: patchedComment,
      status: "completed",
      processing_status: "processed",
      metadata_json: {
        ...existingMetadata,
        corrected: true,
        last_correction_at: nowIso,
        last_correction_reason: reason,
        last_correction_changed_fields: changedFields,
        correction_flow: "B11.3a",
      },
      updated_at: nowIso,
    })
    .eq("id", previousEvent.id)
    .eq("user_id", appUser.id)
    .select()
    .single();

  if (updateError || !updatedEventData) {
    return NextResponse.json(
      {
        ok: false,
        error: updateError?.message ?? "Failed to update activity event.",
      },
      { status: 500 }
    );
  }

  const updatedEvent = updatedEventData as ActivityEventRow;
  const shouldRecalculate =
    changedFields.includes("started_at") ||
    changedFields.includes("ended_at") ||
    changedFields.includes("duration_minutes");

  let recalculationResult: unknown = {
    ok: true,
    skipped: true,
    reason:
      "Only comment/description changed. Impact recalculation was not required.",
  };

  if (shouldRecalculate) {
    try {
      recalculationResult = await recalculateActivityImpacts({
        eventId: updatedEvent.id,
        userId: appUser.id,
        activityTemplateId: updatedEvent.activity_template_id,
        activityTypeId: updatedEvent.activity_type_id,
        durationMinutes: asNumber(updatedEvent.duration_minutes),
        startedAt: updatedEvent.started_at,
        previousStartedAt: previousEvent.started_at,
        timezone: DEFAULT_CORRECTION_TIMEZONE,
        reason: reason ?? "activity_event_correction",
      });
    } catch (error) {
      await supabase
        .from("activity_events")
        .update({
          processing_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", updatedEvent.id)
        .eq("user_id", appUser.id);

      return NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to recalculate activity impacts.",
          previousEvent,
          updatedEvent,
        },
        { status: 500 }
      );
    }
  }

  const { data: correctionRow, error: correctionError } = await supabase
    .from("activity_corrections")
    .insert({
      user_id: appUser.id,
      event_id: updatedEvent.id,
      correction_type: resolveCorrectionType(changedFields),
      correction_status: "applied",
      changed_fields: changedFields,
      previous_event_json: previousEvent,
      new_event_json: updatedEvent,
      previous_impact_events_json: previousImpactEvents,
      previous_daily_aggregates_json: previousDailyAggregates,
      previous_current_snapshots_json: previousCurrentSnapshots,
      recalculation_result_json: recalculationResult,
      reason,
      source: "api_patch",
    })
    .select()
    .single();

  if (correctionError) {
    return NextResponse.json(
      {
        ok: false,
        error: correctionError.message,
        warning:
          "Activity event was updated, but correction audit row was not created.",
        previousEvent,
        updatedEvent,
        recalculationResult,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    status: "corrected",
    event: updatedEvent,
    correction: correctionRow,
    changedFields,
    recalculation: recalculationResult,
    audit: {
      previousImpactEventsCount: previousImpactEvents.length,
      previousDailyAggregatesCount: previousDailyAggregates.length,
      previousCurrentSnapshotsCount: previousCurrentSnapshots.length,
      previousAggregateDate,
    },
  });
}