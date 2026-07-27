/**
 * ARCTor.app Reality Model v3 / P5 field lock.
 *
 * This file is a compile-time and deterministic runtime contract only.
 * It does not call Supabase, OpenAI, or any production write route.
 */

import type { ParameterCode } from "./parameter-registry-v1";
import type {
  ValueObjectBranchTypeCodeV2,
  ValueObjectKindV2,
  ValueObjectNodeRoleCodeV2,
} from "./reality-core-contracts-v2";

export const REALITY_MODEL_FIELD_LOCK_VERSION_V3 =
  "reality-model-v3-p5" as const;

export type RealityModelUuidV3 = string;
export type RealityModelIsoDateTimeV3 = string;
export type RealityModelJsonPrimitiveV3 = string | number | boolean | null;
export interface RealityModelJsonObjectV3 {
  readonly [key: string]: RealityModelJsonValueV3;
}
export type RealityModelJsonValueV3 =
  | RealityModelJsonPrimitiveV3
  | RealityModelJsonObjectV3
  | readonly RealityModelJsonValueV3[];

export const VALUE_OBJECT_PAGE_NODE_KINDS_V3 = [
  "root",
  "intermediate",
  "leaf",
] as const;
export type ValueObjectPageNodeKindV3 =
  (typeof VALUE_OBJECT_PAGE_NODE_KINDS_V3)[number];

export const VALUE_OBJECT_LIFECYCLE_STATUS_CODES_V3 = [
  "draft",
  "active",
  "inactive",
  "retired",
] as const;
export type ValueObjectLifecycleStatusCodeV3 =
  (typeof VALUE_OBJECT_LIFECYCLE_STATUS_CODES_V3)[number];

export const VALUE_OBJECT_VISIBILITY_CODES_V3 = [
  "private",
  "shared",
  "public",
] as const;
export type ValueObjectVisibilityCodeV3 =
  (typeof VALUE_OBJECT_VISIBILITY_CODES_V3)[number];

export const VALUE_OBJECT_PRIVACY_LEVEL_CODES_V3 = [
  "private",
  "shared",
  "public",
] as const;
export type ValueObjectPrivacyLevelCodeV3 =
  (typeof VALUE_OBJECT_PRIVACY_LEVEL_CODES_V3)[number];

export const VALUE_OBJECT_SENSITIVITY_LEVEL_CODES_V3 = [
  "standard",
  "sensitive",
  "restricted",
] as const;
export type ValueObjectSensitivityLevelCodeV3 =
  (typeof VALUE_OBJECT_SENSITIVITY_LEVEL_CODES_V3)[number];

export const VALUE_OBJECT_FIELD_STORAGE_CODES_V3 = [
  "value_objects",
  "value_object_attribute_registry",
  "value_object_profile_attributes",
  "value_object_outcome_criteria",
  "value_object_relation_types",
  "value_object_relations",
  "value_object_parameter_assignments",
  "value_object_target_standards",
  "derived_read_model",
] as const;
export type ValueObjectFieldStorageCodeV3 =
  (typeof VALUE_OBJECT_FIELD_STORAGE_CODES_V3)[number];

export interface ValueObjectFieldDecisionV3 {
  readonly fieldCode: string;
  readonly storage: ValueObjectFieldStorageCodeV3;
  readonly rootPolicy: "required" | "optional" | "derived" | "forbidden";
  readonly intermediatePolicy:
    | "required"
    | "optional"
    | "derived"
    | "forbidden";
  readonly leafPolicy: "required" | "optional" | "derived" | "forbidden";
  readonly writableByClient: false;
  readonly writableByServer: boolean;
  readonly notes: string;
}

/**
 * Canonical field matrix for the first root/intermediate/leaf authoring pages.
 * Browser payloads never supply trusted owner_user_id or owner_actor_id.
 */
export const VALUE_OBJECT_FIELD_DECISIONS_V3 = [
  {
    fieldCode: "id",
    storage: "value_objects",
    rootPolicy: "derived",
    intermediatePolicy: "derived",
    leafPolicy: "derived",
    writableByClient: false,
    writableByServer: true,
    notes: "Database-generated UUID.",
  },
  {
    fieldCode: "title",
    storage: "value_objects",
    rootPolicy: "required",
    intermediatePolicy: "required",
    leafPolicy: "required",
    writableByClient: false,
    writableByServer: true,
    notes: "Human-readable object title.",
  },
  {
    fieldCode: "description",
    storage: "value_objects",
    rootPolicy: "optional",
    intermediatePolicy: "optional",
    leafPolicy: "optional",
    writableByClient: false,
    writableByServer: true,
    notes: "Human-readable scope and meaning.",
  },
  {
    fieldCode: "object_kind",
    storage: "value_objects",
    rootPolicy: "required",
    intermediatePolicy: "required",
    leafPolicy: "derived",
    writableByClient: false,
    writableByServer: true,
    notes: "Leaf is always activity_pattern; structural nodes use a reviewed kind.",
  },
  {
    fieldCode: "node_role_code",
    storage: "value_objects",
    rootPolicy: "derived",
    intermediatePolicy: "derived",
    leafPolicy: "derived",
    writableByClient: false,
    writableByServer: true,
    notes: "root/intermediate=structural; leaf=activity_leaf.",
  },
  {
    fieldCode: "branch_type_code",
    storage: "value_objects",
    rootPolicy: "required",
    intermediatePolicy: "derived",
    leafPolicy: "derived",
    writableByClient: false,
    writableByServer: true,
    notes: "Selected for root and inherited by descendants.",
  },
  {
    fieldCode: "root_value_object_id",
    storage: "value_objects",
    rootPolicy: "derived",
    intermediatePolicy: "derived",
    leafPolicy: "derived",
    writableByClient: false,
    writableByServer: true,
    notes: "Root references itself; descendants inherit it from parent.",
  },
  {
    fieldCode: "parent_value_object_id",
    storage: "value_objects",
    rootPolicy: "forbidden",
    intermediatePolicy: "required",
    leafPolicy: "required",
    writableByClient: false,
    writableByServer: true,
    notes: "Stores only the part_of tree edge.",
  },
  {
    fieldCode: "instance_of_value_object_id",
    storage: "value_objects",
    rootPolicy: "optional",
    intermediatePolicy: "optional",
    leafPolicy: "optional",
    writableByClient: false,
    writableByServer: true,
    notes: "Optional type/model edge, independent from parent.",
  },
  {
    fieldCode: "owner_user_id",
    storage: "value_objects",
    rootPolicy: "derived",
    intermediatePolicy: "derived",
    leafPolicy: "derived",
    writableByClient: false,
    writableByServer: true,
    notes: "Resolved from Auth0 session on the server.",
  },
  {
    fieldCode: "owner_actor_id",
    storage: "value_objects",
    rootPolicy: "derived",
    intermediatePolicy: "derived",
    leafPolicy: "derived",
    writableByClient: false,
    writableByServer: true,
    notes: "Resolved from the active actor context on the server.",
  },
  {
    fieldCode: "created_by_actor_id",
    storage: "value_objects",
    rootPolicy: "derived",
    intermediatePolicy: "derived",
    leafPolicy: "derived",
    writableByClient: false,
    writableByServer: true,
    notes: "Server audit identity.",
  },
  {
    fieldCode: "space_id",
    storage: "value_objects",
    rootPolicy: "optional",
    intermediatePolicy: "optional",
    leafPolicy: "optional",
    writableByClient: false,
    writableByServer: true,
    notes: "Optional workspace context.",
  },
  {
    fieldCode: "organization_id",
    storage: "value_objects",
    rootPolicy: "optional",
    intermediatePolicy: "optional",
    leafPolicy: "optional",
    writableByClient: false,
    writableByServer: true,
    notes: "Optional enterprise context; not a replacement for actor ownership.",
  },
  {
    fieldCode: "status",
    storage: "value_objects",
    rootPolicy: "derived",
    intermediatePolicy: "derived",
    leafPolicy: "derived",
    writableByClient: false,
    writableByServer: true,
    notes: "New objects start as draft.",
  },
  {
    fieldCode: "visibility",
    storage: "value_objects",
    rootPolicy: "derived",
    intermediatePolicy: "derived",
    leafPolicy: "derived",
    writableByClient: false,
    writableByServer: true,
    notes: "New objects start private.",
  },
  {
    fieldCode: "valid_from",
    storage: "value_objects",
    rootPolicy: "optional",
    intermediatePolicy: "optional",
    leafPolicy: "optional",
    writableByClient: false,
    writableByServer: true,
    notes: "Object existence interval, not an analytics window.",
  },
  {
    fieldCode: "valid_to",
    storage: "value_objects",
    rootPolicy: "optional",
    intermediatePolicy: "optional",
    leafPolicy: "optional",
    writableByClient: false,
    writableByServer: true,
    notes: "Object existence interval, not an analytics window.",
  },
  {
    fieldCode: "privacy_level",
    storage: "value_objects",
    rootPolicy: "derived",
    intermediatePolicy: "derived",
    leafPolicy: "derived",
    writableByClient: false,
    writableByServer: true,
    notes: "Defaults to private.",
  },
  {
    fieldCode: "sensitivity_level",
    storage: "value_objects",
    rootPolicy: "derived",
    intermediatePolicy: "derived",
    leafPolicy: "derived",
    writableByClient: false,
    writableByServer: true,
    notes: "Defaults to standard; does not change owner boundary.",
  },
  {
    fieldCode: "identity_attributes_json",
    storage: "value_objects",
    rootPolicy: "optional",
    intermediatePolicy: "optional",
    leafPolicy: "optional",
    writableByClient: false,
    writableByServer: true,
    notes: "Stable identity attributes only; branch-specific fields use typed attributes.",
  },
  {
    fieldCode: "source",
    storage: "value_objects",
    rootPolicy: "derived",
    intermediatePolicy: "derived",
    leafPolicy: "derived",
    writableByClient: false,
    writableByServer: true,
    notes: "Creation source; manual for initial authoring.",
  },
  {
    fieldCode: "needs_user_review",
    storage: "value_objects",
    rootPolicy: "derived",
    intermediatePolicy: "derived",
    leafPolicy: "derived",
    writableByClient: false,
    writableByServer: true,
    notes: "Workflow flag, not a substitute for draft status.",
  },
  {
    fieldCode: "semantic_signature",
    storage: "derived_read_model",
    rootPolicy: "derived",
    intermediatePolicy: "derived",
    leafPolicy: "derived",
    writableByClient: false,
    writableByServer: false,
    notes: "Rebuildable semantic index; never the canonical object identity.",
  },
  {
    fieldCode: "metadata_json",
    storage: "value_objects",
    rootPolicy: "optional",
    intermediatePolicy: "optional",
    leafPolicy: "optional",
    writableByClient: false,
    writableByServer: true,
    notes: "Only non-canonical supplemental data.",
  },
] as const satisfies readonly ValueObjectFieldDecisionV3[];

/** Existing commercial/planning columns remain physically present but are not
 * part of new Reality Model v3 root/intermediate/leaf write contracts. */
export const VALUE_OBJECT_RESERVED_LEGACY_FIELDS_V3 = [
  "unit_type",
  "default_price",
  "default_currency",
  "default_duration_minutes",
  "is_marketplace_sellable",
  "is_free_possible",
  "commercial_usage",
  "usage_scope",
] as const;

export interface ValueObjectCreateIdentityV3 {
  readonly pageNodeKind: ValueObjectPageNodeKindV3;
  readonly title: string;
  readonly description: string | null;
  readonly objectKind: ValueObjectKindV2;
  readonly nodeRoleCode: ValueObjectNodeRoleCodeV2;
  readonly branchTypeCode: ValueObjectBranchTypeCodeV2;
  readonly parentValueObjectId: RealityModelUuidV3 | null;
  readonly instanceOfValueObjectId: RealityModelUuidV3 | null;
  readonly validFrom: RealityModelIsoDateTimeV3 | null;
  readonly validTo: RealityModelIsoDateTimeV3 | null;
  readonly privacyLevel: ValueObjectPrivacyLevelCodeV3;
  readonly sensitivityLevel: ValueObjectSensitivityLevelCodeV3;
  readonly identityAttributesJson: RealityModelJsonObjectV3;
  readonly metadataJson: RealityModelJsonObjectV3;
}

export const VALUE_OBJECT_ATTRIBUTE_VALUE_TYPE_CODES_V3 = [
  "numeric",
  "text",
  "boolean",
  "date",
  "datetime",
  "json",
] as const;
export type ValueObjectAttributeValueTypeCodeV3 =
  (typeof VALUE_OBJECT_ATTRIBUTE_VALUE_TYPE_CODES_V3)[number];

export interface ValueObjectAttributeDefinitionV3 {
  readonly attributeCode: string;
  readonly valueTypeCode: ValueObjectAttributeValueTypeCodeV3;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly applicableBranchTypeCodes: readonly ValueObjectBranchTypeCodeV2[];
  readonly applicableNodeRoleCodes: readonly ValueObjectNodeRoleCodeV2[];
  readonly applicableObjectKinds: readonly ValueObjectKindV2[];
  readonly validationJson: RealityModelJsonObjectV3;
  readonly version: number;
  readonly status: "active" | "inactive";
}

export type ValueObjectAttributeValueV3 =
  | { readonly valueTypeCode: "numeric"; readonly valueNumeric: number }
  | { readonly valueTypeCode: "text"; readonly valueText: string }
  | { readonly valueTypeCode: "boolean"; readonly valueBoolean: boolean }
  | { readonly valueTypeCode: "date"; readonly valueDate: string }
  | { readonly valueTypeCode: "datetime"; readonly valueDateTime: string }
  | {
      readonly valueTypeCode: "json";
      readonly valueJson:
        | RealityModelJsonObjectV3
        | readonly RealityModelJsonValueV3[];
    };

export const VALUE_OBJECT_CRITERION_TYPE_CODES_V3 = [
  "success",
  "failure",
] as const;
export type ValueObjectCriterionTypeCodeV3 =
  (typeof VALUE_OBJECT_CRITERION_TYPE_CODES_V3)[number];

export const VALUE_OBJECT_CRITERION_VALUE_KIND_CODES_V3 = [
  "qualitative",
  "parameter_threshold",
  "boolean_condition",
] as const;
export type ValueObjectCriterionValueKindCodeV3 =
  (typeof VALUE_OBJECT_CRITERION_VALUE_KIND_CODES_V3)[number];

export const VALUE_OBJECT_CRITERION_COMPARATOR_CODES_V3 = [
  "lt",
  "lte",
  "eq",
  "gte",
  "gt",
  "between",
  "is_true",
  "is_false",
] as const;
export type ValueObjectCriterionComparatorCodeV3 =
  (typeof VALUE_OBJECT_CRITERION_COMPARATOR_CODES_V3)[number];

export interface ValueObjectOutcomeCriterionV3 {
  readonly criterionTypeCode: ValueObjectCriterionTypeCodeV3;
  readonly valueKindCode: ValueObjectCriterionValueKindCodeV3;
  readonly title: string;
  readonly description: string | null;
  readonly parameterCode: ParameterCode | null;
  readonly comparatorCode: ValueObjectCriterionComparatorCodeV3 | null;
  readonly targetValueNumeric: number | null;
  readonly targetMinNumeric: number | null;
  readonly targetMaxNumeric: number | null;
  readonly targetValueText: string | null;
  readonly targetValueBoolean: boolean | null;
  readonly canonicalUnit: string | null;
  readonly status: "draft" | "active" | "retired";
  readonly sourceType: "user_defined" | "ai_candidate" | "imported";
  readonly validFrom: RealityModelIsoDateTimeV3 | null;
  readonly validTo: RealityModelIsoDateTimeV3 | null;
  readonly evidenceJson: RealityModelJsonObjectV3;
  readonly metadataJson: RealityModelJsonObjectV3;
}

export const VALUE_OBJECT_SEMANTIC_RELATION_TYPE_CODES_V3 = [
  "related_to",
  "same_subject_as",
  "supports",
  "depends_on",
  "conflicts_with",
  "influences",
  "prerequisite_for",
  "associated_with",
  "influenced_by",
  "threatens",
  "opportunity_for",
  "indicated_by",
] as const;
export type ValueObjectSemanticRelationTypeCodeV3 =
  (typeof VALUE_OBJECT_SEMANTIC_RELATION_TYPE_CODES_V3)[number];

export const VALUE_OBJECT_RELATION_DIRECTIONALITY_CODES_V3 = [
  "directed",
  "symmetric",
] as const;
export type ValueObjectRelationDirectionalityCodeV3 =
  (typeof VALUE_OBJECT_RELATION_DIRECTIONALITY_CODES_V3)[number];

export const VALUE_OBJECT_RELATION_SCOPE_CODES_V3 = [
  "ordinary",
  "analysis",
  "both",
] as const;
export type ValueObjectRelationScopeCodeV3 =
  (typeof VALUE_OBJECT_RELATION_SCOPE_CODES_V3)[number];

export interface ValueObjectRelationTypeDefinitionV3 {
  readonly relationTypeCode: ValueObjectSemanticRelationTypeCodeV3;
  readonly directionalityCode: ValueObjectRelationDirectionalityCodeV3;
  readonly fromScopeCode: ValueObjectRelationScopeCodeV3;
  readonly toScopeCode: ValueObjectRelationScopeCodeV3;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly reverseTitleKey: string;
  readonly reverseDescriptionKey: string;
  readonly allowSelfLink: boolean;
  readonly contractVersion: number;
  readonly status: "active" | "inactive" | "future";
}

export const VALUE_OBJECT_RELATION_STATUS_CODES_V3 = [
  "active",
  "inactive",
] as const;
export type ValueObjectRelationStatusCodeV3 =
  (typeof VALUE_OBJECT_RELATION_STATUS_CODES_V3)[number];

export const VALUE_OBJECT_RELATION_PROVENANCE_CODES_V3 = [
  "manual",
  "ai_suggested",
  "imported",
  "system",
] as const;
export type ValueObjectRelationProvenanceCodeV3 =
  (typeof VALUE_OBJECT_RELATION_PROVENANCE_CODES_V3)[number];

export interface ValueObjectSemanticRelationV3 {
  readonly id: RealityModelUuidV3;
  readonly ownerUserId: RealityModelUuidV3;
  readonly ownerActorId: RealityModelUuidV3;
  readonly sourceValueObjectId: RealityModelUuidV3;
  readonly targetValueObjectId: RealityModelUuidV3;
  readonly relationTypeCode: ValueObjectSemanticRelationTypeCodeV3;
  readonly status: ValueObjectRelationStatusCodeV3;
  readonly provenanceCode: ValueObjectRelationProvenanceCodeV3;
  readonly createdByActorId: RealityModelUuidV3;
  readonly updatedByActorId: RealityModelUuidV3;
  readonly createdAt: RealityModelIsoDateTimeV3;
  readonly updatedAt: RealityModelIsoDateTimeV3;
  readonly deactivatedAt: RealityModelIsoDateTimeV3 | null;
  readonly reactivatedAt: RealityModelIsoDateTimeV3 | null;
  readonly metadataJson: RealityModelJsonObjectV3;
}

export const VALUE_OBJECT_TARGET_KIND_CODES_V3 = [
  "amount_per_period",
  "count_per_period",
  "point_value",
  "range",
  "threshold_min",
  "threshold_max",
  "boolean_condition",
  "qualitative_criterion",
] as const;
export type ValueObjectTargetKindCodeV3 =
  (typeof VALUE_OBJECT_TARGET_KIND_CODES_V3)[number];

export const VALUE_OBJECT_TARGET_NORMALIZATION_POLICY_CODES_V3 = [
  "linear_rate",
  "cadence_rate",
  "no_daily_division",
  "custom_formula",
] as const;
export type ValueObjectTargetNormalizationPolicyCodeV3 =
  (typeof VALUE_OBJECT_TARGET_NORMALIZATION_POLICY_CODES_V3)[number];

export const VALUE_OBJECT_TARGET_PERIOD_UNIT_CODES_V3 = [
  "day",
  "week",
  "month",
  "year",
  "custom_days",
] as const;
export type ValueObjectTargetPeriodUnitCodeV3 =
  (typeof VALUE_OBJECT_TARGET_PERIOD_UNIT_CODES_V3)[number];

export interface ValueObjectTargetStandardV3 {
  readonly valueObjectId: RealityModelUuidV3;
  readonly parameterCode: ParameterCode;
  readonly targetKindCode: ValueObjectTargetKindCodeV3;
  readonly targetValueNumeric: number | null;
  readonly targetMinNumeric: number | null;
  readonly targetMaxNumeric: number | null;
  readonly targetValueText: string | null;
  readonly targetValueBoolean: boolean | null;
  readonly canonicalUnit: string | null;
  readonly periodCount: number | null;
  readonly periodUnit: ValueObjectTargetPeriodUnitCodeV3 | null;
  readonly normalizationPolicyCode: ValueObjectTargetNormalizationPolicyCodeV3;
  readonly validFrom: RealityModelIsoDateTimeV3;
  readonly validTo: RealityModelIsoDateTimeV3 | null;
  readonly version: number;
  readonly sourceType: "user_defined" | "system_default" | "imported";
  readonly status: "draft" | "active" | "retired";
  readonly metadataJson: RealityModelJsonObjectV3;
}

export const VALUE_OBJECT_TARGET_ALLOWED_NORMALIZATION_POLICIES_V3 = {
  amount_per_period: ["linear_rate", "custom_formula"],
  count_per_period: ["cadence_rate", "custom_formula"],
  point_value: ["no_daily_division", "custom_formula"],
  range: ["no_daily_division", "custom_formula"],
  threshold_min: ["linear_rate", "no_daily_division", "custom_formula"],
  threshold_max: ["linear_rate", "no_daily_division", "custom_formula"],
  boolean_condition: ["no_daily_division"],
  qualitative_criterion: ["no_daily_division"],
} as const satisfies Readonly<
  Record<
    ValueObjectTargetKindCodeV3,
    readonly ValueObjectTargetNormalizationPolicyCodeV3[]
  >
>;

export function assertValueObjectTargetNormalizationCombinationV3(
  targetKindCode: ValueObjectTargetKindCodeV3,
  normalizationPolicyCode: ValueObjectTargetNormalizationPolicyCodeV3,
): void {
  const allowedPolicies =
    VALUE_OBJECT_TARGET_ALLOWED_NORMALIZATION_POLICIES_V3[targetKindCode];

  if (
    !(allowedPolicies as readonly string[]).includes(
      normalizationPolicyCode,
    )
  ) {
    throw new Error(
      `Normalization policy ${normalizationPolicyCode} is not allowed for target kind ${targetKindCode}.`,
    );
  }
}

export type ValueObjectDailyRepresentationModeV3 =
  | "normalized_rate"
  | "repeat_unchanged"
  | "not_applicable"
  | "custom_formula_required";

export interface ValueObjectDailyEquivalentResultV3 {
  readonly mode: ValueObjectDailyRepresentationModeV3;
  readonly dailyEquivalentNumeric: number | null;
  readonly approximate: boolean;
}

const DAYS_PER_PERIOD_UNIT_V3: Readonly<
  Record<Exclude<ValueObjectTargetPeriodUnitCodeV3, "custom_days">, number>
> = {
  day: 1,
  week: 7,
  month: 365.2425 / 12,
  year: 365.2425,
};

function assertPositiveFiniteV3(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive finite number.`);
  }
}

function getTargetPeriodDaysV3(
  periodCount: number | null,
  periodUnit: ValueObjectTargetPeriodUnitCodeV3 | null,
): { readonly days: number; readonly approximate: boolean } {
  if (periodCount === null || periodUnit === null) {
    throw new Error("periodCount and periodUnit are required for rate normalization.");
  }

  assertPositiveFiniteV3(periodCount, "periodCount");

  if (periodUnit === "custom_days") {
    return { days: periodCount, approximate: false };
  }

  return {
    days: periodCount * DAYS_PER_PERIOD_UNIT_V3[periodUnit],
    approximate: periodUnit === "month" || periodUnit === "year",
  };
}

/**
 * Returns a daily analytical representation without replacing the original
 * target. Compliance is always evaluated in the original target period.
 */
export function deriveValueObjectDailyEquivalentV3(
  target: Pick<
    ValueObjectTargetStandardV3,
    | "targetKindCode"
    | "targetValueNumeric"
    | "periodCount"
    | "periodUnit"
    | "normalizationPolicyCode"
  >,
): ValueObjectDailyEquivalentResultV3 {
  assertValueObjectTargetNormalizationCombinationV3(
    target.targetKindCode,
    target.normalizationPolicyCode,
  );

  if (target.normalizationPolicyCode === "custom_formula") {
    return {
      mode: "custom_formula_required",
      dailyEquivalentNumeric: null,
      approximate: false,
    };
  }

  if (target.targetKindCode === "boolean_condition") {
    return {
      mode: "not_applicable",
      dailyEquivalentNumeric: null,
      approximate: false,
    };
  }

  if (target.targetKindCode === "qualitative_criterion") {
    return {
      mode: "not_applicable",
      dailyEquivalentNumeric: null,
      approximate: false,
    };
  }

  if (target.normalizationPolicyCode === "no_daily_division") {
    return {
      mode: "repeat_unchanged",
      dailyEquivalentNumeric: target.targetValueNumeric,
      approximate: false,
    };
  }

  if (target.targetValueNumeric === null) {
    throw new Error("targetValueNumeric is required for rate normalization.");
  }

  if (!Number.isFinite(target.targetValueNumeric)) {
    throw new Error("targetValueNumeric must be finite.");
  }

  const period = getTargetPeriodDaysV3(
    target.periodCount,
    target.periodUnit,
  );

  return {
    mode: "normalized_rate",
    dailyEquivalentNumeric: target.targetValueNumeric / period.days,
    approximate: period.approximate,
  };
}
