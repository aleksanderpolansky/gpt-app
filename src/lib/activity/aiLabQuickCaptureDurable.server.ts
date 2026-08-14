import { supabase } from "../../../lib/supabase";
import { runGlobalObservationPreview } from "../../../lib/reality/globalObservationPilot";
import { buildAiLabDirectActivityRequest, deriveAiLabActivityTitle } from "@/lib/activity/aiLabDirectSave";
import { buildAiLabFactMaterializationCandidates } from "@/lib/activity/aiLabFactMaterialization";
import {
  buildAiLabQuickCaptureReviewHref,
  buildAiLabQuickCaptureReviewSnapshot,
  buildAiLabQuickCaptureSequentialTimings,
  deriveAiLabQuickCaptureIdempotencyKey,
  type AiLabQuickCapturePreview,
  type AiLabQuickCaptureRow,
} from "@/lib/activity/aiLabQuickCapture";
import { executeActivityQuickCaptureProcessingRules } from "@/lib/ai/processingRuleExecutor.server";
import { buildAiLabQuickCaptureSourceTexts } from "@/lib/activity/quickCaptureSourceText";
import { ensureActivityEventLocalizations } from "@/lib/localization/contentLocalization.server";
import type { ActivityTimingLocalePp1 } from "@/lib/activity/pp1/activityTiming";
import { normalizeQuickCaptureTemporalMode, type QuickCaptureTemporalMode } from "@/lib/activity/quickCaptureTemporalMode";

export const AI_A3_P5C_DURABLE_HANDOFF_CONTRACT =
  "AI_A3_P5C_DURABLE_HANDOFF_V1" as const;

const PROCESSING_STALE_AFTER_MS = 10 * 60_000;

type JsonRecord = Record<string, unknown>;

type DurableSignalRow = {
  id: string;
  user_id: string;
  source_type: string;
  idempotency_key: string | null;
  raw_payload: unknown;
  normalized_preview_json: unknown;
  processing_status: string;
  processing_error: string | null;
  output_event_id: string | null;
  metadata_json: unknown;
  updated_at: string;
};

export type DurableQuickCaptureResult = {
  contractVersion: typeof AI_A3_P5C_DURABLE_HANDOFF_CONTRACT;
  signalId: string;
  sourceText: string;
  locale: string;
  requestedTemporalDirection: QuickCaptureTemporalMode | null;
  operationId: string;
  activityEventIds: string[];
  reviewHref: string;
  globalPreview: AiLabQuickCapturePreview;
  processingRuleApplications: unknown[];
  warnings: string[];
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
  return value === "en" || value === "pl" || value === "ru" || value === "uk" ||
    value === "de" || value === "es" || value === "cs"
    ? value
    : "ru";
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
}

function getDurableAnalysis(signal: DurableSignalRow) {
  const normalized = asRecord(signal.normalized_preview_json);
  const durable = asRecord(normalized.durableAnalysis);
  const preview = asRecord(durable.globalPreview) as AiLabQuickCapturePreview;
  const rows = Array.isArray(preview.rows) ? preview.rows : [];
  return preview.ok === true && rows.length > 0
    ? {
        preview,
        applications: Array.isArray(durable.processingRuleApplications)
          ? durable.processingRuleApplications
          : [],
      }
    : null;
}

function getDurableResult(signal: DurableSignalRow): DurableQuickCaptureResult | null {
  const normalized = asRecord(signal.normalized_preview_json);
  const result = asRecord(normalized.durableResult);
  if (
    result.contractVersion !== AI_A3_P5C_DURABLE_HANDOFF_CONTRACT ||
    result.signalId !== signal.id ||
    !Array.isArray(result.activityEventIds) ||
    typeof result.reviewHref !== "string"
  ) {
    return null;
  }
  return result as DurableQuickCaptureResult;
}

export function summarizeDurableQuickCaptureSignal(signal: DurableSignalRow) {
  return {
    signalId: signal.id,
    processingStatus: signal.processing_status,
    processingError: signal.processing_error,
    result: getDurableResult(signal),
    updatedAt: signal.updated_at,
  };
}

export async function readDurableQuickCaptureSignal(input: {
  signalId: string;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("raw_activity_signals")
    .select("id,user_id,source_type,idempotency_key,raw_payload,normalized_preview_json,processing_status,processing_error,output_event_id,metadata_json,updated_at")
    .eq("id", input.signalId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (error) throw new Error(`P5C_DURABLE_SIGNAL_READ_FAILED:${error.message}`);
  return (data as DurableSignalRow | null) ?? null;
}

export async function findDurableQuickCaptureSignalByKey(input: {
  userId: string;
  idempotencyKey: string;
}) {
  const { data, error } = await supabase
    .from("raw_activity_signals")
    .select("id,user_id,source_type,idempotency_key,raw_payload,normalized_preview_json,processing_status,processing_error,output_event_id,metadata_json,updated_at")
    .eq("user_id", input.userId)
    .eq("source_type", "manual_chat")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (error) throw new Error(`P5C_DURABLE_SIGNAL_KEY_READ_FAILED:${error.message}`);
  return (data as DurableSignalRow | null) ?? null;
}

export async function createDurableQuickCaptureSignal(input: {
  userId: string;
  actorId: string;
  clientRequestId: string;
  inputText: string;
  locale: ActivityTimingLocalePp1;
  timeZone: string;
  temporalDirection: QuickCaptureTemporalMode;
  reportedAt: string;
}) {
  const idempotencyKey = `activity_ai_lab_quick_capture:${input.clientRequestId}`;
  const rawPayload = {
    contractVersion: AI_A3_P5C_DURABLE_HANDOFF_CONTRACT,
    clientRequestId: input.clientRequestId,
    operationId: input.clientRequestId,
    inputText: input.inputText,
    locale: input.locale,
    timeZone: input.timeZone,
    temporalDirection: input.temporalDirection,
    temporalIntentSource: "explicit_user_control",
    reportedAt: input.reportedAt,
  };
  const { data, error } = await supabase
    .from("raw_activity_signals")
    .insert({
      user_id: input.userId,
      source_type: "manual_chat",
      source_event_id: input.clientRequestId,
      idempotency_key: idempotencyKey,
      raw_payload: rawPayload,
      normalized_preview_json: {
        durableReceipt: {
          acceptedAt: new Date().toISOString(),
          actorId: input.actorId,
        },
      },
      trust_level: "medium",
      privacy_scope: "private",
      processing_status: "pending",
      processing_error: null,
      output_event_id: null,
      metadata_json: {
        sourceSurface: "activity_ai_lab",
        actorId: input.actorId,
        locale: input.locale,
        timeZone: input.timeZone,
        temporalDirection: input.temporalDirection,
        temporalIntentSource: "explicit_user_control",
        durableContract: AI_A3_P5C_DURABLE_HANDOFF_CONTRACT,
        requiresHumanReview: true,
      },
    })
    .select("id,user_id,source_type,idempotency_key,raw_payload,normalized_preview_json,processing_status,processing_error,output_event_id,metadata_json,updated_at")
    .single();
  if (error || !data) {
    return {
      signal: null,
      error: error?.message ?? "P5C_DURABLE_SIGNAL_CREATE_FAILED",
      idempotencyKey,
    };
  }
  return { signal: data as DurableSignalRow, error: null, idempotencyKey };
}

export async function listDurableQuickCaptureSignalsForRecovery(input: {
  userId: string;
  limit?: number;
}) {
  const limit = Math.max(1, Math.min(10, Math.trunc(input.limit ?? 3)));
  const { data, error } = await supabase
    .from("raw_activity_signals")
    .select("id,user_id,source_type,idempotency_key,raw_payload,normalized_preview_json,processing_status,processing_error,output_event_id,metadata_json,updated_at")
    .eq("user_id", input.userId)
    .eq("source_type", "manual_chat")
    .like("idempotency_key", "activity_ai_lab_quick_capture:%")
    .in("processing_status", ["pending", "received", "processing"])
    .order("updated_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`P5C_DURABLE_RECOVERY_LIST_FAILED:${error.message}`);

  const recoverable: DurableSignalRow[] = [];
  for (const row of (data ?? []) as DurableSignalRow[]) {
    const current = await requeueDurableSignalIfStale(row);
    if (current.processing_status === "pending" || current.processing_status === "received") {
      recoverable.push(current);
    }
  }
  return recoverable;
}

export async function requeueDurableSignalIfStale(signal: DurableSignalRow) {
  if (signal.processing_status !== "processing") return signal;
  const updatedAt = new Date(signal.updated_at).getTime();
  if (!Number.isFinite(updatedAt) || Date.now() - updatedAt < PROCESSING_STALE_AFTER_MS) {
    return signal;
  }
  const { data, error } = await supabase
    .from("raw_activity_signals")
    .update({
      processing_status: "pending",
      processing_error: "P5C_DURABLE_STALE_PROCESSING_REQUEUED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", signal.id)
    .eq("user_id", signal.user_id)
    .eq("processing_status", "processing")
    .select("id,user_id,source_type,idempotency_key,raw_payload,normalized_preview_json,processing_status,processing_error,output_event_id,metadata_json,updated_at")
    .maybeSingle();
  if (error) throw new Error(`P5C_DURABLE_REQUEUE_FAILED:${error.message}`);
  return (data as DurableSignalRow | null) ?? signal;
}

async function claimSignal(input: { signalId: string; userId: string }) {
  const { data, error } = await supabase
    .from("raw_activity_signals")
    .update({
      processing_status: "processing",
      processing_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.signalId)
    .eq("user_id", input.userId)
    .in("processing_status", ["pending", "received", "failed"])
    .select("id,user_id,source_type,idempotency_key,raw_payload,normalized_preview_json,processing_status,processing_error,output_event_id,metadata_json,updated_at")
    .maybeSingle();
  if (error) throw new Error(`P5C_DURABLE_CLAIM_FAILED:${error.message}`);
  return (data as DurableSignalRow | null) ?? null;
}

async function authenticatedJsonFetch(input: {
  origin: string;
  path: string;
  cookieHeader: string;
  body: unknown;
}) {
  const response = await fetch(new URL(input.path, input.origin), {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Cookie: input.cookieHeader,
    },
    body: JSON.stringify(input.body),
  });
  const payload = (await response.json().catch(() => null)) as JsonRecord | null;
  if (!response.ok || payload?.ok === false) {
    throw new Error(
      `${input.path}:${text(payload?.error) || text(payload?.code) || `HTTP_${response.status}`}`,
    );
  }
  return payload ?? {};
}

async function storeDurableAnalysis(input: {
  signal: DurableSignalRow;
  preview: AiLabQuickCapturePreview;
  processingRuleApplications: unknown[];
}) {
  const normalized = asRecord(input.signal.normalized_preview_json);
  const { data, error } = await supabase
    .from("raw_activity_signals")
    .update({
      normalized_preview_json: {
        ...normalized,
        durableAnalysis: {
          contractVersion: AI_A3_P5C_DURABLE_HANDOFF_CONTRACT,
          globalPreview: input.preview,
          processingRuleApplications: input.processingRuleApplications,
          storedAt: new Date().toISOString(),
        },
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.signal.id)
    .eq("user_id", input.signal.user_id)
    .select("id,user_id,source_type,idempotency_key,raw_payload,normalized_preview_json,processing_status,processing_error,output_event_id,metadata_json,updated_at")
    .single();
  if (error || !data) throw new Error(`P5C_DURABLE_ANALYSIS_CHECKPOINT_FAILED:${error?.message ?? "missing row"}`);
  return data as DurableSignalRow;
}

async function markProcessed(input: {
  signal: DurableSignalRow;
  result: DurableQuickCaptureResult;
}) {
  const normalized = asRecord(input.signal.normalized_preview_json);
  const { data, error } = await supabase
    .from("raw_activity_signals")
    .update({
      processing_status: "processed",
      processing_error: null,
      output_event_id: input.result.activityEventIds[0] ?? null,
      normalized_preview_json: {
        ...normalized,
        durableResult: input.result,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.signal.id)
    .eq("user_id", input.signal.user_id)
    .select("id,user_id,source_type,idempotency_key,raw_payload,normalized_preview_json,processing_status,processing_error,output_event_id,metadata_json,updated_at")
    .single();
  if (error || !data) throw new Error(`P5C_DURABLE_MARK_PROCESSED_FAILED:${error?.message ?? "missing row"}`);
  return data as DurableSignalRow;
}

async function markFailed(input: { signalId: string; userId: string; error: unknown }) {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  await supabase
    .from("raw_activity_signals")
    .update({
      processing_status: "failed",
      processing_error: message.slice(0, 3000),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.signalId)
    .eq("user_id", input.userId);
}

export async function processDurableQuickCaptureSignal(input: {
  signalId: string;
  userId: string;
  actorId: string;
  cookieHeader: string;
  origin: string;
}) {
  let signal = await claimSignal({ signalId: input.signalId, userId: input.userId });
  if (!signal) {
    return readDurableQuickCaptureSignal({ signalId: input.signalId, userId: input.userId });
  }

  try {
    const raw = asRecord(signal.raw_payload);
    const inputText = text(raw.inputText);
    const locale = normalizeLocale(raw.locale);
    const timeZone = text(raw.timeZone) || "UTC";
    const requestedTemporalDirection = normalizeQuickCaptureTemporalMode(raw.temporalDirection);
    const operationId = text(raw.operationId) || text(raw.clientRequestId);
    const reportedAt = text(raw.reportedAt) || new Date().toISOString();
    if (!inputText || !operationId) throw new Error("P5C_DURABLE_SIGNAL_PAYLOAD_INVALID");

    let analysis = getDurableAnalysis(signal);
    if (!analysis) {
      const preview = (await runGlobalObservationPreview({
        appUserId: input.userId,
        actorId: input.actorId,
        inputText,
        locale,
        timeZone,
        operationId,
      })) as AiLabQuickCapturePreview;
      if (preview.ok !== true || !Array.isArray(preview.rows) || preview.rows.length === 0) {
        throw new Error("P5C_DURABLE_GLOBAL_ANALYSIS_EMPTY");
      }
      const executed = await executeActivityQuickCaptureProcessingRules({
        rows: preview.rows,
        locale,
      });
      if (executed.rows.length === 0) {
        throw new Error("P5C_DURABLE_NO_ACTIVITY_AFTER_PROCESSING_RULES");
      }
      const processedPreview: AiLabQuickCapturePreview = {
        ...preview,
        rows: executed.rows,
        warnings: [
          ...(preview.warnings ?? []),
          ...executed.applications.map(
            (item) => `PROCESSING_RULE:${item.ruleCode}:${item.outcome}:${item.segmentId}`,
          ),
        ],
      };
      signal = await storeDurableAnalysis({
        signal,
        preview: processedPreview,
        processingRuleApplications: executed.applications,
      });
      analysis = {
        preview: processedPreview,
        applications: executed.applications,
      };
    }

    const rows = (analysis.preview.rows ?? []) as AiLabQuickCaptureRow[];
    const sourceFragments = buildAiLabQuickCaptureSourceTexts({
      rows,
      sourceMessageText: inputText,
    });
    const timings = buildAiLabQuickCaptureSequentialTimings({
      rows,
      sourceTexts: sourceFragments,
      locale,
      reportedAt,
      timeZone,
      temporalDirectionOverride: requestedTemporalDirection,
    });
    const activityEventIds: string[] = [];
    const warnings: string[] = [];
    const localizationInputs: Array<{ activityEventId: string; title: string | null; inputText: string | null }> = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const sourceFragment = sourceFragments[index];
      const timing = timings[index];
      const title = deriveAiLabActivityTitle(sourceFragment, [row]);
      const baseRequest = buildAiLabDirectActivityRequest({
        idempotencyKey: deriveAiLabQuickCaptureIdempotencyKey({
          operationId: signal.id,
          segmentId: row.segmentId ?? null,
          index,
        }),
        temporalDirection: timing.temporalDirection,
        rawText: sourceFragment,
        title,
        locale,
        timingLabel: timing.timingLabel,
        analysisOperationId: operationId,
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
          quickCaptureContract: "AI_A3_P5C_QUICK_CAPTURE_REVIEW_V1",
          quickCaptureDurableContract: AI_A3_P5C_DURABLE_HANDOFF_CONTRACT,
          quickCaptureReceiptSignalId: signal.id,
          quickCaptureReviewRequired: true,
          quickCaptureReviewStatus: "pending",
          quickCaptureSourceMessageText: inputText,
          quickCaptureSourceSegmentId: row.segmentId ?? `segment-${index + 1}`,
          quickCaptureSourceSegmentOrdinal: index + 1,
          quickCaptureSourceSegmentCount: rows.length,
          quickCaptureTemporalSequencePolicy: "independent_events_named_order_no_invented_breaks",
          quickCaptureRequestedTemporalDirection: requestedTemporalDirection,
          quickCaptureTemporalIntentSource: requestedTemporalDirection ? "explicit_user_control" : "legacy_inference",
          quickCaptureProcessingRuleApplications: analysis.applications,
          quickCaptureReviewSnapshot: buildAiLabQuickCaptureReviewSnapshot({
            preview: analysis.preview,
            row,
            sourceMessageText: inputText,
            sourceFragment,
            locale,
            temporalDirection: timing.temporalDirection,
          }),
        },
      };

      const eventPayload = await authenticatedJsonFetch({
        origin: input.origin,
        path: "/api/activity/events",
        cookieHeader: input.cookieHeader,
        body: requestBody,
      });
      const event = asRecord(eventPayload.activityEvent);
      const summary = asRecord(eventPayload.event);
      const activityEventId = text(event.id) || text(summary.id);
      if (!activityEventId) throw new Error(`P5C_DURABLE_EVENT_ID_MISSING:${index + 1}`);
      activityEventIds.push(activityEventId);
      localizationInputs.push({ activityEventId, title, inputText: sourceFragment });

      const candidates = buildAiLabFactMaterializationCandidates(
        [row],
        analysis.preview.contractVersion ?? null,
      );
      if (candidates.length > 0) {
        try {
          await authenticatedJsonFetch({
            origin: input.origin,
            path: "/api/ai/reality/fact-materialize",
            cookieHeader: input.cookieHeader,
            body: { activityEventId, operationId, candidates },
          });
        } catch (error) {
          warnings.push(
            error instanceof Error
              ? `FACT_MATERIALIZATION_WARNING:${activityEventId}:${error.message}`
              : `FACT_MATERIALIZATION_WARNING:${activityEventId}`,
          );
        }
      }
    }

    if (localizationInputs.length > 0) {
      try {
        const localization = await ensureActivityEventLocalizations({
          userId: input.userId,
          actorId: input.actorId,
          analysisExecutionId: analysis.preview.analysisExecutionId?.trim() || null,
          operationId,
          sourceLocaleHint: locale,
          activities: localizationInputs,
        });
        warnings.push(...localization.warnings.map((warning) => `CONTENT_LOCALIZATION_WARNING:${warning}`));
      } catch (error) {
        warnings.push(`CONTENT_LOCALIZATION_WARNING:${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const result: DurableQuickCaptureResult = {
      contractVersion: AI_A3_P5C_DURABLE_HANDOFF_CONTRACT,
      signalId: signal.id,
      sourceText: inputText,
      locale,
      requestedTemporalDirection,
      operationId,
      activityEventIds,
      reviewHref:
        activityEventIds.length === 1
          ? buildAiLabQuickCaptureReviewHref({ locale, activityEventId: activityEventIds[0] })
          : buildAiLabQuickCaptureReviewHref({ locale }),
      globalPreview: analysis.preview,
      processingRuleApplications: analysis.applications,
      warnings,
    };
    signal = await markProcessed({ signal, result });
    return signal;
  } catch (error) {
    await markFailed({ signalId: input.signalId, userId: input.userId, error });
    throw error;
  }
}

export function durableResultEventIds(signal: DurableSignalRow) {
  return stringArray(getDurableResult(signal)?.activityEventIds);
}
