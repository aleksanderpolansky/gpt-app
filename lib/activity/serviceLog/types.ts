export type ServiceLogUuid = string;
export type ServiceLogIsoTimestamp = string;

export type ServiceLogJsonPrimitive = string | number | boolean | null;
export type ServiceLogJson =
  | ServiceLogJsonPrimitive
  | { readonly [key: string]: ServiceLogJson }
  | readonly ServiceLogJson[];

export type ServiceLogJsonObject = {
  readonly [key: string]: ServiceLogJson;
};

export type ServiceLogJsonArray = readonly ServiceLogJson[];

export type ServiceLogHttpMethod =
  | "GET"
  | "POST"
  | "PATCH"
  | "PUT"
  | "DELETE";

export type ServiceLogMessageVisibilityScope =
  | "private"
  | "internal_debug"
  | "redacted"
  | "public_safe";

export type ServiceLogPrivacyScope =
  | "private"
  | "internal_debug"
  | "team"
  | "public_safe";

export type ServiceLogStageStatus =
  | "pending"
  | "received"
  | "started"
  | "completed"
  | "skipped"
  | "warning"
  | "failed"
  | "confirmed"
  | "corrected"
  | "rejected";

export type ServiceLogStageKey =
  | "MESSAGE_SUBMITTED"
  | "MESSAGE_RECEIVED_BY_SYSTEM"
  | "AI_OR_PARSER_INTAKE_STARTED"
  | "NORMALIZATION_DONE"
  | "CATEGORY_CANDIDATES_DONE"
  | "METRIC_CANDIDATES_DONE"
  | "VALUE_OBJECT_CANDIDATES_DONE"
  | "PREVIEW_SHOWN"
  | "USER_REVIEW_DONE"
  | "WRITE_GATE_PASSED"
  | "ACTIVITY_EVENT_SAVED"
  | "CATEGORY_LINKS_SAVED"
  | "VO_LINKS_SAVED"
  | "METRICS_SAVED"
  | "AGGREGATES_UPDATED"
  | "UI_RESULT_VISIBLE"
  | "CORRECTION_IF_NEEDED"
  | (string & { readonly __serviceLogStageKeyBrand?: never });

export type ServiceLogSourceSurface =
  | "unknown"
  | "activity_capture"
  | "activity_today"
  | "semantic_review"
  | "value_object"
  | "workspace"
  | "api"
  | "debug"
  | (string & { readonly __serviceLogSourceSurfaceBrand?: never });

export interface ActivityProcessingServiceLogRow {
  readonly id: ServiceLogUuid;
  readonly created_at: ServiceLogIsoTimestamp;
  readonly updated_at: ServiceLogIsoTimestamp;

  readonly user_id: ServiceLogUuid;
  readonly app_user_id: ServiceLogUuid | null;
  readonly actor_user_id: ServiceLogUuid | null;
  readonly selected_space_id: ServiceLogUuid | null;
  readonly organization_id: ServiceLogUuid | null;

  readonly session_id: string | null;
  readonly request_id: string | null;
  readonly correlation_id: string | null;
  readonly client_event_id: string | null;

  readonly source_surface: ServiceLogSourceSurface;
  readonly source_route: string | null;
  readonly source_component: string | null;
  readonly source_action: string | null;
  readonly http_method: ServiceLogHttpMethod | null;

  readonly raw_message_text: string | null;
  readonly redacted_message_text: string | null;
  readonly message_language: string | null;
  readonly message_received_at: ServiceLogIsoTimestamp | null;
  readonly message_hash: string | null;
  readonly message_visibility_scope: ServiceLogMessageVisibilityScope;

  readonly stage_key: ServiceLogStageKey;
  readonly stage_status: ServiceLogStageStatus;
  readonly processor_name: string | null;
  readonly processor_version: string | null;
  readonly processing_started_at: ServiceLogIsoTimestamp | null;
  readonly processing_finished_at: ServiceLogIsoTimestamp | null;
  readonly processing_duration_ms: number | null;

  readonly is_preview: boolean;
  readonly is_write_attempted: boolean;
  readonly activity_event_created: boolean;
  readonly value_object_created: boolean;
  readonly activity_value_object_link_created: boolean;
  readonly classification_created: boolean;
  readonly aggregate_updated: boolean;

  readonly category_candidates_json: ServiceLogJsonArray;
  readonly metric_candidates_json: ServiceLogJsonArray;
  readonly value_object_candidates_json: ServiceLogJsonArray;
  readonly exposure_candidates_json: ServiceLogJsonArray;
  readonly state_delta_candidates_json: ServiceLogJsonArray;
  readonly review_action_candidates_json: ServiceLogJsonArray;

  readonly user_review_status: string | null;
  readonly user_review_action: string | null;
  readonly user_review_note: string | null;
  readonly corrected_message_text: string | null;
  readonly correction_id: ServiceLogUuid | null;
  readonly correction_type: string | null;

  readonly activity_event_id: ServiceLogUuid | null;
  readonly activity_template_id: ServiceLogUuid | null;
  readonly derivation_run_id: ServiceLogUuid | null;
  readonly stable_bundle_id: ServiceLogUuid | null;

  readonly entity_classification_ids_json: ServiceLogJsonArray;
  readonly value_object_ids_json: ServiceLogJsonArray;
  readonly event_link_ids_json: ServiceLogJsonArray;
  readonly aggregate_ids_json: ServiceLogJsonArray;

  readonly duration_minutes_candidate: number | null;
  readonly duration_minutes_confirmed: number | null;
  readonly metric_summary_json: ServiceLogJsonObject;
  readonly quantity_summary_json: ServiceLogJsonObject;
  readonly quality_score_json: ServiceLogJsonObject;

  readonly privacy_scope: ServiceLogPrivacyScope;
  readonly contains_sensitive_data: boolean;
  readonly public_safe: boolean;
  readonly raw_text_publicly_visible: false;
  readonly ai_output_publicly_visible: boolean;

  readonly safety_warnings_json: ServiceLogJsonArray;
  readonly error_code: string | null;
  readonly error_message: string | null;
  readonly warning_messages_json: ServiceLogJsonArray;
  readonly skipped_reason: string | null;
  readonly debug_payload_json: ServiceLogJsonObject;
  readonly evidence_json: ServiceLogJsonObject;

  readonly display_title: string | null;
  readonly display_summary: string | null;
  readonly visible_in_service_log: boolean;
  readonly visible_in_activity_capture: boolean;
  readonly visible_in_today: boolean;
  readonly visible_in_value_object: boolean;
  readonly visible_in_analytics: boolean;
}

export type ActivityProcessingServiceLogInsert = {
  readonly user_id: ServiceLogUuid;
  readonly stage_key: ServiceLogStageKey;

  readonly id?: ServiceLogUuid;
  readonly created_at?: ServiceLogIsoTimestamp;
  readonly updated_at?: ServiceLogIsoTimestamp;

  readonly app_user_id?: ServiceLogUuid | null;
  readonly actor_user_id?: ServiceLogUuid | null;
  readonly selected_space_id?: ServiceLogUuid | null;
  readonly organization_id?: ServiceLogUuid | null;

  readonly session_id?: string | null;
  readonly request_id?: string | null;
  readonly correlation_id?: string | null;
  readonly client_event_id?: string | null;

  readonly source_surface?: ServiceLogSourceSurface;
  readonly source_route?: string | null;
  readonly source_component?: string | null;
  readonly source_action?: string | null;
  readonly http_method?: ServiceLogHttpMethod | null;

  readonly raw_message_text?: string | null;
  readonly redacted_message_text?: string | null;
  readonly message_language?: string | null;
  readonly message_received_at?: ServiceLogIsoTimestamp | null;
  readonly message_hash?: string | null;
  readonly message_visibility_scope?: ServiceLogMessageVisibilityScope;

  readonly stage_status?: ServiceLogStageStatus;
  readonly processor_name?: string | null;
  readonly processor_version?: string | null;
  readonly processing_started_at?: ServiceLogIsoTimestamp | null;
  readonly processing_finished_at?: ServiceLogIsoTimestamp | null;
  readonly processing_duration_ms?: number | null;

  readonly is_preview?: boolean;
  readonly is_write_attempted?: boolean;
  readonly activity_event_created?: boolean;
  readonly value_object_created?: boolean;
  readonly activity_value_object_link_created?: boolean;
  readonly classification_created?: boolean;
  readonly aggregate_updated?: boolean;

  readonly category_candidates_json?: ServiceLogJsonArray;
  readonly metric_candidates_json?: ServiceLogJsonArray;
  readonly value_object_candidates_json?: ServiceLogJsonArray;
  readonly exposure_candidates_json?: ServiceLogJsonArray;
  readonly state_delta_candidates_json?: ServiceLogJsonArray;
  readonly review_action_candidates_json?: ServiceLogJsonArray;

  readonly user_review_status?: string | null;
  readonly user_review_action?: string | null;
  readonly user_review_note?: string | null;
  readonly corrected_message_text?: string | null;
  readonly correction_id?: ServiceLogUuid | null;
  readonly correction_type?: string | null;

  readonly activity_event_id?: ServiceLogUuid | null;
  readonly activity_template_id?: ServiceLogUuid | null;
  readonly derivation_run_id?: ServiceLogUuid | null;
  readonly stable_bundle_id?: ServiceLogUuid | null;

  readonly entity_classification_ids_json?: ServiceLogJsonArray;
  readonly value_object_ids_json?: ServiceLogJsonArray;
  readonly event_link_ids_json?: ServiceLogJsonArray;
  readonly aggregate_ids_json?: ServiceLogJsonArray;

  readonly duration_minutes_candidate?: number | null;
  readonly duration_minutes_confirmed?: number | null;
  readonly metric_summary_json?: ServiceLogJsonObject;
  readonly quantity_summary_json?: ServiceLogJsonObject;
  readonly quality_score_json?: ServiceLogJsonObject;

  readonly privacy_scope?: ServiceLogPrivacyScope;
  readonly contains_sensitive_data?: boolean;
  readonly public_safe?: boolean;
  readonly raw_text_publicly_visible?: false;
  readonly ai_output_publicly_visible?: boolean;

  readonly safety_warnings_json?: ServiceLogJsonArray;
  readonly error_code?: string | null;
  readonly error_message?: string | null;
  readonly warning_messages_json?: ServiceLogJsonArray;
  readonly skipped_reason?: string | null;
  readonly debug_payload_json?: ServiceLogJsonObject;
  readonly evidence_json?: ServiceLogJsonObject;

  readonly display_title?: string | null;
  readonly display_summary?: string | null;
  readonly visible_in_service_log?: boolean;
  readonly visible_in_activity_capture?: boolean;
  readonly visible_in_today?: boolean;
  readonly visible_in_value_object?: boolean;
  readonly visible_in_analytics?: boolean;
};

export type ActivityProcessingServiceLogUpdate =
  Partial<Omit<ActivityProcessingServiceLogInsert, "id" | "created_at">>;

export interface ServiceLogWriteResult {
  readonly attempted: boolean;
  readonly ok: boolean;
  readonly id: ServiceLogUuid | null;
  readonly errorCode: string | null;
  readonly errorMessage: string | null;
  readonly skippedReason: string | null;
}

export interface ServiceLogWriteOptions {
  readonly enabled: boolean;
  readonly nonBlocking: boolean;
  readonly processorName: string;
  readonly processorVersion: string;
}

export const ACTIVITY_PROCESSING_SERVICE_LOG_TABLE =
  "activity_processing_service_log" as const;

export const DEFAULT_SERVICE_LOG_WRITE_OPTIONS: ServiceLogWriteOptions = {
  enabled: true,
  nonBlocking: true,
  processorName: "gpt-app-service-log",
  processorVersion: "v0",
};

export function createSkippedServiceLogWriteResult(
  skippedReason: string,
): ServiceLogWriteResult {
  return {
    attempted: false,
    ok: true,
    id: null,
    errorCode: null,
    errorMessage: null,
    skippedReason,
  };
}

export function createFailedServiceLogWriteResult(
  errorMessage: string,
  errorCode = "SERVICE_LOG_WRITE_FAILED",
): ServiceLogWriteResult {
  return {
    attempted: true,
    ok: false,
    id: null,
    errorCode,
    errorMessage,
    skippedReason: null,
  };
}

export function createSuccessfulServiceLogWriteResult(
  id: ServiceLogUuid,
): ServiceLogWriteResult {
  return {
    attempted: true,
    ok: true,
    id,
    errorCode: null,
    errorMessage: null,
    skippedReason: null,
  };
}
