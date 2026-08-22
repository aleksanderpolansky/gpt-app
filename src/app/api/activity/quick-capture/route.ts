import { Buffer } from "node:buffer";
import crypto from "node:crypto";

import { after, NextResponse } from "next/server";

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
import {
  analyzeBasicActivityIntakeV1,
  markBasicActivityIntakeFailureV1,
} from "@/lib/activity/activity-basic-intake-analysis.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export const ARCTOR_AI_RIGHT_RAIL_BACKGROUND_REVIEW_V1 =
  "ARCTOR_AI_RIGHT_RAIL_BACKGROUND_REVIEW_V1" as const;

const CONTRACT = "ARCTOR_AI_A3_1_REVIEW_FIRST_CAPTURE_V1";
const REQUEST_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{7,179}$/;
const IANA_TIME_ZONE_RE = /^[A-Za-z0-9_+\-/]{1,80}$/;
const MAX_INPUT_CHARS = 12_000;
const ACTIVITY_EVIDENCE_BUCKET = "activity-evidence-media-v1";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function hasExpectedImageSignature(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === "image/png") {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= png.length && png.every((value, index) => bytes[index] === value);
  }

  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  return false;
}

type QuickCaptureImageEvidence = {
  kind: "image";
  storageBucket: typeof ACTIVITY_EVIDENCE_BUCKET;
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  provenance: "user_uploaded_raw_evidence";
};

type JsonRecord = Record<string, unknown>;

type SubmitBody = {
  inputText?: unknown;
  locale?: unknown;
  timeZone?: unknown;
  clientRequestId?: unknown;
  temporalDirection?: unknown;
};

type ParsedSubmitBody = {
  body: SubmitBody;
  imageFile: File | null;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function imageOnlySourceText(
  locale: ActivityTimingLocalePp1,
  temporalDirection: "past" | "future",
) {
  const values: Record<ActivityTimingLocalePp1, { past: string; future: string }> = {
    ru: { past: "Фотография завершённой активности", future: "Фотография планируемой активности" },
    en: { past: "Photo of a completed activity", future: "Photo of a planned activity" },
    pl: { past: "Zdjęcie zakończonej aktywności", future: "Zdjęcie planowanej aktywności" },
    uk: { past: "Фотографія завершеної активності", future: "Фотографія запланованої активності" },
    de: { past: "Foto einer abgeschlossenen Aktivität", future: "Foto einer geplanten Aktivität" },
    es: { past: "Foto de una actividad realizada", future: "Foto de una actividad planificada" },
    cs: { past: "Fotografie dokončené aktivity", future: "Fotografie plánované aktivity" },
  };
  return values[locale][temporalDirection];
}

async function parseSubmitBody(request: Request): Promise<ParsedSubmitBody> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const imageCandidate = formData.get("image");
    return {
      body: {
        inputText: formData.get("inputText"),
        locale: formData.get("locale"),
        timeZone: formData.get("timeZone"),
        clientRequestId: formData.get("clientRequestId"),
        temporalDirection: formData.get("temporalDirection"),
      },
      imageFile: imageCandidate instanceof File ? imageCandidate : null,
    };
  }

  return {
    body: (await request.json()) as SubmitBody,
    imageFile: null,
  };
}

function readImageEvidence(value: unknown): QuickCaptureImageEvidence | null {
  const record = asRecord(value);
  if (
    record.kind !== "image" ||
    record.storageBucket !== ACTIVITY_EVIDENCE_BUCKET ||
    typeof record.storagePath !== "string" ||
    typeof record.originalName !== "string" ||
    typeof record.mimeType !== "string" ||
    typeof record.sizeBytes !== "number" ||
    typeof record.sha256 !== "string" ||
    record.provenance !== "user_uploaded_raw_evidence"
  ) {
    return null;
  }

  return record as QuickCaptureImageEvidence;
}

async function ensurePrivateActivityEvidenceBucket() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(`ACTIVITY_EVIDENCE_BUCKET_LIST_FAILED:${listError.message}`);
  }

  const existingBucket = (buckets ?? []).find(
    (bucket) => bucket.id === ACTIVITY_EVIDENCE_BUCKET,
  );
  if (existingBucket) {
    if (existingBucket.public !== false) {
      throw new Error("ACTIVITY_EVIDENCE_BUCKET_MUST_BE_PRIVATE");
    }
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(
    ACTIVITY_EVIDENCE_BUCKET,
    {
      public: false,
      allowedMimeTypes: [...ALLOWED_IMAGE_MIME_TYPES],
      fileSizeLimit: MAX_IMAGE_BYTES,
    },
  );

  if (createError && !/already exists|duplicate/i.test(createError.message)) {
    throw new Error(`ACTIVITY_EVIDENCE_BUCKET_CREATE_FAILED:${createError.message}`);
  }
}

async function uploadActivityEvidenceImage(input: {
  file: File;
  userId: string;
  signalId: string;
}) {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(input.file.type)) {
    throw new Error("ACTIVITY_EVIDENCE_IMAGE_TYPE_UNSUPPORTED");
  }
  if (input.file.size <= 0 || input.file.size > MAX_IMAGE_BYTES) {
    throw new Error("ACTIVITY_EVIDENCE_IMAGE_SIZE_INVALID");
  }

  await ensurePrivateActivityEvidenceBucket();

  const bytes = Buffer.from(await input.file.arrayBuffer());
  if (bytes.length !== input.file.size || !hasExpectedImageSignature(bytes, input.file.type)) {
    throw new Error("ACTIVITY_EVIDENCE_IMAGE_CONTENT_INVALID");
  }

  const extension = IMAGE_EXTENSION_BY_MIME[input.file.type];
  const storagePath = `${input.userId}/${input.signalId}/${crypto.randomUUID()}.${extension}`;
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");

  const { error: uploadError } = await supabase.storage
    .from(ACTIVITY_EVIDENCE_BUCKET)
    .upload(storagePath, bytes, {
      contentType: input.file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`ACTIVITY_EVIDENCE_IMAGE_UPLOAD_FAILED:${uploadError.message}`);
  }

  return {
    kind: "image",
    storageBucket: ACTIVITY_EVIDENCE_BUCKET,
    storagePath,
    originalName: input.file.name.slice(0, 180) || "activity-image",
    mimeType: input.file.type,
    sizeBytes: input.file.size,
    sha256,
    provenance: "user_uploaded_raw_evidence",
  } satisfies QuickCaptureImageEvidence;
}

async function persistSignalImageEvidence(input: {
  signalId: string;
  userId: string;
  currentRawPayload: unknown;
  currentMetadata: unknown;
  evidence: QuickCaptureImageEvidence;
}) {
  const { error } = await supabase
    .from("raw_activity_signals")
    .update({
      raw_payload: {
        ...asRecord(input.currentRawPayload),
        imageEvidence: input.evidence,
      },
      metadata_json: {
        ...asRecord(input.currentMetadata),
        imageEvidence: input.evidence,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.signalId)
    .eq("user_id", input.userId);

  if (error) {
    throw new Error(`ACTIVITY_EVIDENCE_SIGNAL_UPDATE_FAILED:${error.message}`);
  }
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
  const reviewHref = "/activity-today";

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
        requiresHumanReview: false,
        basicIntakeAnalysisScheduled: true,
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
    primaryActivityEventId: hasActivityEventId ? text(activityEventIds[0]) : null,
    result:
      result.contractVersion === CONTRACT && hasActivityEventId
        ? result
        : null,
  };
}

function scheduleBackgroundBasicIntakeAnalysis(input: {
  appUserId: string;
  actorId: string;
  signalId: string;
  activityEventId: string;
  locale: ActivityTimingLocalePp1;
  timeZone: string;
}) {
  after(async () => {
    try {
      await analyzeBasicActivityIntakeV1({
        appUserId: input.appUserId,
        actorId: input.actorId,
        signalId: input.signalId,
        activityEventId: input.activityEventId,
        locale: input.locale,
        timeZone: input.timeZone,
      });
    } catch (error) {
      await markBasicActivityIntakeFailureV1({
        appUserId: input.appUserId,
        signalId: input.signalId,
        activityEventId: input.activityEventId,
        error,
      });
      console.error(
        "AI_RIGHT_RAIL_BASIC_INTAKE_ANALYSIS_FAILED",
        input.activityEventId,
        error,
      );
    }
  });
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

  let parsedBody: ParsedSubmitBody;
  try {
    parsedBody = await parseSubmitBody(request);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const body = parsedBody.body;
  const imageFile = parsedBody.imageFile;
  const inputText = text(body.inputText);
  const locale = normalizeLocale(body.locale);
  const timeZone = text(body.timeZone) || "UTC";
  const clientRequestId = text(body.clientRequestId);
  const temporalDirection = normalizeQuickCaptureTemporalMode(
    body.temporalDirection,
  );

  if ((!inputText && !imageFile) || inputText.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      {
        ok: false,
        error: `inputText or image is required; inputText may contain at most ${MAX_INPUT_CHARS} characters`,
      },
      { status: 400 },
    );
  }

  if (imageFile) {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(imageFile.type)) {
      return NextResponse.json(
        { ok: false, error: "Only JPEG, PNG and WebP images are supported." },
        { status: 400 },
      );
    }
    if (imageFile.size <= 0 || imageFile.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Image must be 3 MB or smaller." },
        { status: 400 },
      );
    }
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

  const sourceText = inputText || imageOnlySourceText(locale, temporalDirection);
  const idempotencyKey = `activity_ai_lab_quick_capture:${clientRequestId}`;

  let signal = await findDurableQuickCaptureSignalByKey({
    userId: appUser.id,
    idempotencyKey,
  });

  if (signal) {
    const existing = await readReviewFirstReceipt(signal.id, appUser.id);
    if (existing?.result) {
      const existingActivityEventId = existing.primaryActivityEventId;

      if (existingActivityEventId) {
        scheduleBackgroundBasicIntakeAnalysis({
          appUserId: appUser.id,
          actorId: personActor.id,
          signalId: signal.id,
          activityEventId: existingActivityEventId,
          locale,
          timeZone,
        });
      }

      return NextResponse.json({
        ok: true,
        accepted: true,
        duplicate: true,
        signalId: signal.id,
        processingStatus: "processed",
        backgroundBasicIntakeAnalysis: existingActivityEventId
          ? "scheduled"
          : "not_scheduled",
        result: existing.result,
        note: "Activity was already captured. Basic intake analysis is scheduled in the background.",
      });
    }
  }

  if (!signal) {
    const created = await createDurableQuickCaptureSignal({
      userId: appUser.id,
      actorId: personActor.id,
      clientRequestId,
      inputText: sourceText,
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

  let imageEvidence = readImageEvidence(asRecord(signal.metadata_json).imageEvidence);
  if (!imageEvidence && imageFile) {
    let uploadedEvidence: QuickCaptureImageEvidence | null = null;
    try {
      uploadedEvidence = await uploadActivityEvidenceImage({
        file: imageFile,
        userId: appUser.id,
        signalId: signal.id,
      });
      await persistSignalImageEvidence({
        signalId: signal.id,
        userId: appUser.id,
        currentRawPayload: signal.raw_payload,
        currentMetadata: signal.metadata_json,
        evidence: uploadedEvidence,
      });
      imageEvidence = uploadedEvidence;
    } catch (error) {
      if (uploadedEvidence) {
        await supabase.storage
          .from(ACTIVITY_EVIDENCE_BUCKET)
          .remove([uploadedEvidence.storagePath])
          .catch(() => null);
      }

      const message = error instanceof Error ? error.message : String(error);
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

  try {
    const reportedAt = new Date().toISOString();
    const syntheticRow: AiLabQuickCaptureRow = {
      segmentId: "capture_1",
      sourceFragment: sourceText,
      facts: [],
      temporal: {
        occurredAtIso: null,
        occurredAtRaw: null,
        temporalPrecision: "unknown",
      },
    };

    const timing = buildAiLabQuickCaptureTiming({
      row: syntheticRow,
      sourceText,
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
      rawText: sourceText,
      title: deriveAiLabActivityTitle(sourceText, []),
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
        quickCaptureReviewRequired: false,
        basicIntakeAnalysisContract: "ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1",
        quickCaptureReviewStatus: "pending",
        quickCaptureSourceMessageText: inputText || null,
        quickCaptureSourceTextKind: inputText ? "user_text" : "system_image_placeholder",
        quickCaptureImageEvidence: imageEvidence,
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
      sourceText,
      locale,
      temporalDirection,
    });

    scheduleBackgroundBasicIntakeAnalysis({
      appUserId: appUser.id,
      actorId: personActor.id,
      signalId: signal.id,
      activityEventId: createdEvent.activityEventId,
      locale,
      timeZone,
    });

    return NextResponse.json({
      ok: true,
      accepted: true,
      duplicate: false,
      signalId: signal.id,
      processingStatus: "processed",
      backgroundBasicIntakeAnalysis: "scheduled",
      result,
      calendarEventId: createdEvent.calendarEventId,
      note: "Activity is saved. Basic intake analysis is scheduled in the background. No template or facts are applied automatically.",
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
