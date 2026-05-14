import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../lib/activity/activityRecordingConfig";
import {
  ACTIVITY_COMPLETABLE_STATUSES,
  ACTIVITY_STATUS_COMPLETED,
  canTransitionActivityStatus,
  isCompletableActivityStatus,
} from "../../../../../lib/activity/activityLifecycle";
import {
  getDurationMs,
  safeCreateActivityProcessingLog,
} from "../../../../../lib/activity/activityProcessingLogs";
import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { processActivityImpacts } from "../../../../../lib/activity/activityImpactProcessor";
import {
  createRawActivitySignal,
  markRawActivitySignalFailed,
  markRawActivitySignalProcessed,
} from "../../../../../lib/activity/rawActivitySignals";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type ActivityCompleteBody = {
  eventId?: unknown;
  endedAt?: unknown;
  endTime?: unknown;
  durationMinutes?: unknown;
  comment?: unknown;
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

type CompletionTiming =
  | {
      ok: true;
      startedAt: string;
      endedAt: string;
      durationMinutes: number;
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

function resolveCompletionTiming(params: {
  event: ActivityEventRow;
  body: ActivityCompleteBody;
}): CompletionTiming {
  const { event, body } = params;

  if (!event.started_at) {
    return {
      ok: false,
      error: "Cannot complete activity event without started_at.",
    };
  }

  const startedDate = new Date(event.started_at);

  if (Number.isNaN(startedDate.getTime())) {
    return {
      ok: false,
      error: "Stored started_at is invalid.",
    };
  }

  const rawEndedAt = asString(body.endedAt) ?? asString(body.endTime);
  const explicitDurationMinutes = asNumber(body.durationMinutes);

  if (explicitDurationMinutes !== null && explicitDurationMinutes < 0) {
    return {
      ok: false,
      error: "durationMinutes must be greater than or equal to 0.",
    };
  }

  if (rawEndedAt) {
    const endedDate = new Date(rawEndedAt);

    if (Number.isNaN(endedDate.getTime())) {
      return {
        ok: false,
        error: "Invalid endedAt or endTime.",
      };
    }

    if (endedDate.getTime() < startedDate.getTime()) {
      return {
        ok: false,
        error: "endedAt must be greater than or equal to startedAt.",
      };
    }

    return {
      ok: true,
      startedAt: startedDate.toISOString(),
      endedAt: endedDate.toISOString(),
      durationMinutes: Math.round(
        (endedDate.getTime() - startedDate.getTime()) / 60000
      ),
    };
  }

  if (explicitDurationMinutes !== null) {
    const endedDate = new Date(
      startedDate.getTime() + explicitDurationMinutes * 60000
    );

    return {
      ok: true,
      startedAt: startedDate.toISOString(),
      endedAt: endedDate.toISOString(),
      durationMinutes: explicitDurationMinutes,
    };
  }

  const endedDate = new Date();

  if (endedDate.getTime() < startedDate.getTime()) {
    return {
      ok: false,
      error: "Current time is earlier than startedAt.",
    };
  }

  return {
    ok: true,
    startedAt: startedDate.toISOString(),
    endedAt: endedDate.toISOString(),
    durationMinutes: Math.round(
      (endedDate.getTime() - startedDate.getTime()) / 60000
    ),
  };
}

async function getExistingImpactEventsCount(eventId: string) {
  const { count, error } = await supabase
    .from("impact_events")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("event_id", eventId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/complete",
    method: "POST",
    enabled: ACTIVITY_RECORDING_ENABLED,
    status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
    message: ACTIVITY_RECORDING_ENABLED
      ? "Complete a previously started activity event and process rule-based impacts."
      : ACTIVITY_RECORDING_DISABLED_MESSAGE,
    example: {
      eventId: "activity-event-uuid",
      comment: "Completed lifecycle smoke test",
    },
    deterministicTestExample: {
      eventId: "activity-event-uuid",
      durationMinutes: 5,
      comment: "Completed lifecycle smoke test with fixed duration",
    },
  });
}

export async function POST(request: Request) {
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

  let body: ActivityCompleteBody;

  try {
    body = (await request.json()) as ActivityCompleteBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body",
      },
      { status: 400 }
    );
  }

  const eventId = asString(body.eventId);

  if (!eventId) {
    return NextResponse.json(
      {
        ok: false,
        error: "eventId is required.",
      },
      { status: 400 }
    );
  }

  const { data: eventData, error: eventError } = await supabase
    .from("activity_events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", appUser.id)
    .maybeSingle();

  if (eventError) {
    return NextResponse.json(
      {
        ok: false,
        error: eventError.message,
      },
      { status: 500 }
    );
  }

  if (!eventData) {
    return NextResponse.json(
      {
        ok: false,
        error: "Activity event not found or access denied.",
      },
      { status: 404 }
    );
  }

  const event = eventData as ActivityEventRow;
  const completedStatus = ACTIVITY_STATUS_COMPLETED;

  if (event.status === completedStatus) {
    try {
      const existingImpactEventsCount = await getExistingImpactEventsCount(
        event.id
      );

      const impactResult = await processActivityImpacts({
        eventId: event.id,
        userId: appUser.id,
        activityTemplateId: event.activity_template_id,
        activityTypeId: event.activity_type_id,
        durationMinutes: event.duration_minutes,
        startedAt: event.started_at,
      });

      return NextResponse.json({
        ok: true,
        status: "already_completed",
        event,
        impactEvents: impactResult.impactEvents,
        dailyAggregates: impactResult.dailyAggregates,
        currentSnapshots: impactResult.currentSnapshots,
        impactProcessor: {
          ok: impactResult.ok,
          skipped: impactResult.skipped,
          reason: impactResult.reason,
          counts: impactResult.counts,
          existingImpactEventsCount,
        },
        lifecycle: {
          alreadyCompleted: true,
          note:
            "Activity event was already completed. Duplicate impact processing was skipped if impacts already existed.",
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to inspect completed activity event.",
        },
        { status: 500 }
      );
    }
  }

  if (!isCompletableActivityStatus(event.status)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Activity event status '${event.status}' cannot be completed by this endpoint.`,
        allowedStatuses: Array.from(ACTIVITY_COMPLETABLE_STATUSES),
      },
      { status: 409 }
    );
  }

  const timing = resolveCompletionTiming({
    event,
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

  const comment = asString(body.comment);
  const existingMetadata = asRecord(event.metadata_json);
  const nowIso = new Date().toISOString();

  const processingRunId = randomUUID();
  const processingStartedAt = new Date();

  const rawSignalResult = await createRawActivitySignal({
    userId: appUser.id,
    sourceType: "manual_form",
    sourceEventId: event.id,
    idempotencyKey: `${event.id}:complete:${timing.endedAt}:${timing.durationMinutes}`,
    rawPayload: {
      endpoint: "/api/activity/complete",
      body,
      eventId: event.id,
      previousStatus: event.status,
      timing,
    },
    normalizedPreview: {
      activityEventId: event.id,
      title: event.title,
      previousStatus: event.status,
      nextStatus: completedStatus,
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      durationMinutes: timing.durationMinutes,
    },
    occurredAt: timing.endedAt,
    trustLevel: "medium",
    privacyScope:
      event.privacy_scope === "shared_with_org" ||
      event.privacy_scope === "public_masked" ||
      event.privacy_scope === "public"
        ? event.privacy_scope
        : "private",
    processingStatus: "processing",
    metadata: {
      parser: "template_first_v2",
      processingRunId,
      mode: "template_first_complete",
      lifecycle: completedStatus,
      previousStatus: event.status,
      activityTemplateId: event.activity_template_id,
      activityTypeId: event.activity_type_id,
    },
  });

  const rawSignal = rawSignalResult.signal;

  await safeCreateActivityProcessingLog({
    userId: appUser.id,
    rawSignalId: rawSignal?.id ?? null,
    activityEventId: event.id,
    processingRunId,
    processorName: "activity_complete_route",
    processingStage: "ingest",
    processingStatus: rawSignalResult.ok ? "completed" : "warning",
    severity: rawSignalResult.ok ? "info" : "warning",
    message: rawSignalResult.ok
      ? "Raw activity complete signal captured."
      : "Raw activity complete signal creation failed; continuing without raw signal.",
    input: {
      eventId: event.id,
      previousStatus: event.status,
      endedAt: timing.endedAt,
      durationMinutes: timing.durationMinutes,
    },
    output: rawSignal
      ? {
          rawSignalId: rawSignal.id,
        }
      : {},
    error: rawSignalResult.ok
      ? {}
      : {
          message: rawSignalResult.error,
        },
    metadata: {
      endpoint: "/api/activity/complete",
      mode: "template_first_complete",
    },
    startedAt: processingStartedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: getDurationMs(processingStartedAt),
  });

  const { data: updatedEventData, error: updateError } = await supabase
    .from("activity_events")
    .update({
      ended_at: timing.endedAt,
      duration_minutes: timing.durationMinutes,
      status: completedStatus,
      processing_status: "processed",
      description: comment ?? event.description,
      metadata_json: {
        ...existingMetadata,
        lifecycle: completedStatus,
        lifecycle_completed_at: nowIso,
        previous_status: event.status,
        completion_comment: comment,
        completion_duration_source:
          asNumber(body.durationMinutes) !== null
            ? "explicit_duration"
            : asString(body.endedAt) || asString(body.endTime)
              ? "explicit_end_time"
              : "current_time",
      },
      updated_at: nowIso,
    })
    .eq("id", event.id)
    .eq("user_id", appUser.id)
    .select()
    .single();

  if (updateError || !updatedEventData) {
    if (rawSignal) {
      await markRawActivitySignalFailed({
        signalId: rawSignal.id,
        userId: appUser.id,
        error: updateError?.message ?? "Failed to complete activity event.",
      });
    }

    await safeCreateActivityProcessingLog({
      userId: appUser.id,
      rawSignalId: rawSignal?.id ?? null,
      activityEventId: event.id,
      processingRunId,
      processorName: "activity_complete_route",
      processingStage: "complete_event",
      processingStatus: "failed",
      severity: "error",
      message: "Failed to update activity event to completed status.",
      input: {
        eventId: event.id,
        previousStatus: event.status,
        endedAt: timing.endedAt,
        durationMinutes: timing.durationMinutes,
      },
      error: {
        message: updateError?.message ?? "Failed to complete activity event.",
      },
      metadata: {
        endpoint: "/api/activity/complete",
        mode: "template_first_complete",
      },
      startedAt: processingStartedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: getDurationMs(processingStartedAt),
    });

    return NextResponse.json(
      {
        ok: false,
        error: updateError?.message ?? "Failed to complete activity event.",
      },
      { status: 500 }
    );
  }

  const updatedEvent = updatedEventData as ActivityEventRow;

  await safeCreateActivityProcessingLog({
    userId: appUser.id,
    rawSignalId: rawSignal?.id ?? null,
    activityEventId: updatedEvent.id,
    processingRunId,
    processorName: "activity_complete_route",
    processingStage: "complete_event",
    processingStatus: "completed",
    severity: "info",
    message: "Activity event completed from lifecycle complete flow.",
    input: {
      eventId: event.id,
      previousStatus: event.status,
      endedAt: timing.endedAt,
      durationMinutes: timing.durationMinutes,
    },
    output: {
      activityEventId: updatedEvent.id,
      status: updatedEvent.status,
      processingStatus: updatedEvent.processing_status,
    },
    metadata: {
      endpoint: "/api/activity/complete",
      mode: "template_first_complete",
    },
    startedAt: processingStartedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: getDurationMs(processingStartedAt),
  });

  try {
    const impactResult = await processActivityImpacts({
      eventId: updatedEvent.id,
      userId: appUser.id,
      activityTemplateId: updatedEvent.activity_template_id,
      activityTypeId: updatedEvent.activity_type_id,
      durationMinutes: updatedEvent.duration_minutes,
      startedAt: updatedEvent.started_at,
    });

    const processedSignalResult = rawSignal
      ? await markRawActivitySignalProcessed({
          signalId: rawSignal.id,
          userId: appUser.id,
          outputEventId: updatedEvent.id,
          normalizedPreview: {
            activityEventId: updatedEvent.id,
            previousStatus: event.status,
            nextStatus: updatedEvent.status,
            startedAt: timing.startedAt,
            endedAt: timing.endedAt,
            durationMinutes: timing.durationMinutes,
            impactProcessor: {
              ok: impactResult.ok,
              skipped: impactResult.skipped,
              reason: impactResult.reason,
              counts: impactResult.counts,
            },
          },
        })
      : null;

    if (processedSignalResult && !processedSignalResult.ok) {
      await safeCreateActivityProcessingLog({
        userId: appUser.id,
        rawSignalId: rawSignal?.id ?? null,
        activityEventId: updatedEvent.id,
        processingRunId,
        processorName: "activity_complete_route",
        processingStage: "finalize",
        processingStatus: "warning",
        severity: "warning",
        message: "Completed activity was processed, but raw signal could not be marked as processed.",
        error: {
          message: processedSignalResult.error,
        },
        metadata: {
          endpoint: "/api/activity/complete",
          mode: "template_first_complete",
        },
        startedAt: processingStartedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: getDurationMs(processingStartedAt),
      });
    }

    await safeCreateActivityProcessingLog({
      userId: appUser.id,
      rawSignalId: rawSignal?.id ?? null,
      activityEventId: updatedEvent.id,
      processingRunId,
      processorName: "activity_complete_route",
      processingStage: "process_impacts",
      processingStatus: impactResult.ok ? "completed" : "skipped",
      severity: impactResult.ok ? "info" : "notice",
      message: "Rule-based activity impacts processed after completion.",
      input: {
        activityTemplateId: updatedEvent.activity_template_id,
        activityTypeId: updatedEvent.activity_type_id,
        durationMinutes: updatedEvent.duration_minutes,
        startedAt: updatedEvent.started_at,
      },
      output: {
        ok: impactResult.ok,
        skipped: impactResult.skipped,
        reason: impactResult.reason,
        counts: impactResult.counts,
      },
      metadata: {
        endpoint: "/api/activity/complete",
        mode: "template_first_complete",
      },
      startedAt: processingStartedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: getDurationMs(processingStartedAt),
    });

    return NextResponse.json({
      ok: true,
      status: completedStatus,
      event: updatedEvent,
      impactEvents: impactResult.impactEvents,
      dailyAggregates: impactResult.dailyAggregates,
      currentSnapshots: impactResult.currentSnapshots,
      impactProcessor: {
        ok: impactResult.ok,
        skipped: impactResult.skipped,
        reason: impactResult.reason,
        counts: impactResult.counts,
      },
      rawSignal: rawSignal
        ? {
            id: rawSignal.id,
            processingStatus:
              processedSignalResult?.signal?.processing_status ??
              rawSignal.processing_status,
          }
        : null,
      processingRunId,
      lifecycle: {
        startedAt: timing.startedAt,
        endedAt: timing.endedAt,
        durationMinutes: timing.durationMinutes,
        impactsCreated: impactResult.counts.impactEvents > 0,
        note:
          "Activity event was completed. Rule-based impacts, daily aggregates and current snapshots were processed without AI.",
      },
    });
  } catch (error) {
    if (rawSignal) {
      await markRawActivitySignalFailed({
        signalId: rawSignal.id,
        userId: appUser.id,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process rule-based activity impacts after completion.",
      });
    }

    await safeCreateActivityProcessingLog({
      userId: appUser.id,
      rawSignalId: rawSignal?.id ?? null,
      activityEventId: updatedEvent.id,
      processingRunId,
      processorName: "activity_complete_route",
      processingStage: "process_impacts",
      processingStatus: "failed",
      severity: "error",
      message: "Failed to process rule-based activity impacts after completion.",
      input: {
        activityTemplateId: updatedEvent.activity_template_id,
        activityTypeId: updatedEvent.activity_type_id,
        durationMinutes: updatedEvent.duration_minutes,
        startedAt: updatedEvent.started_at,
      },
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to process rule-based activity impacts after completion.",
      },
      metadata: {
        endpoint: "/api/activity/complete",
        mode: "template_first_complete",
      },
      startedAt: processingStartedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: getDurationMs(processingStartedAt),
    });

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
            : "Failed to process rule-based activity impacts after completion.",
        event: updatedEvent,
      },
      { status: 500 }
    );
  }
}



