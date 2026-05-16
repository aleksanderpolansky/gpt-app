import { supabase } from "../supabase";
import type { JsonObject, JsonValue } from "./rawActivitySignals";

export type ActivityProcessingStage =
  | "ingest"
  | "parse"
  | "normalize"
  | "validate"
  | "deduplicate"
  | "create_event"
  | "complete_event"
  | "link_event"
  | "process_impacts"
  | "aggregate"
  | "snapshot"
  | "correction"
  | "rollback"
  | "timeline_check"
  | "timeline_adjustment"
  | "finalize"
  | "error"
  | "debug";

export type ActivityProcessingStatus =
  | "started"
  | "processing"
  | "completed"
  | "failed"
  | "skipped"
  | "warning"
  | "retrying"
  | "cancelled";

export type ActivityProcessingSeverity =
  | "debug"
  | "info"
  | "notice"
  | "warning"
  | "error"
  | "critical";

export type ActivityProcessingLogRow = {
  id: string;
  user_id: string;
  raw_signal_id: string | null;
  activity_event_id: string | null;
  activity_correction_id: string | null;
  processing_run_id: string | null;
  processor_name: string;
  processor_version: string | null;
  processing_stage: ActivityProcessingStage;
  processing_status: ActivityProcessingStatus;
  severity: ActivityProcessingSeverity;
  message: string | null;
  input_json: JsonObject;
  output_json: JsonObject;
  error_json: JsonObject;
  metadata_json: JsonObject;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  created_at: string;
  updated_at: string;
};

export type CreateActivityProcessingLogInput = {
  userId: string;
  rawSignalId?: string | null;
  activityEventId?: string | null;
  activityCorrectionId?: string | null;
  processingRunId?: string | null;
  processorName: string;
  processorVersion?: string | null;
  processingStage: ActivityProcessingStage;
  processingStatus?: ActivityProcessingStatus;
  severity?: ActivityProcessingSeverity;
  message?: string | null;
  input?: unknown;
  output?: unknown;
  error?: unknown;
  metadata?: unknown;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
};

export type CreateActivityProcessingLogResult = {
  ok: boolean;
  log: ActivityProcessingLogRow | null;
  error: string | null;
};

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toJsonValue(value: unknown): JsonValue {
  if (value === undefined) {
    return null;
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack ?? null,
    };
  }

  try {
    return JSON.parse(JSON.stringify(value)) as JsonValue;
  } catch {
    return String(value);
  }
}

function toJsonObject(value: unknown): JsonObject {
  if (isJsonObject(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return {};
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack ?? null,
    };
  }

  return {
    value: toJsonValue(value),
  };
}

function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

export async function createActivityProcessingLog(
  input: CreateActivityProcessingLogInput
): Promise<CreateActivityProcessingLogResult> {
  const { data, error } = await supabase
    .from("activity_processing_logs")
    .insert({
      user_id: input.userId,
      raw_signal_id: input.rawSignalId ?? null,
      activity_event_id: input.activityEventId ?? null,
      activity_correction_id: input.activityCorrectionId ?? null,
      processing_run_id: input.processingRunId ?? null,
      processor_name: input.processorName,
      processor_version: nullableText(input.processorVersion),
      processing_stage: input.processingStage,
      processing_status: input.processingStatus ?? "completed",
      severity: input.severity ?? "info",
      message: nullableText(input.message),
      input_json: toJsonObject(input.input),
      output_json: toJsonObject(input.output),
      error_json: toJsonObject(input.error),
      metadata_json: toJsonObject(input.metadata),
      started_at: input.startedAt ?? new Date().toISOString(),
      finished_at: input.finishedAt ?? null,
      duration_ms: input.durationMs ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    return {
      ok: false,
      log: null,
      error: error?.message ?? "Failed to create activity processing log",
    };
  }

  return {
    ok: true,
    log: data as ActivityProcessingLogRow,
    error: null,
  };
}

export function getDurationMs(
  startedAt: string | Date,
  finishedAt?: string | Date
): number {
  const started = startedAt instanceof Date ? startedAt : new Date(startedAt);
  const finished =
    finishedAt === undefined
      ? new Date()
      : finishedAt instanceof Date
        ? finishedAt
        : new Date(finishedAt);

  const duration = finished.getTime() - started.getTime();

  return Number.isFinite(duration) && duration >= 0 ? duration : 0;
}

export async function safeCreateActivityProcessingLog(
  input: CreateActivityProcessingLogInput
): Promise<CreateActivityProcessingLogResult> {
  try {
    return await createActivityProcessingLog(input);
  } catch (error) {
    // Logging must never break the main activity recording flow.
    return {
      ok: false,
      log: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

