import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../../../../lib/activity/activityUserContext";
import { processActivityImpacts } from "../../../../../../../../lib/activity/activityImpactProcessor";
import { processActivityValueObjectBridge } from "../../../../../../../../lib/activity/activityValueObjectLifecycle";
import { ensureActivityEventRubricatorClassificationForKnownTemplate } from "../../../../../../../../lib/activity/activityRubricatorClassificationLifecycle";
import { supabase } from "../../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ConfirmImportedPendingBody = {
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
  duration_minutes: number | string | null;
  source: string | null;
  status: string;
  privacy_scope: string | null;
  processing_status: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type ResolvedConfirmTiming =
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

const ENDPOINT = "/api/activity/intake/events/[id]/confirm";
const CONFIRMABLE_STATUS = "imported_pending";
const CONFIRMED_STATUS = "completed";
const CONFIRMED_PROCESSING_STATUS = "processed";

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

function hasOwnProperty(object: object, key: string) {
  return Object.prototype.hasOwnProperty.call(object, key);
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
    durationMinutes: asNumber(event.duration_minutes),
    activityTypeId: event.activity_type_id,
    activityTemplateId: event.activity_template_id,
    templateId: event.template_id,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
}

function resolveConfirmTiming(params: {
  body: ConfirmImportedPendingBody;
  event: ActivityEventRow;
}): ResolvedConfirmTiming {
  const { body, event } = params;

  const hasStartedPatch =
    hasOwnProperty(body, "startedAt") || hasOwnProperty(body, "startTime");

  const hasEndedPatch =
    hasOwnProperty(body, "endedAt") || hasOwnProperty(body, "endTime");

  const hasDurationPatch = hasOwnProperty(body, "durationMinutes");

  const rawStartedAt = hasStartedPatch
    ? asString(body.startedAt) ?? asString(body.startTime)
    : event.started_at;

  const rawEndedAt = hasEndedPatch
    ? asString(body.endedAt) ?? asString(body.endTime)
    : event.ended_at;

  const explicitDurationMinutes = hasDurationPatch
    ? asNumber(body.durationMinutes)
    : asNumber(event.duration_minutes);

  if (hasDurationPatch && explicitDurationMinutes === null) {
    return {
      ok: false,
      error: "durationMinutes must be a valid number.",
    };
  }

  if (explicitDurationMinutes !== null && explicitDurationMinutes < 0) {
    return {
      ok: false,
      error: "durationMinutes must be greater than or equal to 0.",
    };
  }

  const startedAt = normalizeOptionalIsoDate(rawStartedAt);
  const endedAt = normalizeOptionalIsoDate(rawEndedAt);

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
      ? "Confirm imported_pending activity_event into completed activity and process impacts."
      : ACTIVITY_RECORDING_DISABLED_MESSAGE,
    behavior: {
      requiredCurrentStatus: CONFIRMABLE_STATUS,
      nextStatus: CONFIRMED_STATUS,
      nextProcessingStatus: CONFIRMED_PROCESSING_STATUS,
      createsImpacts: true,
      createsDailyAggregates: true,
      createsCurrentSnapshots: true,
      alreadyCompleted:
        "If the event is already completed, endpoint returns already_confirmed and does not create a new event.",
    },
    example: {
      title: "Reviewed imported activity",
      comment: "Confirmed after review",
      durationMinutes: 10,
      reviewNote: "Confirmed imported pending activity",
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

  let body: ConfirmImportedPendingBody = {};

  try {
    const rawText = await request.text();

    if (rawText.trim().length > 0) {
      body = JSON.parse(rawText) as ConfirmImportedPendingBody;
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

  let event: ActivityEventRow | null;

  try {
    event = await getActivityEvent({
      eventId,
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
            : "Failed to load activity event.",
      },
      { status: 500 }
    );
  }

  if (!event) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: "Activity event not found or access denied.",
      },
      { status: 404 }
    );
  }

  if (event.status === CONFIRMED_STATUS) {
    try {
      const impactResult = await processActivityImpacts({
        eventId: event.id,
        userId: appUser.id,
        activityTemplateId: event.activity_template_id,
        activityTypeId: event.activity_type_id,
        durationMinutes: asNumber(event.duration_minutes),
        startedAt: event.started_at,
      });

      return NextResponse.json({
        ok: true,
        status: "already_confirmed",
        endpoint: ENDPOINT,
        activityEvent: summarizeActivityEvent(event),
        impactEvents: impactResult.impactEvents,
        dailyAggregates: impactResult.dailyAggregates,
        currentSnapshots: impactResult.currentSnapshots,
        impactProcessor: {
          ok: impactResult.ok,
          skipped: impactResult.skipped,
          reason: impactResult.reason,
          counts: impactResult.counts,
        },
        note:
          "Activity event was already completed. Duplicate impact processing was skipped if impacts already existed.",
      });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          endpoint: ENDPOINT,
          error:
            error instanceof Error
              ? error.message
              : "Failed to inspect already completed activity event.",
          activityEvent: summarizeActivityEvent(event),
        },
        { status: 500 }
      );
    }
  }

  if (event.status !== CONFIRMABLE_STATUS) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: `Activity event status '${event.status}' cannot be confirmed by this endpoint.`,
        currentStatus: event.status,
        requiredStatus: CONFIRMABLE_STATUS,
        activityEvent: summarizeActivityEvent(event),
      },
      { status: 409 }
    );
  }

  const timing = resolveConfirmTiming({
    body,
    event,
  });

  if (!timing.ok) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: timing.error,
        activityEvent: summarizeActivityEvent(event),
      },
      { status: 400 }
    );
  }

  const title = asString(body.title) ?? event.title;
  const description =
    asString(body.comment) ??
    asString(body.description) ??
    event.description;

  const reviewNote = asString(body.reviewNote);
  const nowIso = new Date().toISOString();
  const existingMetadata = asRecord(event.metadata_json);

  const { data: updatedEventData, error: updateError } = await supabase
    .from("activity_events")
    .update({
      title,
      description,
      started_at: timing.startedAt,
      ended_at: timing.endedAt,
      duration_minutes: timing.durationMinutes,
      status: CONFIRMED_STATUS,
      processing_status: CONFIRMED_PROCESSING_STATUS,
      metadata_json: {
        ...existingMetadata,
        confirmationFlow: "P4.2.11",
        importedPendingConfirmed: true,
        importedPendingConfirmedAt: nowIso,
        importedPendingPreviousStatus: event.status,
        reviewNote,
      },
      updated_at: nowIso,
    })
    .eq("id", event.id)
    .eq("user_id", appUser.id)
    .select()
    .single();

  if (updateError || !updatedEventData) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: updateError?.message ?? "Failed to confirm activity event.",
        activityEvent: summarizeActivityEvent(event),
      },
      { status: 500 }
    );
  }

  const updatedEvent = updatedEventData as ActivityEventRow;

  try {
    const impactResult = await processActivityImpacts({
      eventId: updatedEvent.id,
      userId: appUser.id,
      activityTemplateId: updatedEvent.activity_template_id,
      activityTypeId: updatedEvent.activity_type_id,
      durationMinutes: asNumber(updatedEvent.duration_minutes),
      startedAt: updatedEvent.started_at,
    });



    const confirmedMetadataAfterImpacts = {
      ...asRecord(updatedEvent.metadata_json),
      noImpactsCreated: impactResult.counts.impactEvents === 0,
      noDailyAggregatesCreated: impactResult.counts.dailyAggregates === 0,
      noCurrentSnapshotsCreated: impactResult.counts.currentSnapshots === 0,
      impactsCreatedAfterConfirm: impactResult.counts.impactEvents > 0,
      dailyAggregatesCreatedAfterConfirm:
        impactResult.counts.dailyAggregates > 0,
      currentSnapshotsCreatedAfterConfirm:
        impactResult.counts.currentSnapshots > 0,
      confirmImpactProcessingFlow: "P4.7.7-R-E3-D3",
      confirmImpactProcessingAt: new Date().toISOString(),
      confirmImpactCounts: impactResult.counts,
    };

    const { error: confirmMetadataUpdateError } = await supabase
      .from("activity_events")
      .update({
        metadata_json: confirmedMetadataAfterImpacts,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updatedEvent.id)
      .eq("user_id", appUser.id);

    const rubricatorClassificationResult =
      await ensureActivityEventRubricatorClassificationForKnownTemplate({
        supabase,
        eventId: updatedEvent.id,
        userId: appUser.id,
        activityTemplateId: updatedEvent.activity_template_id,
        processorName:
          "activity_confirm_route_known_template_rubricator_classification",
      });

    const valueObjectBridgeResult = await processActivityValueObjectBridge({
      supabase,
      eventId: updatedEvent.id,
      processorName: "activity_confirm_route_p4_7_7",
    });

    return NextResponse.json({
      ok: true,
      status: "confirmed_completed",
      endpoint: ENDPOINT,
      activityEvent: summarizeActivityEvent(updatedEvent),
      impactEvents: impactResult.impactEvents,
      dailyAggregates: impactResult.dailyAggregates,
      currentSnapshots: impactResult.currentSnapshots,
      impactProcessor: {
        ok: impactResult.ok,
        skipped: impactResult.skipped,
        reason: impactResult.reason,
        counts: impactResult.counts,
      },
      confirmMetadataUpdate: {
        ok: !confirmMetadataUpdateError,
        error: confirmMetadataUpdateError?.message ?? null,
        noImpactsCreated:
          confirmedMetadataAfterImpacts.noImpactsCreated,
        noDailyAggregatesCreated:
          confirmedMetadataAfterImpacts.noDailyAggregatesCreated,
        noCurrentSnapshotsCreated:
          confirmedMetadataAfterImpacts.noCurrentSnapshotsCreated,
        impactsCreatedAfterConfirm:
          confirmedMetadataAfterImpacts.impactsCreatedAfterConfirm,
        dailyAggregatesCreatedAfterConfirm:
          confirmedMetadataAfterImpacts.dailyAggregatesCreatedAfterConfirm,
        currentSnapshotsCreatedAfterConfirm:
          confirmedMetadataAfterImpacts.currentSnapshotsCreatedAfterConfirm,
      },
      rubricatorClassification: {
        ok: rubricatorClassificationResult.ok,
        skipped: rubricatorClassificationResult.skipped,
        skipReason: rubricatorClassificationResult.skipReason,
        ruleKey: rubricatorClassificationResult.ruleKey,
        classificationId: rubricatorClassificationResult.classificationId,
        classificationStatus:
          rubricatorClassificationResult.classificationStatus,
        created: rubricatorClassificationResult.created,
        alreadyExisted: rubricatorClassificationResult.alreadyExisted,
        errors: rubricatorClassificationResult.errors,
      },
      valueObjectBridge: {
        ok: valueObjectBridgeResult.ok,
        skipped: valueObjectBridgeResult.skipped,
        skipReason: valueObjectBridgeResult.skipReason,
        errors: valueObjectBridgeResult.errors,
        mapping: valueObjectBridgeResult.mappingResult
          ? {
              ok: valueObjectBridgeResult.mappingResult.ok,
              skipped: valueObjectBridgeResult.mappingResult.skipped,
              skipReason: valueObjectBridgeResult.mappingResult.skipReason,
              classificationSummaryCount:
                valueObjectBridgeResult.mappingResult.classificationSummary
                  .length,
              mappingsCount:
                valueObjectBridgeResult.mappingResult.mappings.length,
            }
          : null,
        bridge: valueObjectBridgeResult.bridgeResult
          ? {
              ok: valueObjectBridgeResult.bridgeResult.ok,
              skipped: valueObjectBridgeResult.bridgeResult.skipped,
              skipReason: valueObjectBridgeResult.bridgeResult.skipReason,
              mappingsRequested:
                valueObjectBridgeResult.bridgeResult.mappingsRequested,
              createdCount:
                valueObjectBridgeResult.bridgeResult.created.length,
              created: valueObjectBridgeResult.bridgeResult.created,
              errors: valueObjectBridgeResult.bridgeResult.errors,
            }
          : null,
      },
      note:
        "Imported pending activity_event was confirmed into completed status. Rule-based impacts were processed when matching rules were available.",
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
        endpoint: ENDPOINT,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process impacts after confirming imported activity.",
        activityEvent: summarizeActivityEvent(updatedEvent),
      },
      { status: 500 }
    );
  }
}



