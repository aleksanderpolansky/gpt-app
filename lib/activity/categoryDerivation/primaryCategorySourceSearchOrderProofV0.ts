import {
  buildExternalConceptStubV0,
  type ExternalConceptStubRawInputV0,
  type ExternalConceptStubResultV0,
} from "./externalConceptStubV0";

export const PRIMARY_CATEGORY_SOURCE_SEARCH_ORDER_POLICY_V0 =
  "primary_category_source_search_order_proof_v0" as const;

export const PRIMARY_CATEGORY_SOURCE_SEARCH_ORDER_MODE_V0 =
  "read_only_primary_category_source_search_order_no_db_write" as const;

export type PrimaryCategorySourceSearchOrderPolicyV0 =
  typeof PRIMARY_CATEGORY_SOURCE_SEARCH_ORDER_POLICY_V0;

export type PrimaryCategorySourceSearchOrderModeV0 =
  typeof PRIMARY_CATEGORY_SOURCE_SEARCH_ORDER_MODE_V0;

export type PrimaryCategorySourceSearchOrderRawInputV0 =
  ExternalConceptStubRawInputV0;

export type PrimaryCategorySourceSearchOrderStepStatusV0 =
  | "passed"
  | "no_candidates_needed"
  | "future_gate"
  | "blocked_by_contract"
  | "failed";

export type PrimaryCategorySourceSearchOrderStepV0 = {
  order: number;
  stepKey:
    | "raw_input_received"
    | "local_controlled_category_lookup"
    | "unknown_term_detection"
    | "external_concept_stub"
    | "resolver_decision"
    | "stable_semantic_bundle"
    | "value_object_policy"
    | "state_hook_only";
  title: string;
  executedNow: boolean;
  status: PrimaryCategorySourceSearchOrderStepStatusV0;
  sourceContract: string;
  allowsNextStep: boolean;
  canPersistNow: false;
  canWriteStateNow: false;
  notes: string[];
};

export type PrimaryCategorySourceSearchOrderWritesV0 = {
  sqlExecuted: false;
  dbReadExecuted: false;
  dbWriteExecuted: false;
  supabaseReadExecuted: false;
  supabaseWriteExecuted: false;
  externalNetworkCallExecuted: false;
  unknownTermCandidateInserted: false;
  externalConceptCandidateInserted: false;
  resolverCandidateInserted: false;
  categoryInserted: false;
  categoryAliasInserted: false;
  stableBundleCreated: false;
  activityEventInserted: false;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  stateFactCreated: false;
  stateDeltaCreated: false;
  stateSnapshotCreated: false;
};

export type PrimaryCategorySourceSearchOrderSummaryV0 = {
  localMatchCount: number;
  confidentLocalMatchCount: number;
  unknownTermCandidateCount: number;
  externalConceptCandidateCount: number;
  localCategoryKeys: string[];
  unknownTermKeys: string[];
  externalConceptCandidateKeys: string[];
  blockedFromStableBundleKeys: string[];
  localFirstSatisfied: boolean;
  unknownTermsAfterLocalLookupOnly: boolean;
  externalConceptsAfterUnknownTermsOnly: boolean;
  resolverRequiredBeforeStableBundle: true;
  unresolvedCannotEnterStableBundle: true;
  externalConceptIsNotInternalCategory: true;
  categoryDoesNotCreateStateFact: true;
  canCreateStableBundleNow: false;
  canPersistNow: false;
  canWriteStateNow: false;
};

export type PrimaryCategorySourceSearchOrderProofResultV0 = {
  ok: boolean;
  policy: PrimaryCategorySourceSearchOrderPolicyV0;
  mode: PrimaryCategorySourceSearchOrderModeV0;
  inputText: string | null;
  normalizedText: string | null;
  inputLanguage: string;
  externalConceptStub: ExternalConceptStubResultV0;
  steps: PrimaryCategorySourceSearchOrderStepV0[];
  summary: PrimaryCategorySourceSearchOrderSummaryV0;
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: PrimaryCategorySourceSearchOrderWritesV0;
};

export function buildPrimaryCategorySourceSearchOrderWritesV0(): PrimaryCategorySourceSearchOrderWritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    supabaseReadExecuted: false,
    supabaseWriteExecuted: false,
    externalNetworkCallExecuted: false,
    unknownTermCandidateInserted: false,
    externalConceptCandidateInserted: false,
    resolverCandidateInserted: false,
    categoryInserted: false,
    categoryAliasInserted: false,
    stableBundleCreated: false,
    activityEventInserted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    stateFactCreated: false,
    stateDeltaCreated: false,
    stateSnapshotCreated: false,
  };
}

function buildStep(params: {
  order: number;
  stepKey: PrimaryCategorySourceSearchOrderStepV0["stepKey"];
  title: string;
  executedNow: boolean;
  status: PrimaryCategorySourceSearchOrderStepStatusV0;
  sourceContract: string;
  allowsNextStep: boolean;
  notes: string[];
}): PrimaryCategorySourceSearchOrderStepV0 {
  return {
    order: params.order,
    stepKey: params.stepKey,
    title: params.title,
    executedNow: params.executedNow,
    status: params.status,
    sourceContract: params.sourceContract,
    allowsNextStep: params.allowsNextStep,
    canPersistNow: false,
    canWriteStateNow: false,
    notes: params.notes,
  };
}

function collectBlockedFromStableBundleKeys(params: {
  unknownTermKeys: string[];
  externalConceptCandidateKeys: string[];
}): string[] {
  return [
    ...params.unknownTermKeys.map((key) => `unknown:${key}`),
    ...params.externalConceptCandidateKeys.map((key) => `external:${key}`),
  ];
}

export function buildPrimaryCategorySourceSearchOrderProofV0(
  rawInput: PrimaryCategorySourceSearchOrderRawInputV0
): PrimaryCategorySourceSearchOrderProofResultV0 {
  const writes = buildPrimaryCategorySourceSearchOrderWritesV0();
  const externalConceptStub = buildExternalConceptStubV0(rawInput);
  const unknownTermDetector = externalConceptStub.unknownTermDetector;
  const localLookup = unknownTermDetector.localLookup;

  const localCategoryKeys = localLookup.matches.map(
    (match) => match.categoryKey
  );
  const unknownTermKeys = unknownTermDetector.unknownTermCandidates.map(
    (candidate) => candidate.candidateKey
  );
  const externalConceptCandidateKeys =
    externalConceptStub.externalConceptCandidates.map(
      (candidate) => candidate.candidateKey
    );

  const blockedFromStableBundleKeys = collectBlockedFromStableBundleKeys({
    unknownTermKeys,
    externalConceptCandidateKeys,
  });

  const localLookupPassed = localLookup.ok === true;
  const unknownDetectorPassed = unknownTermDetector.ok === true;
  const externalStubPassed = externalConceptStub.ok === true;

  const hasUnknownTerms = unknownTermKeys.length > 0;
  const hasExternalCandidates = externalConceptCandidateKeys.length > 0;

  const summary: PrimaryCategorySourceSearchOrderSummaryV0 = {
    localMatchCount: localLookup.matches.length,
    confidentLocalMatchCount: localLookup.confidentMatches.length,
    unknownTermCandidateCount:
      unknownTermDetector.unknownTermCandidates.length,
    externalConceptCandidateCount:
      externalConceptStub.externalConceptCandidates.length,
    localCategoryKeys,
    unknownTermKeys,
    externalConceptCandidateKeys,
    blockedFromStableBundleKeys,
    localFirstSatisfied: localLookupPassed,
    unknownTermsAfterLocalLookupOnly:
      unknownDetectorPassed && localLookupPassed,
    externalConceptsAfterUnknownTermsOnly:
      externalStubPassed && unknownDetectorPassed && localLookupPassed,
    resolverRequiredBeforeStableBundle: true,
    unresolvedCannotEnterStableBundle: true,
    externalConceptIsNotInternalCategory: true,
    categoryDoesNotCreateStateFact: true,
    canCreateStableBundleNow: false,
    canPersistNow: false,
    canWriteStateNow: false,
  };

  const steps: PrimaryCategorySourceSearchOrderStepV0[] = [
    buildStep({
      order: 1,
      stepKey: "raw_input_received",
      title: "Raw Activity input received",
      executedNow: true,
      status: localLookup.inputText ? "passed" : "failed",
      sourceContract: "activity_capture_input_contract_v0 / raw debug input",
      allowsNextStep: localLookup.inputText !== null,
      notes: [
        "This proof accepts raw Activity text as input for a read-only source-order check.",
        "No Activity Event is inserted by this proof.",
      ],
    }),
    buildStep({
      order: 2,
      stepKey: "local_controlled_category_lookup",
      title: "Local controlled category lookup",
      executedNow: true,
      status: localLookupPassed ? "passed" : "failed",
      sourceContract: "local_controlled_category_lookup_v0",
      allowsNextStep: localLookupPassed,
      notes: [
        "Local controlled category lookup is always attempted before unknown term detection.",
        "Matched local categories are preview matches only and still require resolver/persistence gates before any stable bundle write.",
      ],
    }),
    buildStep({
      order: 3,
      stepKey: "unknown_term_detection",
      title: "Unknown term detection",
      executedNow: localLookupPassed,
      status: unknownDetectorPassed
        ? hasUnknownTerms
          ? "passed"
          : "no_candidates_needed"
        : "failed",
      sourceContract: "unknown_term_detector_v0",
      allowsNextStep: unknownDetectorPassed,
      notes: [
        "Unknown term detection runs only after local controlled category lookup.",
        "Unknown term candidates are not inserted and cannot enter stable bundle now.",
      ],
    }),
    buildStep({
      order: 4,
      stepKey: "external_concept_stub",
      title: "External concept candidate stub",
      executedNow: unknownDetectorPassed,
      status: externalStubPassed
        ? hasExternalCandidates
          ? "passed"
          : "no_candidates_needed"
        : "failed",
      sourceContract: "external_concept_stub_v0",
      allowsNextStep: externalStubPassed,
      notes: [
        "External concept candidates are produced only as preview stubs after unknown term detection.",
        "No real external ontology or network provider is called.",
        "External concept candidates are not internal categories.",
      ],
    }),
    buildStep({
      order: 5,
      stepKey: "resolver_decision",
      title: "Resolver decision",
      executedNow: false,
      status: "future_gate",
      sourceContract: "future_resolver_decision_contract",
      allowsNextStep: false,
      notes: [
        "Resolver decision is not implemented in this block.",
        "Resolver must decide whether a local match, unknown term, or external concept candidate can map to an internal semantic category.",
      ],
    }),
    buildStep({
      order: 6,
      stepKey: "stable_semantic_bundle",
      title: "Stable semantic bundle",
      executedNow: false,
      status: "blocked_by_contract",
      sourceContract: "future_stable_semantic_bundle_contract",
      allowsNextStep: false,
      notes: [
        "Stable semantic bundle creation is blocked in this proof.",
        "Unresolved unknown terms and external concept candidates cannot enter a stable semantic bundle.",
      ],
    }),
    buildStep({
      order: 7,
      stepKey: "value_object_policy",
      title: "Value Object policy",
      executedNow: false,
      status: "blocked_by_contract",
      sourceContract: "future_value_object_policy_contract",
      allowsNextStep: false,
      notes: [
        "Value Object creation/update/link policy is not opened by this proof.",
        "Not every category creates a Value Object.",
      ],
    }),
    buildStep({
      order: 8,
      stepKey: "state_hook_only",
      title: "State hook only, not state fact",
      executedNow: false,
      status: "blocked_by_contract",
      sourceContract: "future_state_hook_contract",
      allowsNextStep: false,
      notes: [
        "Categories and external concepts do not create state facts.",
        "State facts, deltas and snapshots require a separate source/confidence/evidence/window contract.",
      ],
    }),
  ];

  return {
    ok: externalConceptStub.ok === true,
    policy: PRIMARY_CATEGORY_SOURCE_SEARCH_ORDER_POLICY_V0,
    mode: PRIMARY_CATEGORY_SOURCE_SEARCH_ORDER_MODE_V0,
    inputText: externalConceptStub.inputText,
    normalizedText: externalConceptStub.normalizedText,
    inputLanguage: externalConceptStub.inputLanguage,
    externalConceptStub,
    steps,
    summary,
    errors: externalConceptStub.errors,
    warnings: [
      ...externalConceptStub.warnings,
      "Resolver, stable semantic bundle, Value Object policy and state hook stages are intentionally blocked/future-gated in this proof.",
    ],
    safetyNotes: [
      "Primary source search order proof is read-only.",
      "Order is local-first: local controlled lookup before unknown term detection before external concept candidate stub.",
      "No SQL, Supabase, DB write or external network call is executed.",
      "No category, unknown term, external concept, resolver row, stable bundle, Activity Event, Value Object, link or state fact is created.",
      "External concept candidates are not internal categories.",
      "Unresolved unknown terms and external concept candidates cannot enter a stable semantic bundle.",
      "Category match does not create state facts, state deltas or state snapshots.",
    ],
    writes,
  };
}

export function buildPrimaryCategorySourceSearchOrderReadinessV0() {
  return {
    ok: true,
    policy: PRIMARY_CATEGORY_SOURCE_SEARCH_ORDER_POLICY_V0,
    mode: "route_contract_readiness_no_primary_search_order_execution",
    routeMode: PRIMARY_CATEGORY_SOURCE_SEARCH_ORDER_MODE_V0,
    sourceContracts: {
      localControlledCategoryLookup: "local_controlled_category_lookup_v0",
      unknownTermDetector: "unknown_term_detector_v0",
      externalConceptStub: "external_concept_stub_v0",
    },
    searchOrder: [
      "1. raw Activity input",
      "2. language/normalization and metric separation",
      "3. local controlled category lookup",
      "4. unknown term detection",
      "5. external concept candidate stub",
      "6. resolver decision — future gate",
      "7. stable semantic bundle — blocked until resolver",
      "8. Value Object policy — blocked until stable bundle",
      "9. state hook only — no state fact without source/confidence/evidence/window contract",
    ],
    supportedInputFields: [
      "rawText",
      "inputText",
      "naturalInput",
      "activityText",
      "text",
      "inputLanguage",
      "detectedLanguage",
      "languageCode",
      "maxResults",
      "maxUnknownCandidates",
      "maxExternalConceptCandidates",
    ],
    safetyNotes: [
      "This contract proves source order only.",
      "It does not persist any semantic object.",
      "It does not call external ontology providers.",
      "It does not open a persistence gate.",
    ],
    writes: buildPrimaryCategorySourceSearchOrderWritesV0(),
  };
}
