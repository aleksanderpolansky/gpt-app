export const SEMANTIC_CONTRACT_V3_SCHEMA_VERSION =
  "activity-category-derivation-v3-external-ontology-ready" as const;

export const SEMANTIC_CONTRACT_V3_ADAPTER_VERSION =
  "semantic-contract-v3-adapter-v0.1.0" as const;

export type SemanticContractV3SchemaVersion =
  typeof SEMANTIC_CONTRACT_V3_SCHEMA_VERSION;

export type DetectedLanguageCode =
  | "ru"
  | "pl"
  | "en"
  | "de"
  | "es"
  | "uk"
  | "unknown";

export type SemanticLayer =
  | "action"
  | "object"
  | "object_or_instrument"
  | "context"
  | "domain"
  | "role"
  | "duty"
  | "care"
  | "purpose"
  | "metric"
  | "participant"
  | "location"
  | "time_context"
  | "state_hook_source"
  | "unknown";

export type CategoryType =
  | "activity"
  | "object"
  | "instrument"
  | "context"
  | "domain"
  | "role"
  | "responsibility"
  | "care_function"
  | "purpose"
  | "metric"
  | "commercial"
  | "personal"
  | "derived"
  | "unknown";

export type CandidateSource =
  | "raw_input"
  | "rule"
  | "ai"
  | "parser"
  | "local_lookup"
  | "external_concept"
  | "resolver"
  | "user_feedback"
  | "system"
  | "unknown";

export type ResolutionStatus =
  | "unresolved"
  | "resolved_existing"
  | "suggested_new"
  | "created_suggested"
  | "needs_review"
  | "rejected"
  | "merged";

export type MappingStatus =
  | "none"
  | "local_exact"
  | "local_alias"
  | "local_ambiguous"
  | "external_suggested"
  | "external_confirmed"
  | "user_confirmed"
  | "rejected"
  | "merged";

export type LocalMatchStatus =
  | "not_checked"
  | "exact_match_found"
  | "alias_match_found"
  | "multiple_matches"
  | "no_confident_match"
  | "ambiguous"
  | "skipped";

export type LocalLookupSource =
  | "seed_rubricator"
  | "user_history"
  | "local_alias"
  | "existing_value_object"
  | "previous_correction"
  | "resolver_cache"
  | "system_rule";

export type ExternalConceptSource =
  | "external_knowledge_graph"
  | "external_ontology"
  | "external_dictionary"
  | "external_stub"
  | "unknown";

export type StateHookDirection =
  | "increase"
  | "decrease"
  | "neutral"
  | "unknown";

export type MissingInformationBlockingLevel =
  | "non_blocking"
  | "blocks_resolution"
  | "blocks_state_hooks"
  | "blocks_nba";

export type SemanticEvidence = {
  source: CandidateSource | string;
  surfaceText?: string | null;
  matchedWords?: string[];
  languageCode?: DetectedLanguageCode | string | null;
  sourceChain?: string[];
  span?: {
    start: number | null;
    end: number | null;
  } | null;
  raw?: Record<string, unknown> | null;
};

export type MetricCandidateV3 = {
  metricKey: string;
  value: number | string | boolean | null;
  unit?: string | null;
  confidence: number;
  evidence: SemanticEvidence;
};

export type CategoryCandidateV3 = {
  candidateSlug: string;
  candidateTitle?: string | null;
  semanticLayer: SemanticLayer;
  categoryType: CategoryType;
  confidence: number;
  isRequired?: boolean;
  isCoreMeaning?: boolean;
  needsUserReview?: boolean;
  evidence: SemanticEvidence;
  resolutionStatus: ResolutionStatus;
  source: CandidateSource;
};

export type UnknownTermCandidateV3 = {
  surfaceText: string;
  lemma: string;
  languageCode: DetectedLanguageCode;
  possibleSemanticLayers: SemanticLayer[];
  localMatchStatus: LocalMatchStatus;
  requiresExternalLookup: boolean;
  ambiguityReason?: string | null;
  confidence: number;
  evidence: SemanticEvidence;
};

export type LocalLookupCandidateV3 = {
  source: LocalLookupSource;
  matchedCategoryId?: string | null;
  matchedSlug: string;
  matchedAlias?: string | null;
  semanticLayer: SemanticLayer;
  categoryType?: CategoryType;
  confidence: number;
  matchStatus:
    | "local_exact"
    | "local_alias"
    | "local_ambiguous"
    | "local_conflict"
    | "previous_user_confirmed"
    | "previous_user_rejected"
    | "no_match";
  evidence: SemanticEvidence;
};

export type ExternalConceptCandidateV3 = {
  source: ExternalConceptSource;
  externalId: string;
  canonicalLabel: string;
  description?: string | null;
  conceptType: SemanticLayer | CategoryType | string;
  confidence: number;
  mappingStatus: Extract<
    MappingStatus,
    "none" | "external_suggested" | "external_confirmed" | "rejected" | "merged"
  >;
  forUserDisplay?: {
    safeLabel: string;
    safeDescription?: string | null;
  };
};

export type ResolvedCategoryCandidateV3 = {
  candidateSlug: string;
  canonicalSlug: string;
  categoryId?: string | null;
  semanticLayer: SemanticLayer;
  categoryType: CategoryType;
  resolutionStatus: ResolutionStatus;
  mappingStatus: MappingStatus;
  needsUserConfirmation: boolean;
  confidence: number;
  evidence: SemanticEvidence;
};

export type StateHookCandidateV3 = {
  hookKey: string;
  direction: StateHookDirection;
  confidence: number;
  notAStateFactYet: true;
  evidence: SemanticEvidence;
};

export type MissingInformationQuestionV3 = {
  questionKey: string;
  questionText: string;
  blockingLevel: MissingInformationBlockingLevel;
  relatedUnknownTerms?: string[];
  relatedCandidateSlugs?: string[];
  answerOptions?: Array<{
    label: string;
    value: string;
  }>;
};

export type SemanticDerivationV3Result = {
  schemaVersion: SemanticContractV3SchemaVersion;
  adapterVersion: typeof SEMANTIC_CONTRACT_V3_ADAPTER_VERSION;
  detectedLanguage: DetectedLanguageCode;
  normalizedActivity: string;
  overallConfidence: number;
  metricCandidates: MetricCandidateV3[];
  categoryCandidates: CategoryCandidateV3[];
  unknownTermCandidates: UnknownTermCandidateV3[];
  localLookupCandidates: LocalLookupCandidateV3[];
  externalConceptCandidates: ExternalConceptCandidateV3[];
  resolvedCategoryCandidates: ResolvedCategoryCandidateV3[];
  stateHookCandidates: StateHookCandidateV3[];
  riskFlags: string[];
  forbiddenOverclaims: string[];
  missingInformationQuestions: MissingInformationQuestionV3[];
  contractWarnings: string[];
  contractErrors: string[];
};

export const ALLOWED_RESOLUTION_STATUSES: readonly ResolutionStatus[] = [
  "unresolved",
  "resolved_existing",
  "suggested_new",
  "created_suggested",
  "needs_review",
  "rejected",
  "merged",
] as const;

export const ALLOWED_MAPPING_STATUSES: readonly MappingStatus[] = [
  "none",
  "local_exact",
  "local_alias",
  "local_ambiguous",
  "external_suggested",
  "external_confirmed",
  "user_confirmed",
  "rejected",
  "merged",
] as const;

export const BRIDGE_SAFE_RESOLUTION_STATUSES: readonly ResolutionStatus[] = [
  "resolved_existing",
  "created_suggested",
] as const;

export const DEFAULT_FORBIDDEN_OVERCLAIMS: readonly string[] = [
  "confirmed_health_improvement",
  "muscle_growth",
  "high_cortisol",
  "confirmed_income",
  "closed_deal",
  "client_acquired",
  "contract_signed",
  "family_climate_improved",
] as const;

export type SemanticContractV3InvariantCode =
  | "category_does_not_create_state_fact"
  | "external_concept_is_not_internal_category"
  | "unresolved_category_cannot_enter_stable_bundle";

export const SEMANTIC_CONTRACT_V3_REQUIRED_INVARIANT_CODES: readonly SemanticContractV3InvariantCode[] =
  [
    "category_does_not_create_state_fact",
    "external_concept_is_not_internal_category",
    "unresolved_category_cannot_enter_stable_bundle",
  ];

export const SEMANTIC_CONTRACT_V3_REQUIRED_INVARIANT_DESCRIPTIONS: Readonly<
  Record<SemanticContractV3InvariantCode, string>
> = {
  category_does_not_create_state_fact:
    "A category, semantic bundle, external concept, or candidate may create state hook candidates, but it must not directly create state facts, state deltas, or state snapshots.",
  external_concept_is_not_internal_category:
    "An external ontology concept is only a lookup or alias candidate until it is resolved into an internal category through the controlled resolver/governance path.",
  unresolved_category_cannot_enter_stable_bundle:
    "An unresolved, rejected, ambiguous, or user-review-required category candidate cannot enter a stable semantic bundle as an active category.",
};

export function isSemanticContractV3InvariantCode(
  value: unknown
): value is SemanticContractV3InvariantCode {
  return (
    typeof value === "string" &&
    SEMANTIC_CONTRACT_V3_REQUIRED_INVARIANT_CODES.includes(
      value as SemanticContractV3InvariantCode
    )
  );
}

export function getSemanticContractV3RequiredInvariantCodes(): SemanticContractV3InvariantCode[] {
  return [...SEMANTIC_CONTRACT_V3_REQUIRED_INVARIANT_CODES];
}

export function getSemanticContractV3InvariantDescription(
  code: SemanticContractV3InvariantCode
): string {
  return SEMANTIC_CONTRACT_V3_REQUIRED_INVARIANT_DESCRIPTIONS[code];
}
export function clampConfidence(value: unknown, fallback = 0.5): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

export function isResolutionStatus(value: unknown): value is ResolutionStatus {
  return (
    typeof value === "string" &&
    ALLOWED_RESOLUTION_STATUSES.includes(value as ResolutionStatus)
  );
}

export function normalizeResolutionStatus(
  value: unknown,
  fallback: ResolutionStatus = "unresolved"
): ResolutionStatus {
  return isResolutionStatus(value) ? value : fallback;
}

export function isMappingStatus(value: unknown): value is MappingStatus {
  return (
    typeof value === "string" &&
    ALLOWED_MAPPING_STATUSES.includes(value as MappingStatus)
  );
}

export function normalizeMappingStatus(
  value: unknown,
  fallback: MappingStatus = "none"
): MappingStatus {
  return isMappingStatus(value) ? value : fallback;
}

export function isBridgeSafeResolutionStatus(
  value: ResolutionStatus
): boolean {
  return BRIDGE_SAFE_RESOLUTION_STATUSES.includes(value);
}

export function canEnterStableSemanticBundle(params: {
  resolutionStatus: ResolutionStatus;
  mappingStatus: MappingStatus;
  confidence: number;
  needsUserConfirmation: boolean;
}): boolean {
  if (params.needsUserConfirmation) {
    return false;
  }

  if (params.confidence < 0.5) {
    return false;
  }

  if (
    params.resolutionStatus === "resolved_existing" ||
    params.resolutionStatus === "created_suggested"
  ) {
    return params.mappingStatus !== "rejected";
  }

  return false;
}

export function createStateHookCandidateV3(params: {
  hookKey: string;
  direction: StateHookDirection;
  confidence: number;
  evidence: SemanticEvidence;
}): StateHookCandidateV3 {
  return {
    hookKey: params.hookKey,
    direction: params.direction,
    confidence: clampConfidence(params.confidence),
    notAStateFactYet: true,
    evidence: params.evidence,
  };
}

export function createEmptySemanticDerivationV3(params: {
  normalizedActivity: string;
  detectedLanguage?: DetectedLanguageCode;
  overallConfidence?: number;
}): SemanticDerivationV3Result {
  return {
    schemaVersion: SEMANTIC_CONTRACT_V3_SCHEMA_VERSION,
    adapterVersion: SEMANTIC_CONTRACT_V3_ADAPTER_VERSION,
    detectedLanguage: params.detectedLanguage ?? "unknown",
    normalizedActivity: params.normalizedActivity,
    overallConfidence: clampConfidence(params.overallConfidence ?? 0.5),
    metricCandidates: [],
    categoryCandidates: [],
    unknownTermCandidates: [],
    localLookupCandidates: [],
    externalConceptCandidates: [],
    resolvedCategoryCandidates: [],
    stateHookCandidates: [],
    riskFlags: [],
    forbiddenOverclaims: [...DEFAULT_FORBIDDEN_OVERCLAIMS],
    missingInformationQuestions: [],
    contractWarnings: [],
    contractErrors: [],
  };
}

