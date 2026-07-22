/**
 * ARCTor Reality Core R1-2
 * Canonical contracts for Activity -> neutral facts -> Value Objects -> standards.
 *
 * This file is intentionally framework-free. It performs no DB writes and trusts
 * no browser-supplied ownership identifiers. The API layer must resolve all actor
 * IDs from the authenticated account before calling the transactional RPC.
 */

export const REALITY_CORE_CONTRACT_VERSION = "reality-core-v1" as const;

export const ACTIVITY_TEMPORAL_DIRECTIONS = ["past", "future"] as const;
export type ActivityTemporalDirection =
  (typeof ACTIVITY_TEMPORAL_DIRECTIONS)[number];

export const ACTIVITY_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
  "corrected",
  "deleted",
] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export const ACTIVITY_SOURCE_TYPES = [
  "user_text",
  "user_edit",
  "device_import",
  "external_api",
  "system",
  "ai_assisted",
] as const;
export type ActivitySourceType = (typeof ACTIVITY_SOURCE_TYPES)[number];

export const ACTIVITY_PRIVACY_LEVELS = [
  "private",
  "shared",
  "public",
] as const;
export type ActivityPrivacyLevel =
  (typeof ACTIVITY_PRIVACY_LEVELS)[number];

export const FACT_STATUSES = [
  "proposed",
  "confirmed",
  "corrected",
  "rejected",
  "superseded",
  "deleted",
] as const;
export type FactStatus = (typeof FACT_STATUSES)[number];

export const FACT_SOURCE_TYPES = [
  "user_reported",
  "user_edited",
  "device_imported",
  "external_api_imported",
  "rule_derived",
  "ai_extracted",
  "system_default",
] as const;
export type FactSourceType = (typeof FACT_SOURCE_TYPES)[number];

export const VALUE_OBJECT_KINDS = [
  "asset",
  "person",
  "relationship",
  "skill",
  "knowledge",
  "project",
  "content",
  "product_type",
  "service_type",
  "instance",
  "right",
  "resource",
  "state",
  "symptom",
  "risk",
  "goal",
  "process",
  "reputation",
  "lifestyle",
  "other",
] as const;
export type ValueObjectKind = (typeof VALUE_OBJECT_KINDS)[number];

export const VALUE_OBJECT_VISIBILITIES = [
  "private",
  "shared",
  "public",
] as const;
export type ValueObjectVisibility =
  (typeof VALUE_OBJECT_VISIBILITIES)[number];

export const ACTIVITY_VALUE_OBJECT_RELATIONS = [
  "affects",
  "observes",
  "creates",
  "transfers",
  "consumes",
  "repairs",
  "reserves",
  "fulfills",
  "uses",
  "motivated_by",
  "aims_at",
] as const;
export type ActivityValueObjectRelation =
  (typeof ACTIVITY_VALUE_OBJECT_RELATIONS)[number];

export const FACT_VALUE_OBJECT_RELATIONS = [
  "observed_for",
  "changes_state_of",
  "relevant_to",
  "evaluated_against",
] as const;
export type FactValueObjectRelation =
  (typeof FACT_VALUE_OBJECT_RELATIONS)[number];

export const VALUE_OBJECT_RELATIONS = [
  "instance_of",
  "part_of",
  "supports",
  "threatens",
  "enables",
  "prevents",
  "conflicts_with",
  "depends_on",
  "replaces",
] as const;
export type ValueObjectRelation =
  (typeof VALUE_OBJECT_RELATIONS)[number];

export const LINK_STATUSES = [
  "proposed",
  "confirmed",
  "rejected",
] as const;
export type LinkStatus = (typeof LINK_STATUSES)[number];

export const STANDARD_RULE_TYPES = [
  "desired_minimum",
  "desired_maximum",
  "desired_range",
  "exact_target",
  "frequency_minimum",
] as const;
export type StandardRuleType = (typeof STANDARD_RULE_TYPES)[number];

export const STANDARD_STATUSES = ["proposed", "active", "retired"] as const;
export type StandardStatus = (typeof STANDARD_STATUSES)[number];

export const AGGREGATION_METHODS = [
  "sum",
  "average",
  "minimum",
  "maximum",
  "latest",
  "count",
  "duration",
  "rate",
  "none",
] as const;
export type AggregationMethod = (typeof AGGREGATION_METHODS)[number];

export const WINDOW_CODES = [
  "event",
  "hour",
  "day",
  "week",
  "month",
  "rolling_7_days",
  "rolling_30_days",
] as const;
export type WindowCode = (typeof WINDOW_CODES)[number];

export const EVALUATION_DIRECTIONS = [
  "below_target",
  "within_target",
  "above_target",
  "not_comparable",
] as const;
export type EvaluationDirection =
  (typeof EVALUATION_DIRECTIONS)[number];

export type Uuid = string;
export type IsoDateTime = string;
export type JsonObject = Readonly<Record<string, unknown>>;

/**
 * Actor IDs must be resolved and authorized server-side.
 * - performedByActorId: who directly performed the action.
 * - actingAsActorId: identity/profile/organization represented during the action.
 * - initiatedByActorId: who requested, ordered or triggered the action.
 * - beneficiaryActorId: in whose interests the action was performed.
 * - recordedByActorId: who or what recorded/imported the action.
 */
export interface RealityActorContext {
  readonly performedByActorId: Uuid;
  readonly actingAsActorId: Uuid;
  readonly initiatedByActorId: Uuid | null;
  readonly beneficiaryActorId: Uuid | null;
  readonly recordedByActorId: Uuid | null;
  readonly actingRoleCode: string | null;
}

export interface RealityActivityInput {
  readonly title: string;
  readonly inputText: string;
  readonly description: string | null;
  readonly activityTypeCode: string;
  readonly activityTemplateId: Uuid | null;
  readonly temporalDirection: ActivityTemporalDirection;
  readonly status: ActivityStatus;
  readonly startedAt: IsoDateTime;
  readonly endedAt: IsoDateTime | null;
  readonly timezone: string;
  readonly sourceType: ActivitySourceType;
  readonly sourceExternalId: string | null;
  readonly privacy: ActivityPrivacyLevel;
  readonly idempotencyKey: string;
  readonly metadata: JsonObject;
}

export type RealityFactValue =
  | { readonly valueType: "numeric"; readonly valueNumeric: number }
  | { readonly valueType: "text"; readonly valueText: string }
  | { readonly valueType: "boolean"; readonly valueBoolean: boolean }
  | { readonly valueType: "timestamp"; readonly valueTimestamp: IsoDateTime };

/** Neutral fact/measurement. No good/bad sign is stored here. */
export interface RealityFactInput {
  readonly localFactId: string;
  readonly parameterCode: string;
  readonly value: RealityFactValue;
  readonly unitCode: string;
  readonly periodStart: IsoDateTime;
  readonly periodEnd: IsoDateTime | null;
  readonly sourceType: FactSourceType;
  readonly confidence: number;
  readonly status: FactStatus;
  readonly isDerived: boolean;
  readonly derivedFromLocalFactIds: readonly string[];
  readonly derivationMethod: string | null;
  readonly derivationVersion: string | null;
  readonly evidenceText: string | null;
  readonly idempotencyKey: string;
  readonly metadata: JsonObject;
}

export interface RealityActivityValueObjectLinkInput {
  readonly localLinkId: string;
  readonly valueObjectId: Uuid;
  readonly relationType: ActivityValueObjectRelation;
  readonly status: LinkStatus;
  readonly confidence: number;
  readonly weight: number | null;
  readonly evidenceText: string | null;
}

/** Binding of one neutral fact to one Value Object without copying the value. */
export interface RealityFactValueObjectBindingInput {
  readonly localBindingId: string;
  readonly localFactId: string;
  readonly valueObjectId: Uuid;
  readonly relationType: FactValueObjectRelation;
  readonly status: LinkStatus;
  readonly confidence: number;
  readonly evidenceText: string | null;
}

export interface RealityCoreSaveRequest {
  readonly contractVersion: typeof REALITY_CORE_CONTRACT_VERSION;
  readonly sourcePackageId: string;
  readonly actorContext: RealityActorContext;
  readonly activity: RealityActivityInput;
  readonly facts: readonly RealityFactInput[];
  readonly activityValueObjectLinks: readonly RealityActivityValueObjectLinkInput[];
  readonly factValueObjectBindings: readonly RealityFactValueObjectBindingInput[];
}

export interface RealityCoreSaveResponse {
  readonly ok: boolean;
  readonly contractVersion: typeof REALITY_CORE_CONTRACT_VERSION;
  readonly writeStatus: "written" | "idempotent_replay" | "failed";
  readonly activityEventId: Uuid | null;
  readonly factIdsByLocalId: Readonly<Record<string, Uuid>>;
  readonly activityLinkIdsByLocalId: Readonly<Record<string, Uuid>>;
  readonly factBindingIdsByLocalId: Readonly<Record<string, Uuid>>;
  readonly errorCode: string | null;
}

export interface RealityTargetStandardInput {
  readonly valueObjectId: Uuid;
  readonly parameterCode: string;
  readonly ruleType: StandardRuleType;
  readonly targetValue: number | null;
  readonly targetMin: number | null;
  readonly targetMax: number | null;
  readonly unitCode: string;
  readonly aggregationMethod: AggregationMethod;
  readonly windowCode: WindowCode;
  readonly validFrom: IsoDateTime;
  readonly validTo: IsoDateTime | null;
  readonly version: number;
  readonly reviewAt: IsoDateTime | null;
  readonly status: StandardStatus;
  readonly sourceType: "user_defined" | "system_default" | "professional_guideline";
  readonly confidence: number;
  readonly context: JsonObject;
  readonly safetyNote: string | null;
}

/** Evaluation is derived and recalculable; the source fact remains unchanged. */
export interface RealityEvaluationResult {
  readonly valueObjectId: Uuid;
  readonly parameterCode: string;
  readonly standardId: Uuid;
  readonly standardVersion: number;
  readonly actualValue: number | null;
  readonly actualUnitCode: string;
  readonly targetValue: number | null;
  readonly targetMin: number | null;
  readonly targetMax: number | null;
  readonly direction: EvaluationDirection;
  readonly deviationAbsolute: number | null;
  readonly deviationPercent: number | null;
  readonly severity: number | null;
  readonly confidence: number;
  readonly explanationCode: string;
}

export function assertConfidence(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${fieldName} must be a finite number from 0 to 1.`);
  }
}

export function assertExactlyOneFactValue(value: RealityFactValue): void {
  switch (value.valueType) {
    case "numeric":
      if (!Number.isFinite(value.valueNumeric)) {
        throw new Error("Numeric fact value must be finite.");
      }
      return;
    case "text":
      if (value.valueText.trim().length === 0) {
        throw new Error("Text fact value must not be empty.");
      }
      return;
    case "boolean":
      return;
    case "timestamp":
      if (Number.isNaN(Date.parse(value.valueTimestamp))) {
        throw new Error("Timestamp fact value must be a valid ISO date-time.");
      }
      return;
    default: {
      const exhaustive: never = value;
      throw new Error(`Unsupported fact value: ${String(exhaustive)}`);
    }
  }
}
