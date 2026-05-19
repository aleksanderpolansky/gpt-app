import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
import { processActivityValueObjectBridge } from "../../../../../../lib/activity/activityValueObjectLifecycle";
import { safeCreateActivityProcessingLog } from "../../../../../../lib/activity/activityProcessingLogs";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type FreeTextValueObjectTestBody = {
  inputText?: unknown;
  naturalInput?: unknown;
  title?: unknown;
  description?: unknown;
  durationMinutes?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
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

function resolveTiming(body: FreeTextValueObjectTestBody) {
  const durationMinutes = asNumber(body.durationMinutes) ?? 15;

  if (durationMinutes < 0) {
    return {
      ok: false as const,
      error: "durationMinutes must be greater than or equal to 0.",
    };
  }

  const rawStartedAt = asString(body.startedAt);
  const rawEndedAt = asString(body.endedAt);

  if (rawStartedAt && rawEndedAt) {
    const startedDate = new Date(rawStartedAt);
    const endedDate = new Date(rawEndedAt);

    if (
      Number.isNaN(startedDate.getTime()) ||
      Number.isNaN(endedDate.getTime())
    ) {
      return {
        ok: false as const,
        error: "Invalid startedAt or endedAt.",
      };
    }

    if (endedDate.getTime() < startedDate.getTime()) {
      return {
        ok: false as const,
        error: "endedAt must be greater than or equal to startedAt.",
      };
    }

    return {
      ok: true as const,
      startedAt: startedDate.toISOString(),
      endedAt: endedDate.toISOString(),
      durationMinutes: Math.round(
        (endedDate.getTime() - startedDate.getTime()) / 60000
      ),
    };
  }

  if (rawStartedAt) {
    const startedDate = new Date(rawStartedAt);

    if (Number.isNaN(startedDate.getTime())) {
      return {
        ok: false as const,
        error: "Invalid startedAt.",
      };
    }

    const endedDate = new Date(startedDate.getTime() + durationMinutes * 60000);

    return {
      ok: true as const,
      startedAt: startedDate.toISOString(),
      endedAt: endedDate.toISOString(),
      durationMinutes,
    };
  }

  const endedDate = rawEndedAt ? new Date(rawEndedAt) : new Date();

  if (Number.isNaN(endedDate.getTime())) {
    return {
      ok: false as const,
      error: "Invalid endedAt.",
    };
  }

  const startedDate = new Date(endedDate.getTime() - durationMinutes * 60000);

  return {
    ok: true as const,
    startedAt: startedDate.toISOString(),
    endedAt: endedDate.toISOString(),
    durationMinutes,
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/debug/free-text-value-object-test",
    enabled: ACTIVITY_RECORDING_ENABLED,
    status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
    message: ACTIVITY_RECORDING_ENABLED
      ? "Debug-only endpoint for testing completed free-text Activity Event -> Value Object fallback mapping."
      : ACTIVITY_RECORDING_DISABLED_MESSAGE,
    example: {
      inputText: "walked to work for 15 minutes",
      durationMinutes: 15,
      title: "Walked to work",
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

  let body: FreeTextValueObjectTestBody;

  try {
    body = (await request.json()) as FreeTextValueObjectTestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  const userContext = await getActivityUserContext();
  const { appUser, personActor } = userContext;

  if (!appUser || !personActor) {
    return NextResponse.json(
      {
        ok: false,
        error: "Authenticated app user and person actor context are required.",
      },
      { status: 401 }
    );
  }
  const inputText = asString(body.inputText) ?? asString(body.naturalInput);

  if (!inputText) {
    return NextResponse.json(
      {
        ok: false,
        error: "inputText or naturalInput is required.",
      },
      { status: 400 }
    );
  }

  const timing = resolveTiming(body);

  if (!timing.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: timing.error,
      },
      { status: 400 }
    );
  }

  const processingRunId = randomUUID();
  const processingStartedAt = new Date();
  const nowIso = new Date().toISOString();

  const { data: createdEventData, error: createError } = await supabase
    .from("activity_events")
    .insert({
      user_id: appUser.id,
      performed_by_actor_id: personActor.id,
      acting_as_actor_id: personActor.id,
      acting_for_actor_id: null,
      activity_type_id: null,
      activity_template_id: null,
      template_id: null,
      event_code: null,
      input_text: inputText,
      title: asString(body.title) ?? "Free-text activity test",
      description: asString(body.description),
      started_at: timing.startedAt,
      ended_at: timing.endedAt,
      duration_minutes: timing.durationMinutes,
      source: "manual_chat",
      status: "completed",
      privacy_scope: "private",
      processing_status: "processed",
      metadata_json: {
        parser: "debug_free_text_value_object_test_v1",
        p4Step: "P4.10.0-C7",
        freeTextValueObjectTest: true,
        aiUsed: false,
        createdAt: nowIso,
      },
    })
    .select()
    .single();

  if (createError || !createdEventData) {
    return NextResponse.json(
      {
        ok: false,
        error: createError?.message ?? "Failed to create activity event.",
      },
      { status: 500 }
    );
  }

  const createdEvent = createdEventData as { id: string };

  const bridgeResult = await processActivityValueObjectBridge({
    supabase,
    eventId: createdEvent.id,
    processorName: "activity_debug_free_text_value_object_test",
    allowNonCompletedEvent: false,
  });

  const logResult = await safeCreateActivityProcessingLog({
    userId: appUser.id,
    rawSignalId: null,
    activityEventId: createdEvent.id,
    processingRunId,
    processorName: "activity_debug_free_text_value_object_test",
    processingStage: "finalize",
    processingStatus: bridgeResult.ok
      ? bridgeResult.skipped
        ? "skipped"
        : "completed"
      : "warning",
    severity: bridgeResult.ok ? "info" : "warning",
    message: "Debug free-text Value Object bridge processed.",
    input: {
      eventId: createdEvent.id,
      inputText,
      durationMinutes: timing.durationMinutes,
    },
    output: {
      ok: bridgeResult.ok,
      skipped: bridgeResult.skipped,
      skipReason: bridgeResult.skipReason,
      mappingSkipped: bridgeResult.mappingResult?.skipped ?? null,
      mappingsCount: bridgeResult.mappingResult?.mappings.length ?? 0,
      bridgeCreatedCount: bridgeResult.bridgeResult?.created.length ?? 0,
      errors: bridgeResult.errors,
    },
    metadata: {
      endpoint: "/api/activity/debug/free-text-value-object-test",
      p4Step: "P4.10.0-C7",
    },
    startedAt: processingStartedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: new Date().getTime() - processingStartedAt.getTime(),
  });

  return NextResponse.json({
    ok: bridgeResult.ok,
    status: bridgeResult.ok
      ? bridgeResult.skipped
        ? "created_but_bridge_skipped"
        : "created_and_bridge_processed"
      : "created_but_bridge_failed",
    event: createdEventData,
    valueObjectBridge: {
      ok: bridgeResult.ok,
      skipped: bridgeResult.skipped,
      skipReason: bridgeResult.skipReason,
      errors: bridgeResult.errors,
      mapping: bridgeResult.mappingResult
        ? {
            ok: bridgeResult.mappingResult.ok,
            skipped: bridgeResult.mappingResult.skipped,
            skipReason: bridgeResult.mappingResult.skipReason,
            classificationSummaryCount:
              bridgeResult.mappingResult.classificationSummary.length,
            mappingsCount: bridgeResult.mappingResult.mappings.length,
            mappings: bridgeResult.mappingResult.mappings,
          }
        : null,
      bridge: bridgeResult.bridgeResult
        ? {
            ok: bridgeResult.bridgeResult.ok,
            skipped: bridgeResult.bridgeResult.skipped,
            skipReason: bridgeResult.bridgeResult.skipReason,
            mappingsRequested: bridgeResult.bridgeResult.mappingsRequested,
            createdCount: bridgeResult.bridgeResult.created.length,
            created: bridgeResult.bridgeResult.created,
            errors: bridgeResult.bridgeResult.errors,
          }
        : null,
    },
    processingLogs: {
      processingRunId,
      valueObjectBridge: {
        ok: logResult.ok,
        error: logResult.error,
        logId: logResult.log?.id ?? null,
      },
    },
  });
}


