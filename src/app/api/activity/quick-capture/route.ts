import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";
import {
  createDurableQuickCaptureSignal,
  findDurableQuickCaptureSignalByKey,
  readDurableQuickCaptureSignal,
} from "@/lib/activity/aiLabQuickCaptureDurable.server";
import {
  buildAiLabQuickCaptureTiming,
  deriveAiLabQuickCaptureIdempotencyKey,
  type AiLabQuickCaptureRow,
} from "@/lib/activity/aiLabQuickCapture";
import {
  buildAiLabDirectActivityRequest,
  deriveAiLabActivityTitle,
} from "@/lib/activity/aiLabDirectSave";
import type { ActivityTimingLocalePp1 } from "@/lib/activity/pp1/activityTiming";
import { normalizeQuickCaptureTemporalMode } from "@/lib/activity/quickCaptureTemporalMode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const CONTRACT = "ARCTOR_AI_A3_1_REVIEW_FIRST_CAPTURE_V1";
const REQUEST_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{7,179}$/;
const IANA_TIME_ZONE_RE = /^[A-Za-z0-9_+\-/]{1,80}$/;
const MAX_INPUT_CHARS = 12_000;

type JsonRecord = Record<string, unknown>;

type SubmitBody = {
  inputText?: unknown;
  locale?: unknown;
  timeZone?: unknown;
  clientRequestId?: unknown;
  temporalDirection?: unknown;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLocale(value: unknown): ActivityTimingLocalePp1 {
  return value === "en" ||
    value === "pl" ||
    value === "ru" ||
    value === "uk" ||
    value === "de" ||
    value === "es" ||
    value === "cs"
    ? value
    : "ru";
}

function isSupportedTimeZone(value: string) {
  if (!IANA_TIME_ZONE_RE.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

async function authenticatedActivityEventCreate(input: {
  request: Request;
  body: Record<string, unknown>;
}) {
  const origin = new URL(input.request.url).origin;
  const response = await fetch(new URL("/api/activity/events", origin), {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Cookie: input.request.headers.get("cookie") ?? "",
    },
    body: JSON.stringify(input.body),
  });

  const payload = (await response.json().catch(() => null)) as JsonRecord | null;

  if (!response.ok || payload?.ok === false) {
    throw new Error(
      text(payload?.error) || `ACTIVITY_EVENT_CREATE_HTTP_${response.status}`,
    );
  }

  const activityEvent = asRecord(payload?.activityEvent ?? payload?.event);
  const activityEventId = text(activityEvent.id);

  if (!activityEventId) {
    throw new Error("AI_A3_1_REVIEW_FIRST_ACTIVITY_EVENT_ID_MISSING");
  }

  return {
    activityEventId,
    calendarEventId: text(asRecord(payload?.calendarEvent).id) || null,
  };
}

async function markReceiptProcessed(input: {
  signalId: string;
  userId: string;
  activityEventId: string;
  sourceText: string;
  locale: string;
  temporalDirection: "past" | "future";
}) {
  const reviewHref = "/activity-review";

  const result = {
    contractVersion: CONTRACT,
    signalId: input.signalId,
    sourceText: input.sourceText,
    locale: input.locale,
    requestedTemporalDirection: input.temporalDirection,
    activityEventIds: [input.activityEventId],
    reviewHref,
    warnings: [],
    factsWritten: 0,
    aiCalls: 0,
  };

  const { data: current, error: currentError } = await supabase
    .from("raw_activity_signals")
    .select("normalized_preview_json,metadata_json")
    .eq("id", input.signalId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (currentError) {
    throw new Error(
      `AI_A3_1_REVIEW_FIRST_RECEIPT_READ_FAILED:${currentError.message}`,
    );
  }

  const normalized = asRecord(current?.normalized_preview_json);
  const currentMetadata = asRecord(current?.metadata_json);

  const { error } = await supabase
    .from("raw_activity_signals")
    .update({
      processing_status: "processed",
      processing_error: null,
      output_event_id: input.activityEventId,
      normalized_preview_json: {
        ...normalized,
        reviewFirstResult: result,
      },
      metadata_json: {
        ...currentMetadata,
        contract: CONTRACT,
        durableContract: CONTRACT,
        requiresHumanReview: true,
        factsWrittenAtCapture: 0,
        aiCallsAtCapture: 0,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.signalId)
    .eq("user_id", input.userId);

  if (error) {
    throw new Error(
      `AI_A3_1_REVIEW_FIRST_RECEIPT_FINALIZE_FAILED:${error.message}`,
    );
  }

  return result;
}

async function readReviewFirstReceipt(signalId: string, userId: string) {
  const signal = await readDurableQuickCaptureSignal({ signalId, userId });
  if (!signal) return null;

  const normalized = asRecord(signal.normalized_preview_json);
  const result = asRecord(normalized.reviewFirstResult);

  const activityEventIds = Array.isArray(result.activityEventIds)
    ? result.activityEventIds
    : [];
  const hasActivityEventId = Boolean(text(activityEventIds[0]));

  return {
    signal,
    result:
      result.contractVersion === CONTRACT && hasActivityEventId
        ? result
        : null,
  };
}

export async function POST(request: Request) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();
  if (errorResponse) return errorResponse;
  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "User context not found" },
      { status: 500 },
    );
  }

  let body: SubmitBody;
  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const inputText = text(body.inputText);
  const locale = normalizeLocale(body.locale);
  const timeZone = text(body.timeZone) || "UTC";
  const clientRequestId = text(body.clientRequestId);
  const temporalDirection = normalizeQuickCaptureTemporalMode(
    body.temporalDirection,
  );

  if (!inputText || inputText.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      {
        ok: false,
        error: `inputText must contain 1-${MAX_INPUT_CHARS} characters`,
      },
      { status: 400 },
    );
  }

  if (!REQUEST_ID_RE.test(clientRequestId)) {
    return NextResponse.json(
      { ok: false, error: "clientRequestId is invalid" },
      { status: 400 },
    );
  }

  if (!temporalDirection) {
    return NextResponse.json(
      { ok: false, error: "temporalDirection must be past or future" },
      { status: 400 },
    );
  }

  if (!isSupportedTimeZone(timeZone)) {
    return NextResponse.json(
      { ok: false, error: "timeZone is invalid" },
      { status: 400 },
    );
  }

  const idempotencyKey = `activity_ai_lab_quick_capture:${clientRequestId}`;

  let signal = await findDurableQuickCaptureSignalByKey({
    userId: appUser.id,
    idempotencyKey,
  });

  if (signal) {
    const existing = await readReviewFirstReceipt(signal.id, appUser.id);
    if (existing?.result) {
      return NextResponse.json({
        ok: true,
        accepted: true,
        duplicate: true,
        signalId: signal.id,
        processingStatus: "processed",
        result: existing.result,
        note:
          "Activity was already captured. No AI analysis and no fact write run at capture.",
      });
    }
  }

  if (!signal) {
    const created = await createDurableQuickCaptureSignal({
      userId: appUser.id,
      actorId: personActor.id,
      clientRequestId,
      inputText,
      locale,
      timeZone,
      temporalDirection,
      reportedAt: new Date().toISOString(),
    });

    if (!created.signal) {
      signal = await findDurableQuickCaptureSignalByKey({
        userId: appUser.id,
        idempotencyKey,
      });

      if (!signal) {
        return NextResponse.json(
          {
            ok: false,
            error:
              created.error || "Could not persist durable activity receipt",
          },
          { status: 500 },
        );
      }
    } else {
      signal = created.signal;
    }
  }

  try {
    const reportedAt = new Date().toISOString();
    const syntheticRow: AiLabQuickCaptureRow = {
      segmentId: "capture_1",
      sourceFragment: inputText,
      facts: [],
      temporal: {
        occurredAtIso: null,
        occurredAtRaw: null,
        temporalPrecision: "unknown",
      },
    };

    const timing = buildAiLabQuickCaptureTiming({
      row: syntheticRow,
      sourceText: inputText,
      locale,
      reportedAt,
      timeZone,
      temporalDirectionOverride: temporalDirection,
    });

    const baseRequest = buildAiLabDirectActivityRequest({
      idempotencyKey: deriveAiLabQuickCaptureIdempotencyKey({
        operationId: signal.id,
        segmentId: "capture_1",
        index: 0,
      }),
      temporalDirection,
      rawText: inputText,
      title: deriveAiLabActivityTitle(inputText, []),
      locale,
      timingLabel: timing.timingLabel,
      analysisOperationId: null,
      manualFeedbackIds: [],
      durationMinutes: timing.durationMinutes,
      observedDate: timing.observedDate,
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      scheduleModeCode: timing.draft.scheduleModeCode,
      scheduledDate: timing.draft.scheduledDate || null,
      scheduleStartDate: timing.draft.scheduleStartDate || null,
      scheduleEndDate: timing.draft.scheduleEndDate || null,
      deadlineAt: timing.deadlineAt,
      plannedTargetValueObjectIds: [],
    });

    const baseMetadata = asRecord(baseRequest.metadata);

    const requestBody = {
      ...baseRequest,
      metadata: {
        ...baseMetadata,
        sourceSurface: "activity_ai_lab",
        directSaveContract: CONTRACT,
        quickCaptureContract: CONTRACT,
        quickCaptureReviewRequired: true,
        quickCaptureReviewStatus: "pending",
        quickCaptureSourceMessageText: inputText,
        quickCaptureSourceSegmentId: "capture_1",
        quickCaptureSourceSignalId: signal.id,
        locale,
        timeZone,
        temporalDirection,
        factsWrittenAtCapture: 0,
        aiCallsAtCapture: 0,
        factMaterializationPolicy: "after_semantic_review_only",
      },
    };

    const createdEvent = await authenticatedActivityEventCreate({
      request,
      body: requestBody,
    });

    const result = await markReceiptProcessed({
      signalId: signal.id,
      userId: appUser.id,
      activityEventId: createdEvent.activityEventId,
      sourceText: inputText,
      locale,
      temporalDirection,
    });

    return NextResponse.json({
      ok: true,
      accepted: true,
      duplicate: false,
      signalId: signal.id,
      processingStatus: "processed",
      result,
      calendarEventId: createdEvent.calendarEventId,
      note:
        "Activity is saved immediately. Semantic AI analysis starts only when the review item is opened. Facts written now: 0.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await supabase
      .from("raw_activity_signals")
      .update({
        processing_status: "failed",
        processing_error: message.slice(0, 3000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", signal.id)
      .eq("user_id", appUser.id);

    return NextResponse.json(
      {
        ok: false,
        accepted: true,
        signalId: signal.id,
        processingStatus: "failed",
        error: message,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();
  if (errorResponse) return errorResponse;
  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "User context not found" },
      { status: 500 },
    );
  }

  const signalId = text(new URL(request.url).searchParams.get("signalId"));

  if (!signalId) {
    return NextResponse.json(
      { ok: false, error: "signalId is required" },
      { status: 400 },
    );
  }

  const receipt = await readReviewFirstReceipt(signalId, appUser.id);

  if (!receipt) {
    return NextResponse.json(
      { ok: false, error: "Quick capture receipt not found" },
      { status: 404 },
    );
  }

  if (receipt.result) {
    return NextResponse.json({
      ok: true,
      signalId,
      processingStatus: "processed",
      processingError: null,
      result: receipt.result,
    });
  }

  return NextResponse.json({
    ok: true,
    signalId,
    processingStatus: receipt.signal.processing_status,
    processingError: receipt.signal.processing_error,
    result: null,
  });
}
