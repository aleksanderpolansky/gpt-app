export const CONTROLLED_ACTIVITY_INTAKE_SCHEMA_VERSION =
  "controlled-activity-intake-v1" as const;

export const CONTROLLED_ACTIVITY_INTAKE_HELPER_LAYER =
  "P4.10.0-C8-I-D4-L-L-O-F" as const;

export type ControlledActivityIntakeSchemaVersion =
  typeof CONTROLLED_ACTIVITY_INTAKE_SCHEMA_VERSION;

export type ControlledActivityIntakeSource =
  | "manual"
  | "chat"
  | "ui_action"
  | "calendar_import"
  | "debug"
  | "unknown";

export type ControlledActivityIntakeIssueCode =
  | "INPUT_NOT_OBJECT"
  | "FORBIDDEN_CLIENT_FIELD"
  | "INPUT_TEXT_REQUIRED"
  | "INPUT_TEXT_TOO_LONG"
  | "TITLE_REQUIRED"
  | "TITLE_TOO_LONG"
  | "DURATION_INVALID"
  | "TIME_INVALID"
  | "TIME_RANGE_INVALID"
  | "SOURCE_INVALID"
  | "CONTEXT_INVALID"
  | "METADATA_INVALID";

export interface ControlledActivityIntakeValidationIssue {
  code: ControlledActivityIntakeIssueCode;
  path: string;
  message: string;
}

export interface ControlledActivityIntakeInput {
  inputText: string;
  title: string;
  source?: ControlledActivityIntakeSource | string | null;
  durationMinutes?: number | null;
  startedAt?: string | null;
  endedAt?: string | null;
  occurredAt?: string | null;
  timezone?: string | null;
  context?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface ControlledActivityIntakeValidatedInput {
  inputText: string;
  title: string;
  source: ControlledActivityIntakeSource;
  durationMinutes: number | null;
  startedAt: string | null;
  endedAt: string | null;
  occurredAt: string | null;
  timezone: string | null;
  context: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export type ControlledActivityIntakeValidationResult =
  | {
      ok: true;
      value: ControlledActivityIntakeValidatedInput;
      issues: [];
    }
  | {
      ok: false;
      value: null;
      issues: ControlledActivityIntakeValidationIssue[];
    };

export interface ControlledActivityIntakeSemanticReadinessFlags {
  semanticProcessingNotStartedYet: true;
  categoryCandidatesCreated: false;
  metricCandidatesCreated: false;
  stateHookCandidatesCreated: false;
  valueObjectsCreated: false;
  stateFactsCreated: false;
  deltasCreated: false;
  snapshotsCreated: false;
}

export interface ControlledActivityIntakeGuardrails {
  activityEventIsSourceOfTruth: true;
  aiOutputIsCandidateOnly: true;
  noPersistencePerformed: true;
  noSupabaseWritePerformed: true;
  noAiCallPerformed: true;
  noRouteHandlerCreatedInThisBlock: true;
}

export interface ControlledActivityEventDraft {
  title: string;
  inputText: string;
  source: ControlledActivityIntakeSource;
  status: "raw_intake_pending_semantic_processing";
  durationMinutes: number | null;
  startedAt: string | null;
  endedAt: string | null;
  occurredAt: string | null;
  timezone: string | null;
  context: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface ControlledActivityIntakePayload {
  schemaVersion: ControlledActivityIntakeSchemaVersion;
  helperLayer: typeof CONTROLLED_ACTIVITY_INTAKE_HELPER_LAYER;
  generatedAt: string;
  activityEventDraft: ControlledActivityEventDraft;
  semanticReadiness: ControlledActivityIntakeSemanticReadinessFlags;
  guardrails: ControlledActivityIntakeGuardrails;
}