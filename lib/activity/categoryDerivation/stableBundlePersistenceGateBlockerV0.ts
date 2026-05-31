import {
  buildStableSemanticBundlePreviewV0,
  type StableSemanticBundlePreviewRawInputV0,
  type StableSemanticBundlePreviewResultV0,
} from "./stableSemanticBundlePreviewV0";

export const STABLE_BUNDLE_PERSISTENCE_GATE_BLOCKER_POLICY_V0 =
  "stable_bundle_persistence_gate_blocker_v0" as const;

export const STABLE_BUNDLE_PERSISTENCE_GATE_BLOCKER_MODE_V0 =
  "read_only_stable_bundle_persistence_gate_blocker_no_db_write" as const;

export type StableBundlePersistenceGateBlockerPolicyV0 =
  typeof STABLE_BUNDLE_PERSISTENCE_GATE_BLOCKER_POLICY_V0;

export type StableBundlePersistenceGateBlockerModeV0 =
  typeof STABLE_BUNDLE_PERSISTENCE_GATE_BLOCKER_MODE_V0;

export type StableBundlePersistenceGateBlockerRawInputV0 =
  StableSemanticBundlePreviewRawInputV0;

export type StableBundlePersistenceGateClosedReasonV0 =
  | "explicit_persistence_gate_not_requested"
  | "resolver_decisions_not_persisted"
  | "stable_bundle_write_contract_not_implemented"
  | "audit_source_snapshot_contract_not_implemented"
  | "state_source_confidence_evidence_window_contract_not_implemented"
  | "unresolved_candidates_must_remain_excluded";

export type StableBundlePersistenceGateCheckV0 = {
  checkKey: string;
  title: string;
  passedForPreview: boolean;
  blocksPersistenceNow: boolean;
  reason: StableBundlePersistenceGateClosedReasonV0;
  canOpenGateNow: false;
  canPersistNow: false;
  safetyNotes: string[];
};

export type StableBundlePersistenceGateObjectV0 = {
  gateKey: string;
  status: "closed_preview_only";
  stableBundlePreviewKey: string | null;
  memberPreviewCount: number;
  blockedCandidatePreviewCount: number;
  persistenceGateOpenNow: false;
  resolverPersistenceAllowedNow: false;
  stableBundleCreationAllowedNow: false;
  stableBundlePersistenceAllowedNow: false;
  canCreateStableBundleNow: false;
  canPersistNow: false;
  canWriteStateNow: false;
  closedReasons: StableBundlePersistenceGateClosedReasonV0[];
  gateChecks: StableBundlePersistenceGateCheckV0[];
  safetyNotes: string[];
};

export type StableBundlePersistenceGateBlockerWritesV0 = {
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

export type StableBundlePersistenceGateBlockerSummaryV0 = {
  memberPreviewCount: number;
  blockedCandidatePreviewCount: number;
  localResolverAcceptedMemberCount: number;
  unknownTermBlockedCount: number;
  externalConceptBlockedCount: number;
  totalResolverDecisionCount: number;
  gateCheckCount: number;
  blockingGateCheckCount: number;
  sourceOrderSatisfied: boolean;
  stableBundlePreviewReadOnly: true;
  persistenceGateBlocked: true;
  persistenceGateOpenNow: false;
  resolverApprovedOnlySatisfied: boolean;
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

export type StableBundlePersistenceGateBlockerResultV0 = {
  ok: boolean;
  policy: StableBundlePersistenceGateBlockerPolicyV0;
  mode: StableBundlePersistenceGateBlockerModeV0;
  inputText: string | null;
  normalizedText: string | null;
  inputLanguage: string;
  stableSemanticBundlePreview: StableSemanticBundlePreviewResultV0;
  persistenceGate: StableBundlePersistenceGateObjectV0 | null;
  summary: StableBundlePersistenceGateBlockerSummaryV0;
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: StableBundlePersistenceGateBlockerWritesV0;
};

function normalizeKey(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "stable-bundle-persistence-gate"
  );
}

function buildKey(parts: string[]): string {
  return normalizeKey(parts.join("-"));
}

export function buildStableBundlePersistenceGateBlockerWritesV0(): StableBundlePersistenceGateBlockerWritesV0 {
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

function emptySummary(): StableBundlePersistenceGateBlockerSummaryV0 {
  return {
    memberPreviewCount: 0,
    blockedCandidatePreviewCount: 0,
    localResolverAcceptedMemberCount: 0,
    unknownTermBlockedCount: 0,
    externalConceptBlockedCount: 0,
    totalResolverDecisionCount: 0,
    gateCheckCount: 0,
    blockingGateCheckCount: 0,
    sourceOrderSatisfied: false,
    stableBundlePreviewReadOnly: true,
    persistenceGateBlocked: true,
    persistenceGateOpenNow: false,
    resolverApprovedOnlySatisfied: false,
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

function buildGateCheck(params: {
  checkKey: string;
  title: string;
  passedForPreview: boolean;
  reason: StableBundlePersistenceGateClosedReasonV0;
  safetyNotes: string[];
}): StableBundlePersistenceGateCheckV0 {
  return {
    checkKey: params.checkKey,
    title: params.title,
    passedForPreview: params.passedForPreview,
    blocksPersistenceNow: true,
    reason: params.reason,
    canOpenGateNow: false,
    canPersistNow: false,
    safetyNotes: params.safetyNotes,
  };
}

function buildGateChecks(
  preview: StableSemanticBundlePreviewResultV0
): StableBundlePersistenceGateCheckV0[] {
  return [
    buildGateCheck({
      checkKey: "explicit-persistence-gate-not-requested",
      title: "Explicit persistence gate",
      passedForPreview: preview.ok,
      reason: "explicit_persistence_gate_not_requested",
      safetyNotes: [
        "This route is a blocker/readiness route only.",
        "It never opens the stable bundle write gate.",
      ],
    }),
    buildGateCheck({
      checkKey: "resolver-decisions-not-persisted",
      title: "Resolver decision persistence",
      passedForPreview: preview.summary.resolverApprovedOnlySatisfied,
      reason: "resolver_decisions_not_persisted",
      safetyNotes: [
        "Resolver decisions are preview-only.",
        "Future stable bundle writes require an explicit resolver persistence contract.",
      ],
    }),
    buildGateCheck({
      checkKey: "stable-bundle-write-contract-not-implemented",
      title: "Stable bundle write contract",
      passedForPreview: preview.stableSemanticBundlePreview !== null,
      reason: "stable_bundle_write_contract_not_implemented",
      safetyNotes: [
        "Stable semantic bundle preview object exists only in memory.",
        "No stable bundle row is inserted or updated.",
      ],
    }),
    buildGateCheck({
      checkKey: "audit-source-snapshot-contract-not-implemented",
      title: "Audit/source snapshot contract",
      passedForPreview: preview.summary.sourceOrderSatisfied,
      reason: "audit_source_snapshot_contract_not_implemented",
      safetyNotes: [
        "A future write gate must define what source order snapshot is stored.",
        "This route does not persist audit/source snapshots.",
      ],
    }),
    buildGateCheck({
      checkKey: "state-contract-not-implemented",
      title: "State source/confidence/evidence/window contract",
      passedForPreview: preview.summary.categoryDoesNotCreateStateFact,
      reason: "state_source_confidence_evidence_window_contract_not_implemented",
      safetyNotes: [
        "Stable bundle preview cannot create state facts.",
        "Future state writes require a separate source/confidence/evidence/window contract.",
      ],
    }),
    buildGateCheck({
      checkKey: "unresolved-candidates-remain-excluded",
      title: "Unresolved candidate exclusion",
      passedForPreview:
        preview.summary.unresolvedCandidatesExcluded &&
        preview.summary.externalConceptsExcluded,
      reason: "unresolved_candidates_must_remain_excluded",
      safetyNotes: [
        "Unknown terms and external concept stubs remain excluded.",
        "External concept candidates are not internal categories.",
      ],
    }),
  ];
}

function buildPersistenceGateObject(
  preview: StableSemanticBundlePreviewResultV0
): StableBundlePersistenceGateObjectV0 {
  const gateChecks = buildGateChecks(preview);
  const closedReasons = gateChecks.map((check) => check.reason);

  return {
    gateKey: buildKey([
      "stable-bundle-persistence-gate",
      preview.stableSemanticBundlePreview?.previewKey ?? "no-preview",
    ]),
    status: "closed_preview_only",
    stableBundlePreviewKey:
      preview.stableSemanticBundlePreview?.previewKey ?? null,
    memberPreviewCount: preview.summary.memberPreviewCount,
    blockedCandidatePreviewCount: preview.summary.blockedCandidatePreviewCount,
    persistenceGateOpenNow: false,
    resolverPersistenceAllowedNow: false,
    stableBundleCreationAllowedNow: false,
    stableBundlePersistenceAllowedNow: false,
    canCreateStableBundleNow: false,
    canPersistNow: false,
    canWriteStateNow: false,
    closedReasons,
    gateChecks,
    safetyNotes: [
      "Stable bundle persistence gate is intentionally closed.",
      "This contract is a blocker, not a writer.",
      "No resolver row, stable bundle row, Value Object, activity link or state fact is created.",
    ],
  };
}

export function buildStableBundlePersistenceGateBlockerV0(
  rawInput: StableBundlePersistenceGateBlockerRawInputV0
): StableBundlePersistenceGateBlockerResultV0 {
  const writes = buildStableBundlePersistenceGateBlockerWritesV0();
  const stableSemanticBundlePreview =
    buildStableSemanticBundlePreviewV0(rawInput);

  if (!stableSemanticBundlePreview.ok) {
    return {
      ok: false,
      policy: STABLE_BUNDLE_PERSISTENCE_GATE_BLOCKER_POLICY_V0,
      mode: STABLE_BUNDLE_PERSISTENCE_GATE_BLOCKER_MODE_V0,
      inputText: stableSemanticBundlePreview.inputText,
      normalizedText: stableSemanticBundlePreview.normalizedText,
      inputLanguage: stableSemanticBundlePreview.inputLanguage,
      stableSemanticBundlePreview,
      persistenceGate: null,
      summary: emptySummary(),
      errors:
        stableSemanticBundlePreview.errors.length > 0
          ? stableSemanticBundlePreview.errors
          : [
              "Stable bundle persistence gate blocker requires valid stable semantic bundle preview input.",
            ],
      warnings: [],
      safetyNotes: [
        "Invalid input cannot produce a persistence gate preview.",
        "No SQL, DB write, Supabase write, stable bundle or state write is performed.",
      ],
      writes,
    };
  }

  const persistenceGate = buildPersistenceGateObject(stableSemanticBundlePreview);
  const blockingGateCheckCount = persistenceGate.gateChecks.filter(
    (check) => check.blocksPersistenceNow
  ).length;

  return {
    ok: true,
    policy: STABLE_BUNDLE_PERSISTENCE_GATE_BLOCKER_POLICY_V0,
    mode: STABLE_BUNDLE_PERSISTENCE_GATE_BLOCKER_MODE_V0,
    inputText: stableSemanticBundlePreview.inputText,
    normalizedText: stableSemanticBundlePreview.normalizedText,
    inputLanguage: stableSemanticBundlePreview.inputLanguage,
    stableSemanticBundlePreview,
    persistenceGate,
    summary: {
      memberPreviewCount: stableSemanticBundlePreview.summary.memberPreviewCount,
      blockedCandidatePreviewCount:
        stableSemanticBundlePreview.summary.blockedCandidatePreviewCount,
      localResolverAcceptedMemberCount:
        stableSemanticBundlePreview.summary.localResolverAcceptedMemberCount,
      unknownTermBlockedCount:
        stableSemanticBundlePreview.summary.unknownTermBlockedCount,
      externalConceptBlockedCount:
        stableSemanticBundlePreview.summary.externalConceptBlockedCount,
      totalResolverDecisionCount:
        stableSemanticBundlePreview.summary.totalResolverDecisionCount,
      gateCheckCount: persistenceGate.gateChecks.length,
      blockingGateCheckCount,
      sourceOrderSatisfied: stableSemanticBundlePreview.summary.sourceOrderSatisfied,
      stableBundlePreviewReadOnly: true,
      persistenceGateBlocked: true,
      persistenceGateOpenNow: false,
      resolverApprovedOnlySatisfied:
        stableSemanticBundlePreview.summary.resolverApprovedOnlySatisfied,
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
      "Stable bundle persistence gate is closed.",
      "This blocker proves persistence requirements but does not write rows.",
      "Resolver persistence and stable bundle persistence remain future gates.",
    ],
    safetyNotes: [
      "Stable bundle persistence gate blocker is read-only.",
      "Stable semantic bundle preview may exist, but no persistence gate is opened.",
      "Only a future explicit write contract may persist a stable bundle.",
      "Unknown terms and external concept candidates remain excluded.",
      "No SQL, Supabase, DB write, resolver row, stable bundle row, Value Object, link or state fact is created.",
    ],
    writes,
  };
}

export function buildStableBundlePersistenceGateBlockerReadinessV0() {
  return {
    ok: true,
    policy: STABLE_BUNDLE_PERSISTENCE_GATE_BLOCKER_POLICY_V0,
    mode: "route_contract_readiness_no_stable_bundle_persistence_gate_execution",
    routeMode: STABLE_BUNDLE_PERSISTENCE_GATE_BLOCKER_MODE_V0,
    sourceContracts: {
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
    gateRules: [
      "Stable bundle persistence gate is closed by default.",
      "Stable semantic bundle preview does not create stable bundle rows.",
      "Resolver decisions are not persisted by this contract.",
      "Unknown terms and external concept stubs remain excluded.",
      "External concept stubs are not internal categories.",
      "No Value Object, Activity Event, activity-value-object link or state fact is created.",
    ],
    safetyNotes: [
      "This contract proves persistence is blocked.",
      "It does not persist resolver decisions.",
      "It does not create stable semantic bundles.",
      "It does not open a write gate.",
      "It does not create state facts, state deltas or state snapshots.",
    ],
    writes: buildStableBundlePersistenceGateBlockerWritesV0(),
  };
}
