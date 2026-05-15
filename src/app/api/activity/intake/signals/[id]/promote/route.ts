import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../../../../lib/activity/activityUserContext";
import { decideActivityIntake } from "../../../../../../../../lib/activity/activitySourceIntake";
import {
  markRawActivitySignalProcessed,
  type RawActivitySignalRow,
} from "../../../../../../../../lib/activity/rawActivitySignals";
import { supabase } from "../../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PromoteRawSignalBody = {
  title?: unknown;
  comment?: unknown;
  description?: unknown;
  startedAt?: unknown;
  startTime?: unknown;
  endedAt?: unknown;
  endTime?: unknown;
  durationMinutes?: unknown;
  reviewNote?: unknown;
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
  duration_minutes: number | null;
  source: string | null;
  status: string;
  privacy_scope: string | null;
  processing_status: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type ResolvedPromotedTiming =
  | {
      ok: true;
      startedAt: string | null;
      endedAt: string | null;
      durationMinutes: number | null;
    }
  | {
      ok: false;
      error: string;
    };

const ENDPOINT = "/api/activity/intake/signals/[id]/promote";
const PROMOTED_ACTIVITY_STATUS = "imported_pending";
const PROMOTED_PROCESSING_STATUS = "pending";

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

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getRecord(
  object: Record<string, unknown>,
  key: string
): Record<string, unknown> {
  return asRecord(object[key]);
}

function normalizeOptionalIsoDate(value: unknown) {
  const rawValue = asString(value);

  if (!rawValue) {
    return null;
  }

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function calculateDurationMinutes(startedAt: string | null, endedAt: string | null) {
  if (!startedAt || !endedAt) {
    return null;
  }

  const startedDate = new Date(startedAt);
  const endedDate = new Date(endedAt);

  if (
    Number.isNaN(startedDate.getTime()) ||
    Number.isNaN(endedDate.getTime())
  ) {
    return null;
  }

  return Math.round((endedDate.getTime() - startedDate.getTime()) / 60000);
}

function summarizeRawSignal(rawSignal: RawActivitySignalRow) {
  return {
    id: rawSignal.id,
    sourceType: rawSignal.source_type,
    sourceEventId: rawSignal.source_event_id,
    idempotencyKey: rawSignal.idempotency_key,
    trustLevel: rawSignal.trust_level,
    privacyScope: rawSignal.privacy_scope,
    processingStatus: rawSignal.processing_status,
    processingError: rawSignal.processing_error,
    outputEventId: rawSignal.output_event_id,
    occurredAt: rawSignal.occurred_at,
    measuredAt: rawSignal.measured_at,
    receivedAt: rawSignal.received_at,
    createdAt: rawSignal.created_at,
    updatedAt: rawSignal.updated_at,
  };
}

function summarizeActivityEvent(event: ActivityEventRow) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    source: event.source,
    status: event.status,
    processingStatus: event.processing_status,
    privacyScope: event.privacy_scope,
    startedAt: event.started_at,
    endedAt: event.ended_at,
    durationMinutes: event.duration_minutes,
    activityTypeId: event.activity_type_id,
    activityTemplateId: event.activity_template_id,
    templateId: event.template_id,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
}

function resolvePromotedTiming(params: {
  body: PromoteRawSignalBody;
  rawSignal: RawActivitySignalRow;
  payload: Record<string, unknown>;
}): ResolvedPromotedTiming {
  const { body, rawSignal, payload } = params;

  const startedAt =
    normalizeOptionalIsoDate(body.startedAt) ??
    normalizeOptionalIsoDate(body.startTime) ??
    normalizeOptionalIsoDate(payload.startedAt) ??
    normalizeOptionalIsoDate(payload.startTime) ??
    rawSignal.occurred_at ??
    rawSignal.measured_at ??
    null;

  const endedAt =
    normalizeOptionalIsoDate(body.endedAt) ??
    normalizeOptionalIsoDate(body.endTime) ??
    normalizeOptionalIsoDate(payload.endedAt) ??
    normalizeOptionalIsoDate(payload.endTime) ??
    null;

  const explicitDurationMinutes =
    asNumber(body.durationMinutes) ??
    asNumber(payload.durationMinutes) ??
    asNumber(payload.duration_minutes);

  if (explicitDurationMinutes !== null && explicitDurationMinutes < 0) {
    return {
      ok: false,
      error: "durationMinutes must be greater than or equal to 0.",
    };
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

    return {
      ok: true,
      startedAt,
      endedAt,
      durationMinutes: calculateDurationMinutes(startedAt, endedAt),
    };
  }

  if (startedAt && explicitDurationMinutes !== null && !endedAt) {
    const startedDate = new Date(startedAt);

    return {
      ok: true,
      startedAt,
      endedAt: new Date(
        startedDate.getTime() + explicitDurationMinutes * 60000
      ).toISOString(),
      durationMinutes: explicitDurationMinutes,
    };
  }

  if (!startedAt && endedAt && explicitDurationMinutes !== null) {
    const endedDate = new Date(endedAt);

    return {
      ok: true,
      startedAt: new Date(
        endedDate.getTime() - explicitDurationMinutes * 60000
      ).toISOString(),
      endedAt,
      durationMinutes: explicitDurationMinutes,
    };
  }

  return {
    ok: true,
    startedAt,
    endedAt,
    durationMinutes: explicitDurationMinutes,
  };
}

function resolvePromotedTitle(params: {
  body: PromoteRawSignalBody;
  rawSignal: RawActivitySignalRow;
  payload: Record<string, unknown>;
  normalizedPreview: Record<string, unknown>;
}) {
  const { body, rawSignal, payload, normalizedPreview } = params;

  return (
    asString(body.title) ??
    asString(payload.title) ??
    asString(payload.name) ??
    asString(normalizedPreview.title) ??
    `Imported ${rawSignal.source_type} activity signal`
  );
}

function resolvePromotedDescription(params: {
  body: PromoteRawSignalBody;
  payload: Record<string, unknown>;
}) {
  const { body, payload } = params;

  return (
    asString(body.comment) ??
    asString(body.description) ??
    asString(payload.comment) ??
    asString(payload.description) ??
    asString(payload.note)
  );
}

function buildInputText(params: {
  rawSignal: RawActivitySignalRow;
  title: string;
}) {
  const { rawSignal, title } = params;

  return [
    title,
    `rawSignal:${rawSignal.id}`,
    rawSignal.source_type,
    rawSignal.source_event_id ? `sourceEvent:${rawSignal.source_event_id}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

async function getRawSignal(params: { rawSignalId: string; userId: string }) {
  const { rawSignalId, userId } = params;

  const { data, error } = await supabase
    .from("raw_activity_signals")
    .select("*")
    .eq("id", rawSignalId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as RawActivitySignalRow | null) ?? null;
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

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: ENDPOINT,
    method: "POST",
    enabled: ACTIVITY_RECORDING_ENABLED,
    status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
    message: ACTIVITY_RECORDING_ENABLED
      ? "Promote one raw activity signal into an imported_pending activity_event without creating impacts."
      : ACTIVITY_RECORDING_DISABLED_MESSAGE,
    behavior: {
      createsActivityEvent: true,
      activityStatus: PROMOTED_ACTIVITY_STATUS,
      activityProcessingStatus: PROMOTED_PROCESSING_STATUS,
      createsImpacts: false,
      createsDailyAggregates: false,
      createsCurrentSnapshots: false,
      duplicatePromotion:
        "If the raw signal already has output_event_id, the existing event is returned.",
    },
    example: {
      title: "Imported external activity",
      comment: "Needs review before completion",
      durationMinutes: 10,
      reviewNote: "Promoted from raw API signal",
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  if (!ACTIVITY_RECORDING_ENABLED) {
    return NextResponse.json(
      {
        ok: false,
        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
      },
      { status: 503 }
    );
  }

  const { appUser, personActor, errorResponse } =
    await getActivityUserContext();

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
  const rawSignalId = params.id?.trim();

  if (!rawSignalId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Raw activity signal id is required.",
      },
      { status: 400 }
    );
  }

  let body: PromoteRawSignalBody = {};

  try {
    const rawText = await request.text();

    if (rawText.trim().length > 0) {
      body = JSON.parse(rawText) as PromoteRawSignalBody;
    }
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  let rawSignal: RawActivitySignalRow | null;

  try {
    rawSignal = await getRawSignal({
      rawSignalId,
      userId: appUser.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load raw activity signal.",
      },
      { status: 500 }
    );
  }

  if (!rawSignal) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: "Raw activity signal not found or access denied.",
      },
      { status: 404 }
    );
  }

  if (rawSignal.output_event_id) {
    const existingEvent = await getActivityEvent({
      eventId: rawSignal.output_event_id,
      userId: appUser.id,
    });

    if (!existingEvent) {
      return NextResponse.json(
        {
          ok: false,
          endpoint: ENDPOINT,
          error:
            "Raw signal already has output_event_id, but the linked activity event was not found.",
          rawSignal: summarizeRawSignal(rawSignal),
          activityEvent: null,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: "already_promoted",
      endpoint: ENDPOINT,
      rawSignal: summarizeRawSignal(rawSignal),
      activityEvent: summarizeActivityEvent(existingEvent),
      note:
        "Raw activity signal already points to an activity_event. No duplicate activity event was created.",
    });
  }

  const rawPayload = asRecord(rawSignal.raw_payload);
  const payload = getRecord(rawPayload, "payload");
  const normalizedPreview = asRecord(rawSignal.normalized_preview_json);
  const reviewNote = asString(body.reviewNote);

  const decision = decideActivityIntake({
    sourceType: rawSignal.source_type,
  });

  const timing = resolvePromotedTiming({
    body,
    rawSignal,
    payload,
  });

  if (!timing.ok) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: timing.error,
        rawSignal: summarizeRawSignal(rawSignal),
        activityEvent: null,
      },
      { status: 400 }
    );
  }

  const title = resolvePromotedTitle({
    body,
    rawSignal,
    payload,
    normalizedPreview,
  });

  const description = resolvePromotedDescription({
    body,
    payload,
  });

  const nowIso = new Date().toISOString();

  const { data: createdEventData, error: createEventError } = await supabase
    .from("activity_events")
    .insert({
      user_id: appUser.id,
      performed_by_actor_id: personActor?.id ?? null,
      acting_as_actor_id: personActor?.id ?? null,
      acting_for_actor_id: personActor?.id ?? null,
      activity_type_id: null,
      activity_template_id: null,
      template_id: null,
      event_code: null,
      input_text: buildInputText({
        rawSignal,
        title,
      }),
      title,
      description,
      started_at: timing.startedAt,
      ended_at: timing.endedAt,
      duration_minutes: timing.durationMinutes,
      source: decision.activityEventSource,
      status: PROMOTED_ACTIVITY_STATUS,
      privacy_scope: rawSignal.privacy_scope,
      processing_status: PROMOTED_PROCESSING_STATUS,
      metadata_json: {
        parser: "raw_intake_promote_v1",
        promotionFlow: "P4.2.10",
        promotedAt: nowIso,
        rawSignalId: rawSignal.id,
        rawSignalSourceType: rawSignal.source_type,
        rawSignalSourceEventId: rawSignal.source_event_id,
        rawSignalIdempotencyKey: rawSignal.idempotency_key,
        rawSignalProcessingStatusBeforePromotion:
          rawSignal.processing_status,
        activityEventSource: decision.activityEventSource,
        defaultActivityStatus: decision.defaultActivityStatus,
        promotedActivityStatus: PROMOTED_ACTIVITY_STATUS,
        requiresHumanReview: true,
        noImpactsCreated: true,
        noDailyAggregatesCreated: true,
        noCurrentSnapshotsCreated: true,
        reviewNote,
      },
      updated_at: nowIso,
    })
    .select()
    .single();

  if (createEventError || !createdEventData) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error:
          createEventError?.message ??
          "Failed to create imported_pending activity event.",
        rawSignal: summarizeRawSignal(rawSignal),
        activityEvent: null,
      },
      { status: 500 }
    );
  }

  const createdEvent = createdEventData as ActivityEventRow;

  const processedSignalResult = await markRawActivitySignalProcessed({
    signalId: rawSignal.id,
    userId: appUser.id,
    outputEventId: createdEvent.id,
    normalizedPreview: {
      promotion: {
        endpoint: ENDPOINT,
        promotionFlow: "P4.2.10",
        promotedAt: nowIso,
        activityEventId: createdEvent.id,
        activityStatus: createdEvent.status,
        activityProcessingStatus: createdEvent.processing_status,
        activityEventSource: createdEvent.source,
        noImpactsCreated: true,
      },
      originalIntake: normalizedPreview.intake ?? null,
    },
  });

  if (!processedSignalResult.ok || !processedSignalResult.signal) {
    return NextResponse.json(
      {
        ok: true,
        status: "promoted_with_raw_signal_warning",
        endpoint: ENDPOINT,
        warning:
          "Activity event was created, but raw signal could not be marked as processed.",
        rawSignalUpdateError: processedSignalResult.error,
        rawSignal: summarizeRawSignal(rawSignal),
        activityEvent: summarizeActivityEvent(createdEvent),
        impactEvents: [],
        dailyAggregates: [],
        currentSnapshots: [],
      },
      { status: 207 }
    );
  }

  return NextResponse.json({
    ok: true,
    status: "promoted_to_imported_pending",
    endpoint: ENDPOINT,
    rawSignal: summarizeRawSignal(processedSignalResult.signal),
    activityEvent: summarizeActivityEvent(createdEvent),
    impactEvents: [],
    dailyAggregates: [],
    currentSnapshots: [],
    note:
      "Raw activity signal was promoted into imported_pending activity_event. No completed activity, impacts, daily aggregates or current snapshots were created.",
  });
}
