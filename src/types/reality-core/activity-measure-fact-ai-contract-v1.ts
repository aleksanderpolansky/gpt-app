export const ACTIVITY_MEASURE_VALUE_ORIGINS_V1 = [
  "user_explicit",
  "user_edit",
  "device_measurement",
  "document_extract",
  "identified_reference",
  "deterministic_calculation",
  "ai_estimate",
  "typical_reference",
  "system_default",
] as const;

export type ActivityMeasureValueOriginV1 =
  (typeof ACTIVITY_MEASURE_VALUE_ORIGINS_V1)[number];

export const ACTIVITY_MEASURE_SOURCE_RELIABILITY_V1 = [
  "authoritative",
  "identified_catalog",
  "device_reported",
  "user_reported",
  "deterministic",
  "inferred",
  "generic_reference",
] as const;

export type ActivityMeasureSourceReliabilityV1 =
  (typeof ACTIVITY_MEASURE_SOURCE_RELIABILITY_V1)[number];

export const ACTIVITY_SEMANTIC_MATCH_METHODS_V1 = [
  "manual",
  "exact_alias",
  "exact_primary_name",
  "rule_based",
  "ai_candidate",
  "user_confirmed",
  "import",
] as const;

export type ActivitySemanticMatchMethodV1 =
  (typeof ACTIVITY_SEMANTIC_MATCH_METHODS_V1)[number];

export type ActivityMeasureProvenanceV1 = {
  readonly measureId: string;
  readonly valueOriginCode: ActivityMeasureValueOriginV1;
  readonly sourceReliabilityCode: ActivityMeasureSourceReliabilityV1;
  readonly sourceReferenceTypeCode: string | null;
  readonly sourceReference: string | null;
  readonly sourceSnapshot: Record<string, unknown>;
  readonly identifiedEntity: Record<string, unknown>;
  readonly assumptionText: string | null;
  readonly semanticEnrichmentRunId: string | null;
};

export type ActivityTimeAccountingV1 = {
  readonly eventCount: number;
  readonly activityMinutes: number;
  readonly wallClockMinutes: number;
  readonly overlapActivityMinutes: number;
  readonly unplacedActivityMinutes: number;
  readonly maxConcurrentActivities: number;
};

export type AiProcessingInstructionCodeV1 =
  | "activity_decomposition"
  | "fact_extraction"
  | "number_source_selection"
  | "reference_identification"
  | "value_object_matching"
  | "uncertainty_disclosure";

export type AiProcessingInstructionRevisionV1 = {
  readonly instructionCode: AiProcessingInstructionCodeV1 | string;
  readonly localeCode: string;
  readonly revision: number;
  readonly instructionText: string;
  readonly createdAt: string;
};

export type ActorAiProcessingPreferenceV1 = {
  readonly ownerUserId: string;
  readonly ownerActorId: string;
  readonly localeCode: string;
  readonly revision: number;
  readonly customInstructionText: string | null;
};
