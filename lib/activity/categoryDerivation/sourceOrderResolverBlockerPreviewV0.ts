import {
  buildUnresolvedStableBundleBlockerV0,
  type UnresolvedStableBundleBlockerRawInputV0,
  type UnresolvedStableBundleBlockerResultV0,
} from "./unresolvedStableBundleBlockerV0";

export const SOURCE_ORDER_RESOLVER_BLOCKER_PREVIEW_POLICY_V0 =
  "source_order_resolver_blocker_preview_v0" as const;

export const SOURCE_ORDER_RESOLVER_BLOCKER_PREVIEW_MODE_V0 =
  "read_only_source_order_resolver_blocker_preview_no_db_write" as const;

export type SourceOrderResolverBlockerPreviewPolicyV0 =
  typeof SOURCE_ORDER_RESOLVER_BLOCKER_PREVIEW_POLICY_V0;

export type SourceOrderResolverBlockerPreviewModeV0 =
  typeof SOURCE_ORDER_RESOLVER_BLOCKER_PREVIEW_MODE_V0;

export type SourceOrderResolverBlockerPreviewRawInputV0 =
  UnresolvedStableBundleBlockerRawInputV0;

export type SourceOrderResolverBlockerStageStatusV0 =
  | "passed"
  | "no_candidates_needed"
  | "blocked_by_contract"
  | "future_gate"
  | "failed";

export type SourceOrderResolverBlockerStageV0 = {
  order: number;
  stageKey:
    | "local_controlled_category_lookup"
    | "unknown_term_detection"
    | "external_concept_stub"
    | "primary_source_order_proof"
    | "resolver_decision"
    | "unresolved_stable_bundle_blocker"
    | "stable_semantic_bundle_write_gate"
    | "state_write_gate";
  title: string;
  executedNow: boolean;
  status: SourceOrderResolverBlockerStageStatusV0;
  sourceContract: string;
  count: number;
  canPersistNow: false;
  canWriteStateNow: false;
  notes: string[];
};

export type SourceOrderResolverBlockerPreviewWritesV0 = {
  sqlExecuted: false;
  dbReadExecuted: false;
  dbWriteExecuted: false;
  supabaseReadExecuted: false;
  supabaseWriteExecuted: false;
  externalNetworkCallExecuted: false;
  resolverDecisionPersisted: false;
  resolverCandidateInserted: false;
  unknownTermCandidateInserted: false;
  externalConceptCandidateInserted: false;
  categoryInserted: false;
  categoryAliasInserted: false;
  stableBundleCreated: false;
  stableBundlePersisted: false;
  activityEventInserted: false;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  stateFactCreated: false;
  stateDeltaCreated: false;
  stateSnapshotCreated: false;
};

export type SourceOrderResolverBlockerPreviewSummaryV0 = {
  localMatchCount: number;
  localFutureEligibilityCount: number;
  unknownTermCandidateCount: number;
  externalConceptCandidateCount: number;
  resolverDecisionCount: number;
  unresolvedBlockerCount: number;
  unknownTermBlockerCount: number;
  externalConceptBlockerCount: number;
  sourceOrderSatisfied: boolean;
  resolverExecutedReadOnly: true;
  unresolvedStableBundleBlockerExecutedReadOnly: true;
  stableBundleCreationAllowedNow: false;
  stableBundlePersistenceAllowedNow: false;
  resolverPersistenceAllowedNow: false;
  unresolvedCannotEnterStableBundle: true;
  externalConceptIsNotInternalCategory: true;
  categoryDoesNotCreateStateFact: true;
  canCreateStableBundleNow: false;
  canPersistNow: false;
  canWriteStateNow: false;
};

export type SourceOrderResolverBlockerPreviewResultV0 = {
  ok: boolean;
  policy: SourceOrderResolverBlockerPreviewPolicyV0;
  mode: SourceOrderResolverBlockerPreviewModeV0;
  inputText: string | null;
  normalizedText: string | null;
  inputLanguage: string;
  unresolvedStableBundleBlocker: UnresolvedStableBundleBlockerResultV0;
  stages: SourceOrderResolverBlockerStageV0[];
  summary: SourceOrderResolverBlockerPreviewSummaryV0;
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: SourceOrderResolverBlockerPreviewWritesV0;
};

export function buildSourceOrderResolverBlockerPreviewWritesV0(): SourceOrderResolverBlockerPreviewWritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    supabaseReadExecuted: false,
    supabaseWriteExecuted: false,
    externalNetworkCallExecuted: false,
    resolverDecisionPersisted: false,
    resolverCandidateInserted: false,
    unknownTermCandidateInserted: false,
    externalConceptCandidateInserted: false,
    categoryInserted: false,
    categoryAliasInserted: false,
    stableBundleCreated: false,
    stableBundlePersisted: false,
    activityEventInserted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    stateFactCreated: false,
    stateDeltaCreated: false,
    stateSnapshotCreated: false,
  };
}

function buildStage(params: {
  order: number;
  stageKey: SourceOrderResolverBlockerStageV0["stageKey"];
  title: string;
  executedNow: boolean;
  status: SourceOrderResolverBlockerStageStatusV0;
  sourceContract: string;
  count: number;
  notes: string[];
}): SourceOrderResolverBlockerStageV0 {
  return {
    order: params.order,
    stageKey: params.stageKey,
    title: params.title,
    executedNow: params.executedNow,
    status: params.status,
    sourceContract: params.sourceContract,
    count: params.count,
    canPersistNow: false,
    canWriteStateNow: false,
    notes: params.notes,
  };
}

function emptySummary(): SourceOrderResolverBlockerPreviewSummaryV0 {
  return {
    localMatchCount: 0,
    localFutureEligibilityCount: 0,
    unknownTermCandidateCount: 0,
    externalConceptCandidateCount: 0,
    resolverDecisionCount: 0,
    unresolvedBlockerCount: 0,
    unknownTermBlockerCount: 0,
    externalConceptBlockerCount: 0,
    sourceOrderSatisfied: false,
    resolverExecutedReadOnly: true,
    unresolvedStableBundleBlockerExecutedReadOnly: true,
    stableBundleCreationAllowedNow: false,
    stableBundlePersistenceAllowedNow: false,
    resolverPersistenceAllowedNow: false,
    unresolvedCannotEnterStableBundle: true,
    externalConceptIsNotInternalCategory: true,
    categoryDoesNotCreateStateFact: true,
    canCreateStableBundleNow: false,
    canPersistNow: false,
    canWriteStateNow: false,
  };
}

export function buildSourceOrderResolverBlockerPreviewV0(
  rawInput: SourceOrderResolverBlockerPreviewRawInputV0
): SourceOrderResolverBlockerPreviewResultV0 {
  const writes = buildSourceOrderResolverBlockerPreviewWritesV0();
  const unresolvedStableBundleBlocker =
    buildUnresolvedStableBundleBlockerV0(rawInput);

  if (!unresolvedStableBundleBlocker.ok) {
    return {
      ok: false,
      policy: SOURCE_ORDER_RESOLVER_BLOCKER_PREVIEW_POLICY_V0,
      mode: SOURCE_ORDER_RESOLVER_BLOCKER_PREVIEW_MODE_V0,
      inputText: unresolvedStableBundleBlocker.inputText,
      normalizedText: unresolvedStableBundleBlocker.normalizedText,
      inputLanguage: unresolvedStableBundleBlocker.inputLanguage,
      unresolvedStableBundleBlocker,
      stages: [],
      summary: emptySummary(),
      errors:
        unresolvedStableBundleBlocker.errors.length > 0
          ? unresolvedStableBundleBlocker.errors
          : [
              "Source order resolver/blocker preview requires valid unresolved stable bundle blocker input.",
            ],
      warnings: [],
      safetyNotes: [
        "Invalid input cannot produce an integrated resolver/blocker preview.",
        "No SQL, DB write, Supabase write, stable bundle or state write is performed.",
      ],
      writes,
    };
  }

  const resolverDecision = unresolvedStableBundleBlocker.resolverDecision;
  const primarySourceOrderProof = resolverDecision.primarySourceOrderProof;
  const externalConceptStub = primarySourceOrderProof.externalConceptStub;
  const unknownTermDetector = externalConceptStub.unknownTermDetector;
  const localLookup = unknownTermDetector.localLookup;

  const localMatchCount = localLookup.matches.length;
  const unknownTermCandidateCount =
    unknownTermDetector.unknownTermCandidates.length;
  const externalConceptCandidateCount =
    externalConceptStub.externalConceptCandidates.length;
  const resolverDecisionCount = resolverDecision.decisions.length;
  const unresolvedBlockerCount =
    unresolvedStableBundleBlocker.blockerCandidates.length;
  const unknownTermBlockerCount =
    unresolvedStableBundleBlocker.unknownTermBlockers.length;
  const externalConceptBlockerCount =
    unresolvedStableBundleBlocker.externalConceptBlockers.length;
  const localFutureEligibilityCount =
    unresolvedStableBundleBlocker.localFutureEligibilities.length;

  const sourceOrderSatisfied =
    localLookup.ok === true &&
    unknownTermDetector.ok === true &&
    externalConceptStub.ok === true &&
    primarySourceOrderProof.ok === true &&
    resolverDecision.ok === true &&
    unresolvedStableBundleBlocker.ok === true;

  const stages: SourceOrderResolverBlockerStageV0[] = [
    buildStage({
      order: 1,
      stageKey: "local_controlled_category_lookup",
      title: "Local controlled category lookup",
      executedNow: true,
      status: localLookup.ok ? "passed" : "failed",
      sourceContract: "local_controlled_category_lookup_v0",
      count: localMatchCount,
      notes: [
        "Local controlled lookup is executed first.",
        "Local category matches remain preview-only until resolver and persistence gates.",
      ],
    }),
    buildStage({
      order: 2,
      stageKey: "unknown_term_detection",
      title: "Unknown term detection",
      executedNow: localLookup.ok,
      status:
        unknownTermDetector.ok && unknownTermCandidateCount > 0
          ? "passed"
          : unknownTermDetector.ok
            ? "no_candidates_needed"
            : "failed",
      sourceContract: "unknown_term_detector_v0",
      count: unknownTermCandidateCount,
      notes: [
        "Unknown term detection is executed only after local lookup.",
        "Unknown terms are not persisted here and cannot enter stable bundle now.",
      ],
    }),
    buildStage({
      order: 3,
      stageKey: "external_concept_stub",
      title: "External concept candidate stub",
      executedNow: unknownTermDetector.ok,
      status:
        externalConceptStub.ok && externalConceptCandidateCount > 0
          ? "passed"
          : externalConceptStub.ok
            ? "no_candidates_needed"
            : "failed",
      sourceContract: "external_concept_stub_v0",
      count: externalConceptCandidateCount,
      notes: [
        "External concept stub runs after unknown term detection.",
        "No real external ontology/network provider is called.",
        "External concept candidates are not internal categories.",
      ],
    }),
    buildStage({
      order: 4,
      stageKey: "primary_source_order_proof",
      title: "Primary source order proof",
      executedNow: externalConceptStub.ok,
      status: primarySourceOrderProof.ok ? "passed" : "failed",
      sourceContract: "primary_category_source_search_order_proof_v0",
      count: primarySourceOrderProof.steps.length,
      notes: [
        "Primary source order proves local-first order and future gates.",
        "Resolver, stable bundle, Value Object and state stages remain controlled.",
      ],
    }),
    buildStage({
      order: 5,
      stageKey: "resolver_decision",
      title: "Resolver decision preview",
      executedNow: primarySourceOrderProof.ok,
      status: resolverDecision.ok ? "passed" : "failed",
      sourceContract: "resolver_decision_contract_v0",
      count: resolverDecisionCount,
      notes: [
        "Resolver decisions are preview-only.",
        "Unknown/external candidates are blocked unless future resolver persistence is implemented.",
      ],
    }),
    buildStage({
      order: 6,
      stageKey: "unresolved_stable_bundle_blocker",
      title: "Unresolved stable bundle blocker",
      executedNow: resolverDecision.ok,
      status: unresolvedStableBundleBlocker.ok ? "passed" : "failed",
      sourceContract: "unresolved_stable_bundle_blocker_v0",
      count: unresolvedBlockerCount,
      notes: [
        "Unknown and external candidates are explicitly blocked from stable semantic bundle creation.",
        "Local decisions are only future-eligible, not persisted now.",
      ],
    }),
    buildStage({
      order: 7,
      stageKey: "stable_semantic_bundle_write_gate",
      title: "Stable semantic bundle write gate",
      executedNow: false,
      status: "blocked_by_contract",
      sourceContract: "future_stable_semantic_bundle_persistence_gate",
      count: 0,
      notes: [
        "Stable semantic bundle write is intentionally blocked.",
        "No stable semantic bundle is created by this preview integration.",
      ],
    }),
    buildStage({
      order: 8,
      stageKey: "state_write_gate",
      title: "State write gate",
      executedNow: false,
      status: "blocked_by_contract",
      sourceContract: "future_state_source_confidence_evidence_window_contract",
      count: 0,
      notes: [
        "State facts, deltas and snapshots are intentionally blocked.",
        "Category/resolver/blocker outputs do not create state facts.",
      ],
    }),
  ];

  return {
    ok: true,
    policy: SOURCE_ORDER_RESOLVER_BLOCKER_PREVIEW_POLICY_V0,
    mode: SOURCE_ORDER_RESOLVER_BLOCKER_PREVIEW_MODE_V0,
    inputText: unresolvedStableBundleBlocker.inputText,
    normalizedText: unresolvedStableBundleBlocker.normalizedText,
    inputLanguage: unresolvedStableBundleBlocker.inputLanguage,
    unresolvedStableBundleBlocker,
    stages,
    summary: {
      localMatchCount,
      localFutureEligibilityCount,
      unknownTermCandidateCount,
      externalConceptCandidateCount,
      resolverDecisionCount,
      unresolvedBlockerCount,
      unknownTermBlockerCount,
      externalConceptBlockerCount,
      sourceOrderSatisfied,
      resolverExecutedReadOnly: true,
      unresolvedStableBundleBlockerExecutedReadOnly: true,
      stableBundleCreationAllowedNow: false,
      stableBundlePersistenceAllowedNow: false,
      resolverPersistenceAllowedNow: false,
      unresolvedCannotEnterStableBundle: true,
      externalConceptIsNotInternalCategory: true,
      categoryDoesNotCreateStateFact: true,
      canCreateStableBundleNow: false,
      canPersistNow: false,
      canWriteStateNow: false,
    },
    errors: [],
    warnings: [
      "This is an integrated preview only.",
      "Resolver persistence, stable semantic bundle creation, Value Object policy and state writes remain blocked.",
    ],
    safetyNotes: [
      "Source order resolver/blocker preview is read-only.",
      "The execution order is local lookup before unknown term detection before external concept stub before resolver decision before blocker.",
      "No SQL, Supabase, DB write, external network call, resolver persistence or stable bundle persistence is executed.",
      "Unresolved unknown terms and external concept candidates cannot enter stable semantic bundles.",
      "External concept candidates are not internal categories.",
      "Category/resolver/blocker decisions do not create state facts, state deltas or state snapshots.",
    ],
    writes,
  };
}

export function buildSourceOrderResolverBlockerPreviewReadinessV0() {
  return {
    ok: true,
    policy: SOURCE_ORDER_RESOLVER_BLOCKER_PREVIEW_POLICY_V0,
    mode: "route_contract_readiness_no_source_order_resolver_blocker_execution",
    routeMode: SOURCE_ORDER_RESOLVER_BLOCKER_PREVIEW_MODE_V0,
    sourceContracts: {
      unresolvedStableBundleBlocker: "unresolved_stable_bundle_blocker_v0",
      resolverDecision: "resolver_decision_contract_v0",
      primaryCategorySourceSearchOrder:
        "primary_category_source_search_order_proof_v0",
      externalConceptStub: "external_concept_stub_v0",
      unknownTermDetector: "unknown_term_detector_v0",
      localControlledCategoryLookup: "local_controlled_category_lookup_v0",
    },
    integrationOrder: [
      "1. local controlled category lookup",
      "2. unknown term detection",
      "3. external concept candidate stub",
      "4. primary source order proof",
      "5. resolver decision preview",
      "6. unresolved stable bundle blocker",
      "7. stable semantic bundle write gate — blocked",
      "8. state write gate — blocked",
    ],
    safetyNotes: [
      "This contract integrates preview outputs only.",
      "It does not persist resolver decisions.",
      "It does not create stable semantic bundles.",
      "It does not open a persistence gate.",
      "It does not create state facts, state deltas or state snapshots.",
    ],
    writes: buildSourceOrderResolverBlockerPreviewWritesV0(),
  };
}
