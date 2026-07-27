/**
 * ARCTor Reality Model v2 contracts.
 *
 * P2 is additive and framework-free:
 * - no database writes;
 * - no runtime route switch;
 * - no planning, state, evaluation or index contracts;
 * - no browser-supplied ownership identifiers are trusted.
 *
 * The current reality-core-v1 contract remains the production contract until
 * the later transactional fan-out package switches the save path atomically.
 */

import type { ParameterCode } from "./parameter-registry-v1";

export const REALITY_CORE_CONTRACT_VERSION_V2 = "reality-core-v2" as const;

export type RealityUuidV2 = string;
export type RealityIsoDateTimeV2 = string;
export type RealityJsonObjectV2 = Readonly<Record<string, unknown>>;

/**
 * Known seed codes retained for documentation and fixture compatibility.
 * Runtime-active branch policies must be loaded from
 * public.value_object_branch_types rather than validated against this tuple.
 */
export const VALUE_OBJECT_BRANCH_TYPE_CODES_V2 = [
  "external_capital",
  "internal_capability",
  "resource",
  "biological_system",
  "mediator_hormone",
] as const;
export type ValueObjectBranchTypeCodeV2 = string;

export const VALUE_OBJECT_NODE_ROLE_CODES_V2 = [
  "structural",
  "activity_leaf",
] as const;
export type ValueObjectNodeRoleCodeV2 =
  (typeof VALUE_OBJECT_NODE_ROLE_CODES_V2)[number];

export const VALUE_OBJECT_KINDS_V2 = [
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
  "activity_pattern",
  "other",
] as const;
export type ValueObjectKindV2 = (typeof VALUE_OBJECT_KINDS_V2)[number];

export const REALITY_OBJECT_RELATION_TYPE_CODES_V2 = [
  "performs",
  "counts_toward",
  "affects",
  "observes",
  "uses",
  "consumes",
  "creates",
  "transfers",
] as const;
export type RealityObjectRelationTypeCodeV2 =
  (typeof REALITY_OBJECT_RELATION_TYPE_CODES_V2)[number];

export const REALITY_ACTIVITY_TEMPORAL_DIRECTIONS_V2 = [
  "past",
  "future",
] as const;
export type RealityActivityTemporalDirectionV2 =
  (typeof REALITY_ACTIVITY_TEMPORAL_DIRECTIONS_V2)[number];

export const REALITY_ACTIVITY_STATUSES_V2 = [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
  "corrected",
  "deleted",
] as const;
export type RealityActivityStatusV2 =
  (typeof REALITY_ACTIVITY_STATUSES_V2)[number];

export const REALITY_ACTIVITY_SOURCE_TYPES_V2 = [
  "user_text",
  "user_edit",
  "device_import",
  "external_api",
  "system",
  "ai_assisted",
] as const;
export type RealityActivitySourceTypeV2 =
  (typeof REALITY_ACTIVITY_SOURCE_TYPES_V2)[number];

export const REALITY_PRIVACY_LEVELS_V2 = [
  "private",
  "shared",
  "public",
] as const;
export type RealityPrivacyLevelV2 =
  (typeof REALITY_PRIVACY_LEVELS_V2)[number];

export const REALITY_MEASURE_SOURCE_TYPES_V2 = [
  "user_reported",
  "user_edited",
  "device_imported",
  "external_api_imported",
  "rule_derived",
  "ai_extracted",
  "system_default",
] as const;
export type RealityMeasureSourceTypeV2 =
  (typeof REALITY_MEASURE_SOURCE_TYPES_V2)[number];

export const REALITY_OBJECT_FACT_STATUSES_V2 = [
  "proposed",
  "confirmed",
  "corrected",
  "rejected",
  "superseded",
] as const;
export type RealityObjectFactStatusV2 =
  (typeof REALITY_OBJECT_FACT_STATUSES_V2)[number];

export const REALITY_LINK_STATUSES_V2 = [
  "proposed",
  "confirmed",
  "rejected",
] as const;
export type RealityLinkStatusV2 =
  (typeof REALITY_LINK_STATUSES_V2)[number];

export type RealityMeasuredParameterCodeV2 = Exclude<
  ParameterCode,
  "observed_at"
>;

export interface RealityActorContextV2 {
  readonly performedByActorId: RealityUuidV2;
  readonly actingAsActorId: RealityUuidV2;
  readonly initiatedByActorId: RealityUuidV2 | null;
  readonly beneficiaryActorId: RealityUuidV2 | null;
  readonly recordedByActorId: RealityUuidV2 | null;
  readonly actingRoleCode: string | null;
}

export type ValueObjectTreeIdentityV2 =
  | {
      readonly nodeRoleCode: "structural";
      readonly objectKind: ValueObjectKindV2;
      readonly branchTypeCode: ValueObjectBranchTypeCodeV2;
      readonly rootValueObjectId: RealityUuidV2;
      readonly parentValueObjectId: RealityUuidV2 | null;
      readonly instanceOfValueObjectId: RealityUuidV2 | null;
    }
  | {
      readonly nodeRoleCode: "activity_leaf";
      readonly objectKind: "activity_pattern";
      readonly branchTypeCode: ValueObjectBranchTypeCodeV2;
      readonly rootValueObjectId: RealityUuidV2;
      readonly parentValueObjectId: RealityUuidV2;
      readonly instanceOfValueObjectId: RealityUuidV2 | null;
    };

export interface RealityActivityInputV2 {
  readonly title: string;
  readonly inputText: string;
  readonly description: string | null;
  readonly activityTypeId: RealityUuidV2 | null;
  readonly activityTemplateId: RealityUuidV2 | null;
  readonly temporalDirection: RealityActivityTemporalDirectionV2;
  readonly status: RealityActivityStatusV2;
  readonly startedAt: RealityIsoDateTimeV2;
  readonly endedAt: RealityIsoDateTimeV2 | null;
  readonly durationMinutes: number | null;
  readonly timezone: string;
  readonly locationId: RealityUuidV2 | null;
  readonly sourceType: RealityActivitySourceTypeV2;
  readonly sourceExternalId: string | null;
  readonly privacy: RealityPrivacyLevelV2;
  readonly idempotencyKey: string;
  readonly metadata: RealityJsonObjectV2;
}

export type RealityMeasureValueV2 =
  | {
      readonly valueType: "numeric";
      readonly valueNumeric: number;
    }
  | {
      readonly valueType: "text";
      readonly valueText: string;
    }
  | {
      readonly valueType: "boolean";
      readonly valueBoolean: boolean;
    };

export type RealityMeasureTimeV2 =
  | {
      readonly timeKind: "point";
      readonly observedAt: RealityIsoDateTimeV2 | null;
      readonly periodStart: null;
      readonly periodEnd: null;
    }
  | {
      readonly timeKind: "interval";
      readonly observedAt: RealityIsoDateTimeV2 | null;
      readonly periodStart: RealityIsoDateTimeV2;
      readonly periodEnd: RealityIsoDateTimeV2;
    };

export interface RealityMeasureDerivationV2 {
  readonly isDerived: boolean;
  readonly derivationMethod: string | null;
  readonly derivationVersion: string | null;
  readonly sourceLocalMeasureIds: readonly string[];
}

export interface RealityMeasureInputV2 {
  readonly localMeasureId: string;
  readonly parameterCode: RealityMeasuredParameterCodeV2;
  readonly value: RealityMeasureValueV2;
  readonly unitCode: string;
  readonly time: RealityMeasureTimeV2;
  readonly sourceType: RealityMeasureSourceTypeV2;
  readonly confidence: number;
  readonly derivation: RealityMeasureDerivationV2;
  readonly rawFragment: string | null;
  readonly normalizedFragment: string | null;
  readonly metadata: RealityJsonObjectV2;
}

export type RealityObjectFactTargetV2 =
  | {
      readonly targetType: "existing_activity_leaf";
      readonly valueObjectId: RealityUuidV2;
      readonly semanticObjectKey: null;
      readonly semanticObjectLabel: null;
    }
  | {
      readonly targetType: "semantic_candidate";
      readonly valueObjectId: null;
      readonly semanticObjectKey: string;
      readonly semanticObjectLabel: string;
    };

/**
 * An object fact binds one existing neutral measure to one leaf or candidate.
 * It intentionally contains no value_*, unit or parameter fields.
 */
export interface RealityObjectFactInputV2 {
  readonly localObjectFactId: string;
  readonly localMeasureId: string;
  readonly target: RealityObjectFactTargetV2;
  readonly relationTypeCode: RealityObjectRelationTypeCodeV2;
  readonly status: RealityObjectFactStatusV2;
  readonly confidence: number;
  readonly sourceType: RealityMeasureSourceTypeV2;
  readonly evidenceJson: RealityJsonObjectV2;
  readonly idempotencyKey: string;
  readonly metadata: RealityJsonObjectV2;
}

/**
 * Direct event-to-object relation for associations that do not create a
 * measurement-backed object fact.
 */
export interface RealityActivityObjectLinkInputV2 {
  readonly localLinkId: string;
  readonly valueObjectId: RealityUuidV2;
  readonly relationTypeCode: RealityObjectRelationTypeCodeV2;
  readonly status: RealityLinkStatusV2;
  readonly confidence: number;
  readonly evidenceJson: RealityJsonObjectV2;
}

export interface RealityCoreSaveRequestV2 {
  readonly contractVersion: typeof REALITY_CORE_CONTRACT_VERSION_V2;
  readonly sourcePackageId: string;
  readonly actorContext: RealityActorContextV2;
  readonly activity: RealityActivityInputV2;
  readonly measures: readonly RealityMeasureInputV2[];
  readonly objectFacts: readonly RealityObjectFactInputV2[];
  readonly activityObjectLinks: readonly RealityActivityObjectLinkInputV2[];
}

export interface RealityCoreSaveResponseV2 {
  readonly ok: boolean;
  readonly contractVersion: typeof REALITY_CORE_CONTRACT_VERSION_V2;
  readonly writeStatus: "written" | "idempotent_replay" | "failed";
  readonly activityEventId: RealityUuidV2 | null;
  readonly measureIdsByLocalId: Readonly<Record<string, RealityUuidV2>>;
  readonly objectFactIdsByLocalId: Readonly<Record<string, RealityUuidV2>>;
  readonly activityLinkIdsByLocalId: Readonly<
    Record<string, RealityUuidV2>
  >;
  readonly errorCode: string | null;
}

export function assertRealityConfidenceV2(
  value: number,
  fieldName: string,
): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${fieldName} must be a finite number from 0 to 1.`);
  }
}

export function assertRealityMeasureValueV2(
  value: RealityMeasureValueV2,
): void {
  switch (value.valueType) {
    case "numeric":
      if (!Number.isFinite(value.valueNumeric)) {
        throw new Error("Numeric measure value must be finite.");
      }
      return;
    case "text":
      if (value.valueText.trim().length === 0) {
        throw new Error("Text measure value must not be empty.");
      }
      return;
    case "boolean":
      return;
    default: {
      const exhaustive: never = value;
      throw new Error(`Unsupported measure value: ${String(exhaustive)}`);
    }
  }
}
