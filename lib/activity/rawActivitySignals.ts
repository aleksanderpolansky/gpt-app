import { supabase } from "../supabase";

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export type RawActivitySignalSourceType =
  | "manual_chat"
  | "manual_form"
  | "voice_input"
  | "app_action"
  | "system_event"
  | "api_webhook"
  | "nfc_sensor"
  | "wearable_import"
  | "calendar_import"
  | "ai_suggested"
  | "file_import"
  | "external_import"
  | "unknown";

export type RawActivitySignalTrustLevel =
  | "untrusted"
  | "low"
  | "medium"
  | "high"
  | "trusted"
  | "system";

export type RawActivitySignalPrivacyScope =
  | "private"
  | "shared_with_org"
  | "public_masked"
  | "public";

export type RawActivitySignalProcessingStatus =
  | "received"
  | "pending"
  | "processing"
  | "processed"
  | "failed"
  | "skipped"
  | "duplicate"
  | "ignored";

export type RawActivitySignalRow = {
  id: string;
  user_id: string;
  source_type: RawActivitySignalSourceType;
  source_event_id: string | null;
  idempotency_key: string | null;
  raw_payload: JsonObject;
  normalized_preview_json: JsonObject;
  received_at: string;
  occurred_at: string | null;
  measured_at: string | null;
  trust_level: RawActivitySignalTrustLevel;
  privacy_scope: RawActivitySignalPrivacyScope;
  processing_status: RawActivitySignalProcessingStatus;
  processing_error: string | null;
  output_event_id: string | null;
  metadata_json: JsonObject;
  created_at: string;
  updated_at: string;
};

export type CreateRawActivitySignalInput = {
  userId: string;
  sourceType: RawActivitySignalSourceType;
  sourceEventId?: string | null;
  idempotencyKey?: string | null;
  rawPayload?: unknown;
  normalizedPreview?: unknown;
  occurredAt?: string | null;
  measuredAt?: string | null;
  trustLevel?: RawActivitySignalTrustLevel;
  privacyScope?: RawActivitySignalPrivacyScope;
  processingStatus?: RawActivitySignalProcessingStatus;
  processingError?: string | null;
  outputEventId?: string | null;
  metadata?: unknown;
};

export type CreateRawActivitySignalResult = {
  ok: boolean;
  signal: RawActivitySignalRow | null;
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

  return {
    value: toJsonValue(value),
  };
}

function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

export async function createRawActivitySignal(
  input: CreateRawActivitySignalInput
): Promise<CreateRawActivitySignalResult> {
  const { data, error } = await supabase
    .from("raw_activity_signals")
    .insert({
      user_id: input.userId,
      source_type: input.sourceType,
      source_event_id: nullableText(input.sourceEventId),
      idempotency_key: nullableText(input.idempotencyKey),
      raw_payload: toJsonObject(input.rawPayload),
      normalized_preview_json: toJsonObject(input.normalizedPreview),
      occurred_at: input.occurredAt ?? null,
      measured_at: input.measuredAt ?? null,
      trust_level: input.trustLevel ?? "untrusted",
      privacy_scope: input.privacyScope ?? "private",
      processing_status: input.processingStatus ?? "received",
      processing_error: nullableText(input.processingError),
      output_event_id: input.outputEventId ?? null,
      metadata_json: toJsonObject(input.metadata),
    })
    .select()
    .single();

  if (error || !data) {
    return {
      ok: false,
      signal: null,
      error: error?.message ?? "Failed to create raw activity signal",
    };
  }

  return {
    ok: true,
    signal: data as RawActivitySignalRow,
    error: null,
  };
}

export async function markRawActivitySignalProcessed(params: {
  signalId: string;
  userId: string;
  outputEventId: string;
  normalizedPreview?: unknown;
}): Promise<CreateRawActivitySignalResult> {
  const { data, error } = await supabase
    .from("raw_activity_signals")
    .update({
      processing_status: "processed",
      output_event_id: params.outputEventId,
      normalized_preview_json: toJsonObject(params.normalizedPreview),
      processing_error: null,
    })
    .eq("id", params.signalId)
    .eq("user_id", params.userId)
    .select()
    .single();

  if (error || !data) {
    return {
      ok: false,
      signal: null,
      error: error?.message ?? "Failed to mark raw activity signal as processed",
    };
  }

  return {
    ok: true,
    signal: data as RawActivitySignalRow,
    error: null,
  };
}

export async function markRawActivitySignalFailed(params: {
  signalId: string;
  userId: string;
  error: string;
}): Promise<CreateRawActivitySignalResult> {
  const { data, error } = await supabase
    .from("raw_activity_signals")
    .update({
      processing_status: "failed",
      processing_error: params.error,
    })
    .eq("id", params.signalId)
    .eq("user_id", params.userId)
    .select()
    .single();

  if (error || !data) {
    return {
      ok: false,
      signal: null,
      error: error?.message ?? "Failed to mark raw activity signal as failed",
    };
  }

  return {
    ok: true,
    signal: data as RawActivitySignalRow,
    error: null,
  };
}
