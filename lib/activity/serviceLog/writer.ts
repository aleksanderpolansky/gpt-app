import "server-only";

import { getSupabaseAdminClient } from "../../supabase/admin";

import {
  ACTIVITY_PROCESSING_SERVICE_LOG_TABLE,
  DEFAULT_SERVICE_LOG_WRITE_OPTIONS,
  createFailedServiceLogWriteResult,
  createSkippedServiceLogWriteResult,
  createSuccessfulServiceLogWriteResult,
  type ActivityProcessingServiceLogInsert,
  type ServiceLogJsonArray,
  type ServiceLogJsonObject,
  type ServiceLogWriteOptions,
  type ServiceLogWriteResult,
} from "./types";

export type ActivityProcessingServiceLogWriteInput =
  ActivityProcessingServiceLogInsert;

export type ActivityProcessingServiceLogWriteOptions =
  Partial<ServiceLogWriteOptions>;

interface ServiceLogInsertResultRow {
  readonly id?: unknown;
}

interface ServiceLogInsertResponse {
  readonly data: ServiceLogInsertResultRow | null;
  readonly error: unknown | null;
}

interface ServiceLogMaybeSingleBuilder {
  maybeSingle(): Promise<ServiceLogInsertResponse>;
}

interface ServiceLogSelectBuilder {
  select(columns: "id"): ServiceLogMaybeSingleBuilder;
}

interface ServiceLogInsertBuilder {
  insert(payload: ActivityProcessingServiceLogInsert): ServiceLogSelectBuilder;
}

interface ServiceLogSupabaseClient {
  from(table: typeof ACTIVITY_PROCESSING_SERVICE_LOG_TABLE): ServiceLogInsertBuilder;
}

const EMPTY_JSON_ARRAY: ServiceLogJsonArray = [];
const EMPTY_JSON_OBJECT: ServiceLogJsonObject = {};

function getServiceLogSupabaseClient(): ServiceLogSupabaseClient {
  return getSupabaseAdminClient() as unknown as ServiceLogSupabaseClient;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { readonly message?: unknown }).message === "string"
  ) {
    return (error as { readonly message: string }).message;
  }

  return "Unknown service log writer error";
}

function getErrorCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { readonly code?: unknown }).code === "string"
  ) {
    return (error as { readonly code: string }).code;
  }

  return "SERVICE_LOG_WRITE_FAILED";
}

function mergeServiceLogWriteOptions(
  options?: ActivityProcessingServiceLogWriteOptions,
): ServiceLogWriteOptions {
  return {
    ...DEFAULT_SERVICE_LOG_WRITE_OPTIONS,
    ...options,
  };
}

export function buildActivityProcessingServiceLogInsert(
  input: ActivityProcessingServiceLogWriteInput,
  options?: ActivityProcessingServiceLogWriteOptions,
): ActivityProcessingServiceLogInsert {
  const resolvedOptions = mergeServiceLogWriteOptions(options);

  return {
    ...input,

    source_surface: input.source_surface ?? "unknown",
    message_visibility_scope: input.message_visibility_scope ?? "private",
    stage_status: input.stage_status ?? "pending",

    processor_name: input.processor_name ?? resolvedOptions.processorName,
    processor_version:
      input.processor_version ?? resolvedOptions.processorVersion,

    is_preview: input.is_preview ?? false,
    is_write_attempted: input.is_write_attempted ?? false,
    activity_event_created: input.activity_event_created ?? false,
    value_object_created: input.value_object_created ?? false,
    activity_value_object_link_created:
      input.activity_value_object_link_created ?? false,
    classification_created: input.classification_created ?? false,
    aggregate_updated: input.aggregate_updated ?? false,

    category_candidates_json:
      input.category_candidates_json ?? EMPTY_JSON_ARRAY,
    metric_candidates_json: input.metric_candidates_json ?? EMPTY_JSON_ARRAY,
    value_object_candidates_json:
      input.value_object_candidates_json ?? EMPTY_JSON_ARRAY,
    exposure_candidates_json:
      input.exposure_candidates_json ?? EMPTY_JSON_ARRAY,
    state_delta_candidates_json:
      input.state_delta_candidates_json ?? EMPTY_JSON_ARRAY,
    review_action_candidates_json:
      input.review_action_candidates_json ?? EMPTY_JSON_ARRAY,

    entity_classification_ids_json:
      input.entity_classification_ids_json ?? EMPTY_JSON_ARRAY,
    value_object_ids_json: input.value_object_ids_json ?? EMPTY_JSON_ARRAY,
    event_link_ids_json: input.event_link_ids_json ?? EMPTY_JSON_ARRAY,
    aggregate_ids_json: input.aggregate_ids_json ?? EMPTY_JSON_ARRAY,

    metric_summary_json: input.metric_summary_json ?? EMPTY_JSON_OBJECT,
    quantity_summary_json: input.quantity_summary_json ?? EMPTY_JSON_OBJECT,
    quality_score_json: input.quality_score_json ?? EMPTY_JSON_OBJECT,

    privacy_scope: input.privacy_scope ?? "private",
    contains_sensitive_data: input.contains_sensitive_data ?? false,
    public_safe: input.public_safe ?? false,
    raw_text_publicly_visible: false,
    ai_output_publicly_visible: input.ai_output_publicly_visible ?? false,

    safety_warnings_json: input.safety_warnings_json ?? EMPTY_JSON_ARRAY,
    warning_messages_json: input.warning_messages_json ?? EMPTY_JSON_ARRAY,
    debug_payload_json: input.debug_payload_json ?? EMPTY_JSON_OBJECT,
    evidence_json: input.evidence_json ?? EMPTY_JSON_OBJECT,

    visible_in_service_log: input.visible_in_service_log ?? true,
    visible_in_activity_capture: input.visible_in_activity_capture ?? false,
    visible_in_today: input.visible_in_today ?? false,
    visible_in_value_object: input.visible_in_value_object ?? false,
    visible_in_analytics: input.visible_in_analytics ?? false,
  };
}

export async function writeActivityProcessingServiceLog(
  input: ActivityProcessingServiceLogWriteInput,
  options?: ActivityProcessingServiceLogWriteOptions,
): Promise<ServiceLogWriteResult> {
  const resolvedOptions = mergeServiceLogWriteOptions(options);

  if (!resolvedOptions.enabled) {
    return createSkippedServiceLogWriteResult("service_log_writer_disabled");
  }

  try {
    const supabase = getServiceLogSupabaseClient();
    const payload = buildActivityProcessingServiceLogInsert(
      input,
      resolvedOptions,
    );

    const { data, error } = await supabase
      .from(ACTIVITY_PROCESSING_SERVICE_LOG_TABLE)
      .insert(payload)
      .select("id")
      .maybeSingle();

    if (error) {
      const failed = createFailedServiceLogWriteResult(
        getErrorMessage(error),
        getErrorCode(error),
      );

      if (!resolvedOptions.nonBlocking) {
        throw new Error(failed.errorMessage ?? "Service log write failed");
      }

      return failed;
    }

    const insertedId =
      typeof data === "object" &&
      data !== null &&
      "id" in data &&
      typeof data.id === "string"
        ? data.id
        : null;

    if (!insertedId) {
      const failed = createFailedServiceLogWriteResult(
        "Service log insert returned no id",
        "SERVICE_LOG_WRITE_RETURNED_NO_ID",
      );

      if (!resolvedOptions.nonBlocking) {
        throw new Error(failed.errorMessage ?? "Service log write failed");
      }

      return failed;
    }

    return createSuccessfulServiceLogWriteResult(insertedId);
  } catch (error) {
    const failed = createFailedServiceLogWriteResult(
      getErrorMessage(error),
      getErrorCode(error),
    );

    if (!resolvedOptions.nonBlocking) {
      throw error;
    }

    return failed;
  }
}

