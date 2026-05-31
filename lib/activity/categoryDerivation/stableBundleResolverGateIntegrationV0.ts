import {
  buildStableBundlePersistenceGateBlockerV0,
  type StableBundlePersistenceGateBlockerRawInputV0,
  type StableBundlePersistenceGateBlockerResultV0,
} from "./stableBundlePersistenceGateBlockerV0";

export const STABLE_BUNDLE_RESOLVER_GATE_INTEGRATION_POLICY_V0 =
  "stable_bundle_resolver_gate_integration_v0" as const;

export const STABLE_BUNDLE_RESOLVER_GATE_INTEGRATION_MODE_V0 =
  "read_only_stable_bundle_resolver_gate_integration_no_db_write" as const;

export type StableBundleResolverGateIntegrationPolicyV0 =
  typeof STABLE_BUNDLE_RESOLVER_GATE_INTEGRATION_POLICY_V0;

export type StableBundleResolverGateIntegrationModeV0 =
  typeof STABLE_BUNDLE_RESOLVER_GATE_INTEGRATION_MODE_V0;

export type StableBundleResolverGateIntegrationRawInputV0 =
  StableBundlePersistenceGateBlockerRawInputV0;

export type StableBundleResolverGateIntegrationStageStatusV0 =
  | "passed"
  | "no_candidates_needed"
  | "blocked_by_contract"
  | "future_gate"
  | "failed";

export type StableBundleResolverGateIntegrationStageV0 = {
  order: number;
  stageKey:
    | "local_controlled_category_lookup"
    | "unknown_term_detection"
    | "external_concept_stub"
    | "primary_source_order_proof"
    | "resolver_decision"
    | "unresolved_stable_bundle_blocker"
    | "stable_semantic_bundle_preview"
    | "stable_bundle_persistence_gate_blocker"
    | "future_stable_bundle_write_gate"
    | "future_state_write_gate";
  title: string;
  executedNow: boolean;
  status: StableBundleResolverGateIntegrationStageStatusV0;
  sourceContract: string;
  count: number;
  canPersistNow: false;
  canWriteStateNow: false;
  notes: string[];
};

export type StableBundleResolverGateIntegrationWritesV0 = {
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

export type StableBundleResolverGateIntegrationSummaryV0 = {
  localMatchCount: number;
  unknownTermCandidateCount: number;
  externalConceptCandidateCount: number;
  resolverDecisionCount: number;
  unresolvedBlockerCount: number;
  memberPreviewCount: number;
  blockedCandidatePreviewCount: number;
  gateCheckCount: number;
  blockingGateCheckCount: number;
  sourceOrderSatisfied: boolean;
  resolverApprovedOnlySatisfied: boolean;
  stableBundlePreviewReadOnly: true;
  persistenceGateBlocked: true;
  persistenceGateOpenNow: false;
  integrationReadOnly: true;
  unresolvedCandidatesExcluded: true;
  externalConceptsExcluded: true;
  unresolvedCannotEnterStableBundle: true;
  externalConceptIsNotInternalCategory: true;
  categoryDoesNotCreateStateFact: true;
  resolverPersistenceAllowedNow: false;
  stableBundleCreationAllowedNow: false;
  stableBundlePersistenceAllowedNow: false;
  canCreateStableBundleNow: false;
  canPersistNow: false;
  canWriteStateNow: false;
};

export type StableBundleResolverGateIntegrationResultV0 = {
  ok: boolean;
  policy: StableBundleResolverGateIntegrationPolicyV0;
  mode: StableBundleResolverGateIntegrationModeV0;
  inputText: string | null;
  normalizedText: string | null;
  inputLanguage: string;
  stableBundlePersistenceGateBlocker: StableBundlePersistenceGateBlockerResultV0;
  stages: StableBundleResolverGateIntegrationStageV0[];
  summary: StableBundleResolverGateIntegrationSummaryV0;
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: StableBundleResolverGateIntegrationWritesV0;
};

export function buildStableBundleResolverGateIntegrationWritesV0(): StableBundleResolverGateIntegrationWritesV0 {
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
  stageKey: StableBundleResolverGateIntegrationStageV0["stageKey"];
  title: string;
  executedNow: boolean;
  status: StableBundleResolverGateIntegrationStageStatusV0;
  sourceContract: string;
  count: number;
  notes: string[];
}): StableBundleResolverGateIntegrationStageV0 {
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

function emptySummary(): StableBundleResolverGateIntegrationSummaryV0 {
  return {
    localMatchCount: 0,
    unknownTermCandidateCount: 0,
    externalConceptCandidateCount: 0,
    resolverDecisionCount: 0,
    unresolvedBlockerCount: 0,
    memberPreviewCount: 0,
    blockedCandidatePreviewCount: 0,
    gateCheckCount: 0,
    blockingGateCheckCount: 0,
    sourceOrderSatisfied: false,
    resolverApprovedOnlySatisfied: false,
    stableBundlePreviewReadOnly: true,
    persistenceGateBlocked: true,
    persistenceGateOpenNow: false,
    integrationReadOnly: true,
    unresolvedCandidatesExcluded: true,
    externalConceptsExcluded: true,
    unresolvedCannotEnterStableBundle: true,
    externalConceptIsNotInternalCategory: true,
    categoryDoesNotCreateStateFact: true,
    resolverPersistenceAllowedNow: false,
    stableBundleCreationAllowedNow: false,
    stableBundlePersistenceAllowedNow: false,
    canCreateStableBundleNow: false,
    canPersistNow: false,
    canWriteStateNow: false,
  };
}

export function buildStableBundleResolverGateIntegrationV0(
  rawInput: StableBundleResolverGateIntegrationRawInputV0
): StableBundleResolverGateIntegrationResultV0 {
  const writes = buildStableBundleResolverGateIntegrationWritesV0();
  const stableBundlePersistenceGateBlocker =
    buildStableBundlePersistenceGateBlockerV0(rawInput);

  if (!stableBundlePersistenceGateBlocker.ok) {
    return {
      ok: false,
      policy: STABLE_BUNDLE_RESOLVER_GATE_INTEGRATION_POLICY_V0,
      mode: STABLE_BUNDLE_RESOLVER_GATE_INTEGRATION_MODE_V0,
      inputText: stableBundlePersistenceGateBlocker.inputText,
      normalizedText: stableBundlePersistenceGateBlocker.normalizedText,
      inputLanguage: stableBundlePersistenceGateBlocker.inputLanguage,
      stableBundlePersistenceGateBlocker,
      stages: [],
      summary: emptySummary(),
      errors:
        stableBundlePersistenceGateBlocker.errors.length > 0
          ? stableBundlePersistenceGateBlocker.errors
          : [
              "Stable bundle resolver/gate integration requires valid persistence gate blocker input.",
            ],
      warnings: [],
      safetyNotes: [
        "Invalid input cannot produce stable bundle resolver/gate integration.",
        "No SQL, DB write, Supabase write, stable bundle or state write is performed.",
      ],
      writes,
    };
  }

  const stableSemanticBundlePreview =
    stableBundlePersistenceGateBlocker.stableSemanticBundlePreview;
  const sourceOrderResolverBlockerPreview =
    stableSemanticBundlePreview.sourceOrderResolverBlockerPreview;
  const unresolvedStableBundleBlocker =
    sourceOrderResolverBlockerPreview.unresolvedStableBundleBlocker;
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
  const memberPreviewCount =
    stableSemanticBundlePreview.summary.memberPreviewCount;
  const blockedCandidatePreviewCount =
    stableSemanticBundlePreview.summary.blockedCandidatePreviewCount;
  const gateCheckCount =
    stableBundlePersistenceGateBlocker.summary.gateCheckCount;
  const blockingGateCheckCount =
    stableBundlePersistenceGateBlocker.summary.blockingGateCheckCount;

  const stages: StableBundleResolverGateIntegrationStageV0[] = [
    buildStage({
      order: 1,
      stageKey: "local_controlled_category_lookup",
      title: "Local controlled category lookup",
      executedNow: true,
      status: localLookup.ok ? "passed" : "failed",
      sourceContract: "local_controlled_category_lookup_v0",
      count: localMatchCount,
      notes: [
        "Local controlled lookup is the first semantic source.",
        "Local matches are still preview-only and require later persistence gates.",
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
        "Unknown terms are detected after local lookup.",
        "Unknown terms cannot enter stable semantic bundle membership.",
      ],
    }),
    buildStage({
      order: 3,
      stageKey: "external_concept_stub",
      title: "External concept stub",
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
        "External concept candidate generation is stub-only.",
        "No real external ontology/network provider is called.",
        "External concept candidates are not internal categories.",
      ],
    }),
    buildStage({
      order: 4,
      stageKey: "primary_source_order_proof",
      title: "Primary category source order proof",
      executedNow: externalConceptStub.ok,
      status: primarySourceOrderProof.ok ? "passed" : "failed",
      sourceContract: "primary_category_source_search_order_proof_v0",
      count: primarySourceOrderProof.steps.length,
      notes: [
        "Primary source order remains local-first.",
        "Future resolver/stable bundle/value object/state write gates remain explicit.",
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
        "Unknown/external decisions are blocked from stable bundle membership.",
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
        "Unresolved unknown and external candidates remain blocked.",
        "Local decisions remain future-eligible only.",
      ],
    }),
    buildStage({
      order: 7,
      stageKey: "stable_semantic_bundle_preview",
      title: "Stable semantic bundle preview",
      executedNow: unresolvedStableBundleBlocker.ok,
      status: stableSemanticBundlePreview.ok ? "passed" : "failed",
      sourceContract: "stable_semantic_bundle_preview_v0",
      count: memberPreviewCount,
      notes: [
        "Stable semantic bundle preview is in-memory only.",
        "Only resolver-approved local preview decisions become member previews.",
      ],
    }),
    buildStage({
      order: 8,
      stageKey: "stable_bundle_persistence_gate_blocker",
      title: "Stable bundle persistence gate blocker",
      executedNow: stableSemanticBundlePreview.ok,
      status: stableBundlePersistenceGateBlocker.ok ? "passed" : "failed",
      sourceContract: "stable_bundle_persistence_gate_blocker_v0",
      count: gateCheckCount,
      notes: [
        "Persistence gate remains closed.",
        "No stable bundle row is created.",
      ],
    }),
    buildStage({
      order: 9,
      stageKey: "future_stable_bundle_write_gate",
      title: "Future stable bundle write gate",
      executedNow: false,
      status: "blocked_by_contract",
      sourceContract: "future_stable_bundle_write_contract",
      count: 0,
      notes: [
        "Stable bundle write is explicitly blocked here.",
        "A later C33 phase may define the write contract and audit payload.",
      ],
    }),
    buildStage({
      order: 10,
      stageKey: "future_state_write_gate",
      title: "Future state write gate",
      executedNow: false,
      status: "blocked_by_contract",
      sourceContract: "future_state_source_confidence_evidence_window_contract",
      count: 0,
      notes: [
        "State writes remain blocked.",
        "Category/resolver/bundle previews do not create state facts, deltas or snapshots.",
      ],
    }),
  ];

  return {
    ok: true,
    policy: STABLE_BUNDLE_RESOLVER_GATE_INTEGRATION_POLICY_V0,
    mode: STABLE_BUNDLE_RESOLVER_GATE_INTEGRATION_MODE_V0,
    inputText: stableBundlePersistenceGateBlocker.inputText,
    normalizedText: stableBundlePersistenceGateBlocker.normalizedText,
    inputLanguage: stableBundlePersistenceGateBlocker.inputLanguage,
    stableBundlePersistenceGateBlocker,
    stages,
    summary: {
      localMatchCount,
      unknownTermCandidateCount,
      externalConceptCandidateCount,
      resolverDecisionCount,
      unresolvedBlockerCount,
      memberPreviewCount,
      blockedCandidatePreviewCount,
      gateCheckCount,
      blockingGateCheckCount,
      sourceOrderSatisfied:
        stableBundlePersistenceGateBlocker.summary.sourceOrderSatisfied,
      resolverApprovedOnlySatisfied:
        stableBundlePersistenceGateBlocker.summary.resolverApprovedOnlySatisfied,
      stableBundlePreviewReadOnly: true,
      persistenceGateBlocked: true,
      persistenceGateOpenNow: false,
      integrationReadOnly: true,
      unresolvedCandidatesExcluded: true,
      externalConceptsExcluded: true,
      unresolvedCannotEnterStableBundle: true,
      externalConceptIsNotInternalCategory: true,
      categoryDoesNotCreateStateFact: true,
      resolverPersistenceAllowedNow: false,
      stableBundleCreationAllowedNow: false,
      stableBundlePersistenceAllowedNow: false,
      canCreateStableBundleNow: false,
      canPersistNow: false,
      canWriteStateNow: false,
    },
    errors: [],
    warnings: [
      "This is a read-only integration of C33-H preview and gate blocker contracts.",
      "Stable bundle persistence and resolver persistence remain blocked.",
      "Value Object, Activity Event link and state write gates remain blocked.",
    ],
    safetyNotes: [
      "Stable bundle resolver/gate integration is read-only.",
      "It proves the chain from source order to resolver/blocker to stable bundle preview to closed persistence gate.",
      "Unknown terms and external concept candidates remain excluded.",
      "External concept candidates are not internal categories.",
      "No SQL, Supabase, DB write, resolver row, stable bundle row, Value Object, link or state fact is created.",
    ],
    writes,
  };
}

export function buildStableBundleResolverGateIntegrationReadinessV0() {
  return {
    ok: true,
    policy: STABLE_BUNDLE_RESOLVER_GATE_INTEGRATION_POLICY_V0,
    mode: "route_contract_readiness_no_stable_bundle_resolver_gate_execution",
    routeMode: STABLE_BUNDLE_RESOLVER_GATE_INTEGRATION_MODE_V0,
    sourceContracts: {
      stableBundlePersistenceGateBlocker:
        "stable_bundle_persistence_gate_blocker_v0",
      stableSemanticBundlePreview: "stable_semantic_bundle_preview_v0",
      sourceOrderResolverBlockerPreview:
        "source_order_resolver_blocker_preview_v0",
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
      "7. stable semantic bundle preview",
      "8. stable bundle persistence gate blocker",
      "9. future stable bundle write gate — blocked",
      "10. future state write gate — blocked",
    ],
    safetyNotes: [
      "This route integrates preview/gate contracts only.",
      "It does not persist resolver decisions.",
      "It does not create stable semantic bundles.",
      "It does not open a write gate.",
      "It does not create state facts, state deltas or state snapshots.",
    ],
    writes: buildStableBundleResolverGateIntegrationWritesV0(),
  };
}
