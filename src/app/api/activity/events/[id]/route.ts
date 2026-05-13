import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
import {
  recalculateActivityImpacts,
  rollbackActivityImpacts,
} from "../../../../../../lib/activity/activityImpactProcessor";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

const DEFAULT_CORRECTION_TIMEZONE = "Europe/Warsaw";
const TIMELINE_SEARCH_PADDING_BEFORE_HOURS = 2;
const TIMELINE_SEARCH_PADDING_AFTER_HOURS = 12;

const ROLLBACK_ONLY_STATUSES = new Set([
  "cancelled",
  "missed",
  "archived",
  "corrected",
]);

const TIMELINE_EXCLUDED_STATUSES = new Set([
  "cancelled",
  "missed",
  "archived",
  "corrected",
  "status_corrected",
]);

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

type AuditFailureRecoveryResult = {
  ok: boolean;
  error: string | null;
  event: ActivityEventRow | null;
};

type TimelineConflictSeverity = "info" | "warning" | "blocking";

type TimelineConflictCandidate = {
  eventId: string;
  title: string | null;
  status: string;
  processingStatus: string | null;
  source: string | null;
  currentStartedAt: string | null;
  currentEndedAt: string | null;
  currentDurationMinutes: number | null;
  suggestedStartedAt: string | null;
  suggestedEndedAt: string | null;
  suggestedDurationMinutes: number | null;
  conflictTypes: string[];
  severity: TimelineConflictSeverity;
  isSuggestedChange: boolean;
  explanation: string;
};

type TimelineConflictDetectionResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  correctedEventId: string;
  previousInterval: {
    startedAt: string | null;
    endedAt: string | null;
    durationMinutes: number | null;
  };
  newInterval: {
    startedAt: string | null;
    endedAt: string | null;
    durationMinutes: number | null;
  };
  searchRange?: {
    from: string;
    to: string;
  };
  summary: {
    candidatesCount: number;
    suggestedChangesCount: number;
    blockingCandidatesCount: number;
  };
  candidates: TimelineConflictCandidate[];
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

function hasOwnProperty(object: object, key: string) {
  return Object.prototype.hasOwnProperty.call(object, key);
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

function isSameInstant(left: string | null, right: string | null) {
  if (!left || !right) {
    return false;
  }

  const leftDate = new Date(left);
  const rightDate = new Date(right);

  if (
    Number.isNaN(leftDate.getTime()) ||
    Number.isNaN(rightDate.getTime())
  ) {
    return false;
  }

  return leftDate.getTime() === rightDate.getTime();
}

function getTimeValue(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getTime();
}

function addHours(value: string, hours: number) {
  const date = new Date(value);
  return new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function calculateDurationMinutes(startedAt: string | null, endedAt: string | null) {
  const startedValue = getTimeValue(startedAt);
  const endedValue = getTimeValue(endedAt);

  if (startedValue === null || endedValue === null) {
    return null;
  }

  return Math.round((endedValue - startedValue) / 60000);
}

function getDurationFromEvent(event: ActivityEventRow) {
  const explicitDuration = asNumber(event.duration_minutes);

  if (explicitDuration !== null) {
    return explicitDuration;
  }

  return calculateDurationMinutes(event.started_at, event.ended_at);
}

function resolveTimelineSearchRange(params: {
  previousEvent: ActivityEventRow;
  updatedEvent: ActivityEventRow;
}) {
  const { previousEvent, updatedEvent } = params;

  const values = [
    normalizeIsoDate(previousEvent.started_at),
    normalizeIsoDate(previousEvent.ended_at),
    normalizeIsoDate(updatedEvent.started_at),
    normalizeIsoDate(updatedEvent.ended_at),
  ].filter((value): value is string => Boolean(value));

  if (values.length === 0) {
    return null;
  }

  const timestamps = values
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return null;
  }

  const minIso = new Date(Math.min(...timestamps)).toISOString();
  const maxIso = new Date(Math.max(...timestamps)).toISOString();

  return {
    from: addHours(minIso, -TIMELINE_SEARCH_PADDING_BEFORE_HOURS),
    to: addHours(maxIso, TIMELINE_SEARCH_PADDING_AFTER_HOURS),
  };
}

function shouldConsiderTimelineCandidate(event: ActivityEventRow) {
  if (TIMELINE_EXCLUDED_STATUSES.has(event.status)) {
    return false;
  }

  if (event.processing_status === "failed") {
    return false;
  }

  if (!event.started_at) {
    return false;
  }

  return true;
}

function buildTimelineCandidate(params: {
  candidate: ActivityEventRow;
  previousEvent: ActivityEventRow;
  updatedEvent: ActivityEventRow;
}): TimelineConflictCandidate | null {
  const { candidate, previousEvent, updatedEvent } = params;

  if (!shouldConsiderTimelineCandidate(candidate)) {
    return null;
  }

  const previousEndedAt = normalizeIsoDate(previousEvent.ended_at);
  const updatedStartedAt = normalizeIsoDate(updatedEvent.started_at);
  const updatedEndedAt = normalizeIsoDate(updatedEvent.ended_at);
  const candidateStartedAt = normalizeIsoDate(candidate.started_at);
  const candidateEndedAt = normalizeIsoDate(candidate.ended_at);

  const previousEndedValue = getTimeValue(previousEndedAt);
  const updatedStartedValue = getTimeValue(updatedStartedAt);
  const updatedEndedValue = getTimeValue(updatedEndedAt);
  const candidateStartedValue = getTimeValue(candidateStartedAt);
  const candidateEndedValue = getTimeValue(candidateEndedAt);

  if (
    !updatedStartedAt ||
    !updatedEndedAt ||
    updatedStartedValue === null ||
    updatedEndedValue === null ||
    !candidateStartedAt ||
    candidateStartedValue === null
  ) {
    return null;
  }

  const conflictTypes: string[] = [];
  let suggestedStartedAt = candidateStartedAt;
  let suggestedEndedAt = candidateEndedAt;

  if (previousEndedAt && isSameInstant(candidateStartedAt, previousEndedAt)) {
    conflictTypes.push("started_at_old_corrected_event_end");
    suggestedStartedAt = updatedEndedAt;
  }

  if (
    previousEndedValue !== null &&
    updatedEndedValue > previousEndedValue &&
    candidateStartedValue >= previousEndedValue &&
    candidateStartedValue < updatedEndedValue
  ) {
    conflictTypes.push("starts_inside_extended_corrected_interval");
    suggestedStartedAt = updatedEndedAt;
  }

  if (
    previousEndedValue !== null &&
    updatedEndedValue < previousEndedValue &&
    isSameInstant(candidateStartedAt, previousEndedAt)
  ) {
    conflictTypes.push("starts_at_old_end_after_shorter_correction");
    suggestedStartedAt = updatedEndedAt;
  }

  if (
    candidateEndedValue !== null &&
    candidateStartedValue < updatedEndedValue &&
    candidateEndedValue > updatedStartedValue
  ) {
    conflictTypes.push("overlaps_corrected_event_interval");
  }

  if (
    previousEndedValue !== null &&
    updatedEndedValue > previousEndedValue &&
    candidateEndedValue !== null &&
    candidateStartedValue < updatedEndedValue &&
    candidateEndedValue > previousEndedValue
  ) {
    conflictTypes.push("overlaps_extended_part_of_corrected_event");
  }

  const uniqueConflictTypes = Array.from(new Set(conflictTypes));

  if (uniqueConflictTypes.length === 0) {
    return null;
  }

  const suggestedDurationMinutes = calculateDurationMinutes(
    suggestedStartedAt,
    suggestedEndedAt
  );

  const isSuggestedChange =
    dateValuesDiffer(suggestedStartedAt, candidateStartedAt) ||
    dateValuesDiffer(suggestedEndedAt, candidateEndedAt);

  let severity: TimelineConflictSeverity = isSuggestedChange
    ? "warning"
    : "info";

  if (
    isSuggestedChange &&
    suggestedDurationMinutes !== null &&
    suggestedDurationMinutes <= 0
  ) {
    severity = "blocking";
  }

  const explanation =
    severity === "blocking"
      ? "Suggested adjustment would make duration zero or negative. User must resolve manually."
      : isSuggestedChange
        ? "This activity starts inside the corrected interval. UI may suggest moving its start while keeping its end as anchor."
        : "This activity overlaps the corrected interval, but no automatic suggestion is safe. User should decide whether it is parallel or needs editing.";

  return {
    eventId: candidate.id,
    title: candidate.title,
    status: candidate.status,
    processingStatus: candidate.processing_status,
    source: candidate.source,
    currentStartedAt: candidateStartedAt,
    currentEndedAt: candidateEndedAt,
    currentDurationMinutes: getDurationFromEvent(candidate),
    suggestedStartedAt,
    suggestedEndedAt,
    suggestedDurationMinutes,
    conflictTypes: uniqueConflictTypes,
    severity,
    isSuggestedChange,
    explanation,
  };
}

async function getNearbyTimelineEvents(params: {
  userId: string;
  eventId: string;
  searchRange: {
    from: string;
    to: string;
  };
}) {
  const { userId, eventId, searchRange } = params;

  const { data, error } = await supabase
    .from("activity_events")
    .select("*")
    .eq("user_id", userId)
    .neq("id", eventId)
    .not("started_at", "is", null)
    .gte("started_at", searchRange.from)
    .lte("started_at", searchRange.to)
    .order("started_at", { ascending: true })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as ActivityEventRow[] | null) ?? [];
}

async function detectTimelineConflicts(params: {
  previousEvent: ActivityEventRow;
  updatedEvent: ActivityEventRow;
  userId: string;
}): Promise<TimelineConflictDetectionResult> {
  const { previousEvent, updatedEvent, userId } = params;

  const previousDuration = getDurationFromEvent(previousEvent);
  const updatedDuration = getDurationFromEvent(updatedEvent);

  const baseResult = {
    correctedEventId: updatedEvent.id,
    previousInterval: {
      startedAt: normalizeIsoDate(previousEvent.started_at),
      endedAt: normalizeIsoDate(previousEvent.ended_at),
      durationMinutes: previousDuration,
    },
    newInterval: {
      startedAt: normalizeIsoDate(updatedEvent.started_at),
      endedAt: normalizeIsoDate(updatedEvent.ended_at),
      durationMinutes: updatedDuration,
    },
  };

  if (!dateValuesDiffer(previousEvent.ended_at, updatedEvent.ended_at)) {
    return {
      ok: true,
      skipped: true,
      reason:
        "Corrected event ended_at did not change. Timeline conflict detection was not required.",
      ...baseResult,
      summary: {
        candidatesCount: 0,
        suggestedChangesCount: 0,
        blockingCandidatesCount: 0,
      },
      candidates: [],
    };
  }

  const searchRange = resolveTimelineSearchRange({
    previousEvent,
    updatedEvent,
  });

  if (!searchRange) {
    return {
      ok: true,
      skipped: true,
      reason:
        "Could not resolve a reliable search range for timeline conflict detection.",
      ...baseResult,
      summary: {
        candidatesCount: 0,
        suggestedChangesCount: 0,
        blockingCandidatesCount: 0,
      },
      candidates: [],
    };
  }

  const nearbyEvents = await getNearbyTimelineEvents({
    userId,
    eventId: updatedEvent.id,
    searchRange,
  });

  const candidates = nearbyEvents
    .map((candidate) =>
      buildTimelineCandidate({
        candidate,
        previousEvent,
        updatedEvent,
      })
    )
    .filter(
      (candidate): candidate is TimelineConflictCandidate =>
        candidate !== null
    );

  return {
    ok: true,
    ...baseResult,
    searchRange,
    summary: {
      candidatesCount: candidates.length,
      suggestedChangesCount: candidates.filter(
        (candidate) => candidate.isSuggestedChange
      ).length,
      blockingCandidatesCount: candidates.filter(
        (candidate) => candidate.severity === "blocking"
      ).length,
    },
    candidates,
  };
}

async function safeDetectTimelineConflicts(params: {
  previousEvent: ActivityEventRow;
  updatedEvent: ActivityEventRow;
  userId: string;
}): Promise<TimelineConflictDetectionResult> {
  const { previousEvent, updatedEvent, userId } = params;

  try {
    return await detectTimelineConflicts({
      previousEvent,
      updatedEvent,
      userId,
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to detect timeline conflicts.",
      correctedEventId: updatedEvent.id,
      previousInterval: {
        startedAt: normalizeIsoDate(previousEvent.started_at),
        endedAt: normalizeIsoDate(previousEvent.ended_at),
        durationMinutes: getDurationFromEvent(previousEvent),
      },
      newInterval: {
        startedAt: normalizeIsoDate(updatedEvent.started_at),
        endedAt: normalizeIsoDate(updatedEvent.ended_at),
        durationMinutes: getDurationFromEvent(updatedEvent),
      },
      summary: {
        candidatesCount: 0,
        suggestedChangesCount: 0,
        blockingCandidatesCount: 0,
      },
      candidates: [],
    };
  }
}

function resolveCorrectionTiming(params: {
  event: ActivityEventRow;
  body: CorrectionPatchBody;
}): ResolvedCorrectionTiming {
  const { event, body } = params;

  const hasStartedAtPatch =
    hasOwnProperty(body, "startedAt") || hasOwnProperty(body, "startTime");

  const hasEndedAtPatch =
    hasOwnProperty(body, "endedAt") || hasOwnProperty(body, "endTime");

  const hasDurationPatch = hasOwnProperty(body, "durationMinutes");

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
  if (changedFields.includes("status")) {
    return "status_rollback";
  }

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

async function collectPreviousAuditState(params: {
  event: ActivityEventRow;
  userId: string;
}) {
  const { event, userId } = params;
  const previousAggregateDate = resolveAggregateDateForAudit(event.started_at);

  const previousImpactEvents = await getImpactEventsForAudit(event.id);
  const previousDailyAggregates = await getDailyAggregatesForAudit({
    userId,
    aggregateDate: previousAggregateDate,
  });
  const previousCurrentSnapshots = await getCurrentSnapshotsForAudit({
    userId,
    eventId: event.id,
  });

  return {
    previousAggregateDate,
    previousImpactEvents,
    previousDailyAggregates,
    previousCurrentSnapshots,
  };
}

async function markCorrectionAuditFailure(params: {
  event: ActivityEventRow;
  userId: string;
  correctionFlow: string;
  correctionStage: string;
  correctionError: string;
}): Promise<AuditFailureRecoveryResult> {
  const {
    event,
    userId,
    correctionFlow,
    correctionStage,
    correctionError,
  } = params;

  const nowIso = new Date().toISOString();
  const existingMetadata = asRecord(event.metadata_json);

  const { data, error } = await supabase
    .from("activity_events")
    .update({
      metadata_json: {
        ...existingMetadata,
        correction_audit_failed: true,
        correction_audit_failed_at: nowIso,
        correction_audit_error: correctionError,
        correction_audit_stage: correctionStage,
        correction_audit_manual_review_required: true,
        correction_audit_recovery_flow: "B11.4.1",
        correction_flow: correctionFlow,
      },
      updated_at: nowIso,
    })
    .eq("id", event.id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    return {
      ok: false,
      error: error.message,
      event: null,
    };
  }

  return {
    ok: true,
    error: null,
    event: data as ActivityEventRow,
  };
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
      status: Array.from(ROLLBACK_ONLY_STATUSES),
      reason: "string",
    },
    timelineConflictDetection: {
      status: "B12.6.1",
      behavior:
        "After timing/duration correction, the route returns timeline.candidates but does not modify neighboring events automatically.",
    },
    currentLimit:
      "B11.3a supports completed event timing/duration/comment corrections. B11.3b supports rollback-only status corrections for completed events. B11.4.1 adds metadata recovery when correction audit insert fails after partial success. B12.6.1 adds read-only timeline conflict detection after corrections.",
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

  const requestedStatus = asString(body.status);
  const isRollbackOnlyStatus =
    requestedStatus !== null && ROLLBACK_ONLY_STATUSES.has(requestedStatus);

  if (
    requestedStatus &&
    requestedStatus !== "completed" &&
    !isRollbackOnlyStatus
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported status correction.",
        requestedStatus,
        supportedRollbackOnlyStatuses: Array.from(ROLLBACK_ONLY_STATUSES),
        supportedNormalStatus: "completed",
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

  const reason = asString(body.reason);
  const hasCommentPatch = hasOwnProperty(body, "comment");
  const patchedComment = hasCommentPatch
    ? asString(body.comment)
    : previousEvent.description;

  if (isRollbackOnlyStatus && requestedStatus) {
    if (previousEvent.status !== "completed") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Rollback-only status correction is currently supported only from completed events.",
          currentStatus: previousEvent.status,
          requestedStatus,
        },
        { status: 409 }
      );
    }

    const forbiddenMixedFields = [
      hasOwnProperty(body, "durationMinutes") ? "durationMinutes" : null,
      hasOwnProperty(body, "startedAt") ? "startedAt" : null,
      hasOwnProperty(body, "startTime") ? "startTime" : null,
      hasOwnProperty(body, "endedAt") ? "endedAt" : null,
      hasOwnProperty(body, "endTime") ? "endTime" : null,
    ].filter(Boolean);

    if (forbiddenMixedFields.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "B11.3b status rollback should not be mixed with timing or duration corrections. Do timing/duration correction first, then status rollback.",
          forbiddenMixedFields,
        },
        { status: 400 }
      );
    }

    const changedFields = ["status"];

    if (
      hasCommentPatch &&
      valuesDiffer(patchedComment, previousEvent.description)
    ) {
      changedFields.push("description");
    }

    let auditState: {
      previousAggregateDate: string;
      previousImpactEvents: unknown[];
      previousDailyAggregates: unknown[];
      previousCurrentSnapshots: unknown[];
    };

    try {
      auditState = await collectPreviousAuditState({
        event: previousEvent,
        userId: appUser.id,
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
        status: requestedStatus,
        description: patchedComment,
        processing_status: "processed",
        metadata_json: {
          ...existingMetadata,
          corrected: true,
          impact_rollback: true,
          impact_rollback_at: nowIso,
          last_correction_at: nowIso,
          last_correction_reason: reason,
          last_correction_changed_fields: changedFields,
          previous_status: previousEvent.status,
          correction_flow: "B11.3b",
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

    let rollbackResult: unknown;

    try {
      rollbackResult = await rollbackActivityImpacts({
        eventId: updatedEvent.id,
        userId: appUser.id,
        previousStartedAt: previousEvent.started_at,
        timezone: DEFAULT_CORRECTION_TIMEZONE,
        reason: reason ?? "activity_event_status_rollback",
        cleanupCurrentSnapshots: true,
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
              : "Failed to rollback activity impacts.",
          previousEvent,
          updatedEvent,
        },
        { status: 500 }
      );
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
        previous_impact_events_json: auditState.previousImpactEvents,
        previous_daily_aggregates_json: auditState.previousDailyAggregates,
        previous_current_snapshots_json: auditState.previousCurrentSnapshots,
        recalculation_result_json: rollbackResult,
        reason,
        source: "api_patch",
      })
      .select()
      .single();

    if (correctionError) {
      const recovery = await markCorrectionAuditFailure({
        event: updatedEvent,
        userId: appUser.id,
        correctionFlow: "B11.3b",
        correctionStage: "status_rollback_audit_insert",
        correctionError: correctionError.message,
      });

      return NextResponse.json(
        {
          ok: false,
          error: correctionError.message,
          warning:
            "Activity event status was updated and impacts were rolled back, but correction audit row was not created. Recovery metadata was written to the activity event when possible.",
          previousEvent,
          updatedEvent,
          rollbackResult,
          recovery,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: "status_corrected",
      event: updatedEvent,
      correction: correctionRow,
      changedFields,
      rollback: rollbackResult,
      timeline: {
        ok: true,
        skipped: true,
        reason:
          "Timeline conflict detection is skipped for rollback-only status corrections.",
        correctedEventId: updatedEvent.id,
        previousInterval: {
          startedAt: normalizeIsoDate(previousEvent.started_at),
          endedAt: normalizeIsoDate(previousEvent.ended_at),
          durationMinutes: getDurationFromEvent(previousEvent),
        },
        newInterval: {
          startedAt: normalizeIsoDate(updatedEvent.started_at),
          endedAt: normalizeIsoDate(updatedEvent.ended_at),
          durationMinutes: getDurationFromEvent(updatedEvent),
        },
        summary: {
          candidatesCount: 0,
          suggestedChangesCount: 0,
          blockingCandidatesCount: 0,
        },
        candidates: [],
      },
      audit: {
        previousImpactEventsCount: auditState.previousImpactEvents.length,
        previousDailyAggregatesCount: auditState.previousDailyAggregates.length,
        previousCurrentSnapshotsCount:
          auditState.previousCurrentSnapshots.length,
        previousAggregateDate: auditState.previousAggregateDate,
      },
    });
  }

  if (previousEvent.status !== "completed") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "B11.3a correction route only supports completed events. Rollback-only status corrections are supported only from completed events.",
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

  let auditState: {
    previousAggregateDate: string;
    previousImpactEvents: unknown[];
    previousDailyAggregates: unknown[];
    previousCurrentSnapshots: unknown[];
  };

  try {
    auditState = await collectPreviousAuditState({
      event: previousEvent,
      userId: appUser.id,
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

  const timeline = shouldRecalculate
    ? await safeDetectTimelineConflicts({
        previousEvent,
        updatedEvent,
        userId: appUser.id,
      })
    : {
        ok: true,
        skipped: true,
        reason:
          "Timeline conflict detection was skipped because correction did not change timing or duration.",
        correctedEventId: updatedEvent.id,
        previousInterval: {
          startedAt: normalizeIsoDate(previousEvent.started_at),
          endedAt: normalizeIsoDate(previousEvent.ended_at),
          durationMinutes: getDurationFromEvent(previousEvent),
        },
        newInterval: {
          startedAt: normalizeIsoDate(updatedEvent.started_at),
          endedAt: normalizeIsoDate(updatedEvent.ended_at),
          durationMinutes: getDurationFromEvent(updatedEvent),
        },
        summary: {
          candidatesCount: 0,
          suggestedChangesCount: 0,
          blockingCandidatesCount: 0,
        },
        candidates: [],
      };

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
      previous_impact_events_json: auditState.previousImpactEvents,
      previous_daily_aggregates_json: auditState.previousDailyAggregates,
      previous_current_snapshots_json: auditState.previousCurrentSnapshots,
      recalculation_result_json: recalculationResult,
      reason,
      source: "api_patch",
    })
    .select()
    .single();

  if (correctionError) {
    const recovery = await markCorrectionAuditFailure({
      event: updatedEvent,
      userId: appUser.id,
      correctionFlow: "B11.3a",
      correctionStage: "correction_audit_insert",
      correctionError: correctionError.message,
    });

    return NextResponse.json(
      {
        ok: false,
        error: correctionError.message,
        warning:
          "Activity event was updated, but correction audit row was not created. Recovery metadata was written to the activity event when possible.",
        previousEvent,
        updatedEvent,
        recalculationResult,
        timeline,
        recovery,
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
    timeline,
    audit: {
      previousImpactEventsCount: auditState.previousImpactEvents.length,
      previousDailyAggregatesCount: auditState.previousDailyAggregates.length,
      previousCurrentSnapshotsCount:
        auditState.previousCurrentSnapshots.length,
      previousAggregateDate: auditState.previousAggregateDate,
    },
  });
}