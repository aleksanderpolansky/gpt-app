import type {
  RealityContextSourceRef,
} from "../context/realityContextTypes";

export const GOAL_EVIDENCE_IMPORTANCE_CODES = [
  "critical",
  "important",
  "useful",
  "optional",
] as const;

export type GoalEvidenceImportanceCode =
  (typeof GOAL_EVIDENCE_IMPORTANCE_CODES)[number];

export const GOAL_EVIDENCE_DIMENSION_CODES = [
  "physiological",
  "medical",
  "capability",
  "psychological_behavioral",
  "stress_recovery",
  "social",
  "relationship_context",
  "physical_environment",
  "workplace_environment",
  "lifestyle",
  "self_habit",
  "close_person_habit",
  "social_norm",
  "schedule_time",
  "financial",
  "material_resource",
  "legal_institutional",
  "motivation_values",
  "other",
] as const;

export type GoalEvidenceDimensionCode =
  (typeof GOAL_EVIDENCE_DIMENSION_CODES)[number];

export const GOAL_EVIDENCE_SUBJECT_SCOPE_CODES = [
  "actor",
  "close_person",
  "household",
  "social_environment",
  "physical_environment",
  "institution",
  "goal_specific",
] as const;

export type GoalEvidenceSubjectScopeCode =
  (typeof GOAL_EVIDENCE_SUBJECT_SCOPE_CODES)[number];

export const GOAL_EVIDENCE_ACQUISITION_METHOD_CODES = [
  "existing_reality",
  "direct_question",
  "natural_observation",
  "device_import",
  "external_document",
  "professional_assessment",
  "later_plan_observation",
] as const;

export type GoalEvidenceAcquisitionMethodCode =
  (typeof GOAL_EVIDENCE_ACQUISITION_METHOD_CODES)[number];

export const GOAL_EVIDENCE_SOURCE_KIND_CODES = [
  "internal_protocol",
  "professional_guideline",
  "official_catalog",
  "peer_reviewed",
  "professional_consensus",
  "other_reviewed_source",
] as const;

export type GoalEvidenceSourceKindCode =
  (typeof GOAL_EVIDENCE_SOURCE_KIND_CODES)[number];

export type GoalEvidencePackageSourceRef = {
  readonly sourceKindCode: GoalEvidenceSourceKindCode;
  readonly title: string;
  readonly publisher: string;
  readonly versionOrDate: string | null;
  readonly jurisdiction: string | null;
  readonly locator: string | null;
  readonly retrievedAt: string | null;
};

export type GoalEvidenceFreshnessPolicy = {
  readonly maxAgeDays: number | null;
  readonly stableCharacteristic: boolean;
};

export type GoalEvidenceRequirement = {
  readonly requirementCode: string;
  readonly informationNeedText: string;
  readonly rationaleText: string;
  readonly importanceCode: GoalEvidenceImportanceCode;
  readonly dimensionCodes:
    readonly GoalEvidenceDimensionCode[];
  readonly subjectScopeCode:
    GoalEvidenceSubjectScopeCode;
  readonly acquisitionMethodCodes:
    readonly GoalEvidenceAcquisitionMethodCode[];
  readonly freshnessPolicy:
    GoalEvidenceFreshnessPolicy;
  readonly provisionalUseAllowed: boolean;
  readonly professionalAssessmentRequired: boolean;
  readonly sourceRefIndexes: readonly number[];
  readonly tags: readonly string[];
};

export type GoalEvidenceRequirementPackage = {
  readonly schemaVersion: 1;
  readonly packageCode: string;
  readonly packageVersion: number;
  readonly title: string;
  readonly goalPatternCodes: readonly string[];
  readonly specialistPerspectiveCodes:
    readonly string[];
  readonly sourceRefs:
    readonly GoalEvidencePackageSourceRef[];
  readonly requirements:
    readonly GoalEvidenceRequirement[];
};

export const GOAL_EVIDENCE_COVERAGE_STATUS_CODES = [
  "sufficient",
  "partial",
  "stale",
  "missing",
  "not_applicable",
  "professional_evaluation_required",
] as const;

export type GoalEvidenceCoverageStatusCode =
  (typeof GOAL_EVIDENCE_COVERAGE_STATUS_CODES)[number];

export type GoalEvidenceRequirementMatch = {
  readonly requirementCode: string;
  readonly matchedSourceRefs:
    readonly RealityContextSourceRef[];
  readonly evidenceAdequacyCode:
    "sufficient" | "partial";
  readonly explicitlyNotApplicable: boolean;
  readonly professionalAssessmentCompleted: boolean;
};

export const GOAL_EVIDENCE_USER_OPTION_CODES = [
  "answer_now",
  "observe_then_refresh",
  "proceed_provisionally",
  "professional_assessment",
] as const;

export type GoalEvidenceUserOptionCode =
  (typeof GOAL_EVIDENCE_USER_OPTION_CODES)[number];

export const GOAL_INFLUENCE_EFFECT_CODES = [
  "potential_accelerator",
  "potential_blocker",
  "mixed",
  "context_only",
  "unknown",
] as const;

export type GoalInfluenceEffectCode =
  (typeof GOAL_INFLUENCE_EFFECT_CODES)[number];

export type GoalInfluenceAssessment = {
  readonly assessmentCode: string;
  readonly requirementCode: string;
  readonly effectCode: GoalInfluenceEffectCode;
  readonly dimensionCodes:
    readonly GoalEvidenceDimensionCode[];
  readonly subjectScopeCode:
    GoalEvidenceSubjectScopeCode;
  readonly summary: string;
  readonly evidenceRefs:
    readonly RealityContextSourceRef[];
  readonly goalContextRef:
    RealityContextSourceRef;
  readonly ruleRef: {
    readonly registryCode: string;
    readonly ruleCode: string;
    readonly version: number;
  } | null;
};

export type GoalEvidenceCoverageItem = {
  readonly requirementCode: string;
  readonly importanceCode: GoalEvidenceImportanceCode;
  readonly statusCode: GoalEvidenceCoverageStatusCode;
  readonly matchedSourceRefs:
    readonly RealityContextSourceRef[];
  readonly acquisitionOptionCodes:
    readonly GoalEvidenceUserOptionCode[];
  readonly blocksAffectedPlanPart: boolean;
};

export type GoalEvidenceReadinessCode =
  | "ready"
  | "provisional"
  | "blocked_for_specific_parts";

export type GoalEvidenceCoverageReport = {
  readonly packageCode: string;
  readonly packageVersion: number;
  readonly readinessCode: GoalEvidenceReadinessCode;
  readonly totalRequirements: number;
  readonly sufficientCount: number;
  readonly partialCount: number;
  readonly staleCount: number;
  readonly missingCount: number;
  readonly notApplicableCount: number;
  readonly professionalEvaluationRequiredCount: number;
  readonly items: readonly GoalEvidenceCoverageItem[];
  readonly availableUserOptionCodes:
    readonly GoalEvidenceUserOptionCode[];
  readonly blockingRequirementCodes:
    readonly string[];
};
