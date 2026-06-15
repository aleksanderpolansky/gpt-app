export type ActivityIntakeSource =
  | "right_ai_column"
  | "activity_capture_page"
  | "manual_test_fixture"
  | "api_preview"
  | "future_external_import";

export type ActivityRecognitionStatus =
  | "obvious_activity"
  | "ambiguous_activity"
  | "ordinary_chat"
  | "dual_intent_question_activity";

export type ActivityProcessingPackageStatus =
  | "preview_only"
  | "needs_user_review"
  | "ready_for_save_gate"
  | "saved"
  | "rejected"
  | "failed";

export type ActivityMeasureType =
  | "duration"
  | "distance"
  | "count"
  | "volume"
  | "mass"
  | "money"
  | "energy"
  | "repetitions"
  | "state"
  | "context"
  | "role"
  | "derived";

export type ActivityMeasureUnit =
  | "minute"
  | "hour"
  | "second"
  | "meter"
  | "kilometer"
  | "step"
  | "count"
  | "liter"
  | "milliliter"
  | "gram"
  | "kilogram"
  | "kcal"
  | "pln"
  | "eur"
  | "usd"
  | "text"
  | "score"
  | "boolean";

export type SemanticCategoryLayer =
  | "action"
  | "object"
  | "activity_type"
  | "role"
  | "relationship"
  | "care"
  | "purpose"
  | "environment"
  | "physiology"
  | "emotion"
  | "skill"
  | "work"
  | "business"
  | "learning"
  | "finance"
  | "recovery"
  | "health"
  | "social"
  | "system";

export type ValueObjectMatchStatus =
  | "matched_existing"
  | "missing_candidate"
  | "ambiguous_candidates"
  | "not_applicable"
  | "deferred";

export type ValueObjectUsageScope = "private" | "commercial";

export type ProposedValueObjectAuthorType = "user" | "organization" | "system";

export type ActivityFactPreviewStatus =
  | "candidate"
  | "needs_value_object"
  | "needs_user_confirmation"
  | "ready_for_fact_write"
  | "blocked"
  | "accepted"
  | "edited"
  | "rejected"
  | "ignored";

export interface ActivityRawInput {
  text: string;
  locale: "ru" | "pl" | "de" | "es" | "en" | "unknown";
  source: ActivityIntakeSource;
  capturedAtIso: string;
}

export interface ActivityRecognitionResult {
  status: ActivityRecognitionStatus;
  confidence: number;
  reason: string;
  detectedActivityTitle: string;
  shouldAskUserBeforeSaving: boolean;
}

export interface ActivityMeasureCandidate {
  localId: string;
  measureType: ActivityMeasureType;
  unit: ActivityMeasureUnit;
  numericValue: number | null;
  textValue: string | null;
  confidence: number;
  evidenceText: string;
  normalizedLabel: string;
}

export interface SemanticCategoryCandidate {
  localId: string;
  semanticObjectKey: string;
  labelRu: string;
  layer: SemanticCategoryLayer;
  confidence: number;
  evidenceText: string;
  reason: string;
}

export interface ValueObjectMatchedCandidate {
  semanticCategoryLocalId: string;
  matchStatus: ValueObjectMatchStatus;
  valueObjectId: string | null;
  valueObjectTitle: string | null;
  parentValueObjectId: string | null;
  parentValueObjectTitle: string | null;
  confidence: number;
  reason: string;
}

export interface MissingValueObjectCandidate {
  semanticCategoryLocalId: string;
  semanticObjectKey: string;
  proposedTitleRu: string;
  proposedUsageScope: ValueObjectUsageScope;
  proposedAuthorType: ProposedValueObjectAuthorType;
  proposedParentValueObjectId: string | null;
  proposedParentTitleRu: string | null;
  reason: string;
  requiresUserConfirmation: boolean;
}

export interface ActivityObjectFactPreview {
  localId: string;
  activityEventId: string | null;
  measureLocalId: string | null;
  semanticCategoryLocalId: string;
  semanticObjectKey: string;
  valueObjectId: string | null;
  valueObjectTitle: string | null;
  measureType: ActivityMeasureType;
  unit: ActivityMeasureUnit;
  numericValue: number | null;
  textValue: string | null;
  status: ActivityFactPreviewStatus;
  confidence: number;
  explanation: string;
}

export interface ActivityProcessingPackage {
  packageId: string;
  status: ActivityProcessingPackageStatus;
  rawInput: ActivityRawInput;
  recognition: ActivityRecognitionResult;
  measures: ActivityMeasureCandidate[];
  semanticCategories: SemanticCategoryCandidate[];
  valueObjectMatches: ValueObjectMatchedCandidate[];
  missingValueObjectCandidates: MissingValueObjectCandidate[];
  factPreviews: ActivityObjectFactPreview[];
  safety: {
    previewOnly: boolean;
    dbWriteAllowed: boolean;
    sqlAllowed: boolean;
    openAiCallAllowed: boolean;
    medicalDiagnosisAllowed: boolean;
    notes: string[];
  };
  counters: {
    measureCount: number;
    semanticCategoryCount: number;
    matchedValueObjectCount: number;
    missingValueObjectCandidateCount: number;
    factPreviewCount: number;
  };
}

export function buildActivityProcessingCounters(
  pkg: Omit<ActivityProcessingPackage, "counters">,
): ActivityProcessingPackage["counters"] {
  return {
    measureCount: pkg.measures.length,
    semanticCategoryCount: pkg.semanticCategories.length,
    matchedValueObjectCount: pkg.valueObjectMatches.filter(
      (item) => item.matchStatus === "matched_existing",
    ).length,
    missingValueObjectCandidateCount: pkg.missingValueObjectCandidates.length,
    factPreviewCount: pkg.factPreviews.length,
  };
}
