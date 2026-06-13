// GPT-APP / AI-NAVIGATOR
// Value Object Characteristics / Relations / Measures / Rollup contracts
// Architecture status: draft contracts only.
// Runtime status: no DB writes, no SQL execution, no OpenAI calls.
// Created from docs/architecture/value-object-characteristics-rollup-lock.md

export type ValueObjectUsageScope = "private" | "commercial";

export type ValueObjectDraftStatus =
  | "draft"
  | "candidate"
  | "needs_review"
  | "confirmed"
  | "archived";

export type ValueObjectObservationProfile =
  | "generic"
  | "physical_object"
  | "activity"
  | "exercise"
  | "body_part"
  | "muscle"
  | "skill"
  | "goal"
  | "learning"
  | "family_duty"
  | "health_observation"
  | "commercial_product"
  | "commercial_service"
  | "certificate_base"
  | "abstract_category";

export type CharacteristicValueKind =
  | "text"
  | "number"
  | "boolean"
  | "enum"
  | "date"
  | "duration"
  | "quantity"
  | "json"
  | "value_object_ref";

export type CharacteristicApplicability =
  | "optional"
  | "recommended"
  | "required_by_profile"
  | "system_only";

export type CharacteristicSource =
  | "manual"
  | "ai_candidate"
  | "system_default"
  | "template"
  | "import"
  | "external_standard";

export type CandidateConfirmationStatus =
  | "candidate"
  | "user_confirmed"
  | "system_confirmed"
  | "rejected"
  | "superseded";

export interface CharacteristicDefinition {
  id: string;
  key: string;
  label: string;
  description?: string;
  valueKind: CharacteristicValueKind;
  recommendedUnit?: string;
  allowedUnits?: string[];
  allowedValues?: string[];
  applicableProfiles: ValueObjectObservationProfile[];
  applicability: CharacteristicApplicability;
  source: CharacteristicSource;
  status: CandidateConfirmationStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ValueObjectCharacteristic {
  id: string;
  valueObjectId: string;
  characteristicDefinitionId: string;
  key: string;
  valueText?: string;
  valueNumber?: number;
  valueBoolean?: boolean;
  valueJson?: unknown;
  valueObjectRefId?: string;
  unit?: string;
  confidence?: number;
  source: CharacteristicSource;
  status: CandidateConfirmationStatus;
  note?: string;
  createdByActorId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type EventMeasureValueKind =
  | "duration"
  | "count"
  | "weight"
  | "distance"
  | "intensity"
  | "energy"
  | "heart_rate"
  | "text"
  | "number"
  | "json";

export type EventMeasureSource =
  | "manual"
  | "ai_candidate"
  | "wearable"
  | "timer"
  | "import"
  | "calculated";

export interface ActivityEventMeasure {
  id: string;
  activityEventId: string;
  valueObjectId?: string;
  key: string;
  label: string;
  valueKind: EventMeasureValueKind;
  valueText?: string;
  valueNumber?: number;
  valueJson?: unknown;
  unit?: string;
  source: EventMeasureSource;
  status: CandidateConfirmationStatus;
  confidence?: number;
  measuredAt?: string;
  createdAt?: string;
}

export type ValueObjectRelationType =
  | "part_of"
  | "has_part"
  | "affects"
  | "affected_by"
  | "supports"
  | "stabilizes"
  | "requires"
  | "improves"
  | "worsens"
  | "belongs_to_domain"
  | "commercial_variant_of"
  | "private_variant_of"
  | "derived_from"
  | "similar_to";

export interface ValueObjectRelation {
  id: string;
  fromValueObjectId: string;
  toValueObjectId: string;
  relationType: ValueObjectRelationType;
  weight?: number;
  confidence?: number;
  source: CharacteristicSource;
  status: CandidateConfirmationStatus;
  note?: string;
  createdByActorId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ImpactRuleDirection = "direct" | "upstream_rollup" | "downstream_projection";

export interface ImpactRule {
  id: string;
  sourceValueObjectId: string;
  targetValueObjectId: string;
  relationType: ValueObjectRelationType;
  direction: ImpactRuleDirection;
  impactWeight: number;
  confidence?: number;
  source: CharacteristicSource;
  status: CandidateConfirmationStatus;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AnalyticsRollupPeriod = "event" | "day" | "week" | "month" | "custom";

export type AnalyticsRollupMetric =
  | "duration_minutes"
  | "repetitions"
  | "sets"
  | "load_kg"
  | "volume_estimate"
  | "attention_score"
  | "recovery_load"
  | "frequency_count"
  | "custom";

export interface AnalyticsRollupPreviewItem {
  id: string;
  sourceActivityEventId?: string;
  sourceValueObjectId: string;
  targetValueObjectId: string;
  metric: AnalyticsRollupMetric;
  period: AnalyticsRollupPeriod;
  rawValue: number;
  weightedValue: number;
  unit?: string;
  relationPath: string[];
  confidence?: number;
  isPersisted: false;
}

export interface ValueObjectCharacteristicCandidatePackage {
  candidateId: string;
  rawInput: string;
  candidateValueObject: {
    title: string;
    usageScope: ValueObjectUsageScope;
    observationProfile: ValueObjectObservationProfile;
    status: ValueObjectDraftStatus;
  };
  characteristics: ValueObjectCharacteristic[];
  eventMeasures: ActivityEventMeasure[];
  relations: ValueObjectRelation[];
  impactRules: ImpactRule[];
  rollupPreview: AnalyticsRollupPreviewItem[];
  safety: {
    noDbWrites: true;
    noSqlExecution: true;
    noOpenAiCallRequired: boolean;
    candidateFirst: true;
  };
}

export const VO_CHARACTERISTICS_ROLLUP_ARCHITECTURE_VERSION =
  "vo-characteristics-rollup-lock-2026-06-13" as const;

export const VO_CHARACTERISTICS_ROLLUP_NO_WRITE_GUARD = {
  noDbWrites: true,
  noSqlExecution: true,
  candidateFirst: true,
  rollupsAreDerived: true,
  eventMeasuresAreNotObjectCharacteristics: true,
} as const;

export const EXERCISE_EXAMPLE_PROFILE: ValueObjectObservationProfile = "exercise";

export const EXERCISE_EXAMPLE_RELATION_TYPES: ValueObjectRelationType[] = [
  "affects",
  "part_of",
  "supports",
  "stabilizes",
];
