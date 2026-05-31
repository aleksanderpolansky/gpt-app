import {
  buildResolverDecisionContractV0,
  type ResolverDecisionContractResultV0,
  type ResolverDecisionRawInputV0,
  type ResolverDecisionV0,
} from "./resolverDecisionContractV0";

export const UNRESOLVED_STABLE_BUNDLE_BLOCKER_POLICY_V0 =
  "unresolved_stable_bundle_blocker_v0" as const;

export const UNRESOLVED_STABLE_BUNDLE_BLOCKER_MODE_V0 =
  "read_only_unresolved_stable_bundle_blocker_no_db_write" as const;

export type UnresolvedStableBundleBlockerPolicyV0 =
  typeof UNRESOLVED_STABLE_BUNDLE_BLOCKER_POLICY_V0;

export type UnresolvedStableBundleBlockerModeV0 =
  typeof UNRESOLVED_STABLE_BUNDLE_BLOCKER_MODE_V0;

export type UnresolvedStableBundleBlockerRawInputV0 = ResolverDecisionRawInputV0;

export type StableBundleBlockReasonV0 =
  | "unknown_term_requires_user_confirmation"
  | "external_concept_requires_future_mapping"
  | "resolver_persistence_gate_not_open"
  | "stable_bundle_persistence_gate_not_open";

export type StableBundleBlockerCandidateV0 = {
  blockKey: string;
  decisionKey: string;
  candidateKey: string;
  sourceKind: ResolverDecisionV0["sourceKind"];
  status: ResolverDecisionV0["status"];
  normalizedText: string;
  title: string;
  blockReasons: StableBundleBlockReasonV0[];
  requiresUserConfirmation: boolean;
  requiresResolverPersistenceLater: true;
  requiresStableBundleGateLater: true;
  blockedFromStableBundleNow: true;
  canEnterStableBundleNow: false;
  canCreateStableBundleNow: false;
  canPersistNow: false;
  canWriteStateNow: false;
  canCreateStateFact: false;
  safetyNotes: string[];
};

export type StableBundleLocalFutureEligibilityV0 = {
  eligibilityKey: string;
  decisionKey: string;
  candidateKey: string;
  title: string;
  normalizedText: string;
  sourceKind: "local_controlled_category";
  status: "accepted_for_preview";
  eligibleForFutureStableBundleAfterResolverPersistence: true;
  blockedFromStableBundleNow: true;
  canEnterStableBundleNow: false;
  canCreateStableBundleNow: false;
  canPersistNow: false;
  canWriteStateNow: false;
  canCreateStateFact: false;
  safetyNotes: string[];
};

export type UnresolvedStableBundleBlockerWritesV0 = {
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

export type UnresolvedStableBundleBlockerSummaryV0 = {
  localFutureEligibilityCount: number;
  unresolvedBlockerCount: number;
  unknownTermBlockerCount: number;
  externalConceptBlockerCount: number;
  totalDecisionCount: number;
  stableBundleCreationAllowedNow: false;
  stableBundlePersistenceAllowedNow: false;
  resolverPersistenceAllowedNow: false;
  unresolvedCannotEnterStableBundle: true;
  externalConceptIsNotInternalCategory: true;
  categoryDoesNotCreateStateFact: true;
  canCreateStableBundleNow: false;
  canPersistNow: false;
  canWriteStateNow: false;
  localEligibleKeys: string[];
  blockedUnknownTermKeys: string[];
  blockedExternalConceptKeys: string[];
  blockedFromStableBundleKeys: string[];
};

export type UnresolvedStableBundleBlockerResultV0 = {
  ok: boolean;
  policy: UnresolvedStableBundleBlockerPolicyV0;
  mode: UnresolvedStableBundleBlockerModeV0;
  inputText: string | null;
  normalizedText: string | null;
  inputLanguage: string;
  resolverDecision: ResolverDecisionContractResultV0;
  localFutureEligibilities: StableBundleLocalFutureEligibilityV0[];
  blockerCandidates: StableBundleBlockerCandidateV0[];
  unknownTermBlockers: StableBundleBlockerCandidateV0[];
  externalConceptBlockers: StableBundleBlockerCandidateV0[];
  summary: UnresolvedStableBundleBlockerSummaryV0;
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: UnresolvedStableBundleBlockerWritesV0;
};

function normalizeKey(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "stable-bundle-blocker"
  );
}

function buildKey(parts: string[]): string {
  return normalizeKey(parts.join("-"));
}

export function buildUnresolvedStableBundleBlockerWritesV0(): UnresolvedStableBundleBlockerWritesV0 {
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

function buildLocalFutureEligibility(
  decision: ResolverDecisionV0
): StableBundleLocalFutureEligibilityV0 {
  return {
    eligibilityKey: buildKey(["future-bundle-local", decision.candidateKey]),
    decisionKey: decision.decisionKey,
    candidateKey: decision.candidateKey,
    title: decision.title,
    normalizedText: decision.normalizedText,
    sourceKind: "local_controlled_category",
    status: "accepted_for_preview",
    eligibleForFutureStableBundleAfterResolverPersistence: true,
    blockedFromStableBundleNow: true,
    canEnterStableBundleNow: false,
    canCreateStableBundleNow: false,
    canPersistNow: false,
    canWriteStateNow: false,
    canCreateStateFact: false,
    safetyNotes: [
      "Local resolver decision is eligible only for a future stable bundle gate.",
      "It is still blocked from stable bundle creation now.",
      "Resolver persistence and stable bundle persistence are not opened in this contract.",
      "No state facts, deltas or snapshots may be created from this eligibility.",
    ],
  };
}

function buildBlockerCandidate(
  decision: ResolverDecisionV0
): StableBundleBlockerCandidateV0 {
  const isUnknownTerm = decision.sourceKind === "unknown_term";
  const isExternalConcept = decision.sourceKind === "external_concept_stub";

  const blockReasons: StableBundleBlockReasonV0[] = [
    "resolver_persistence_gate_not_open",
    "stable_bundle_persistence_gate_not_open",
  ];

  if (isUnknownTerm) {
    blockReasons.unshift("unknown_term_requires_user_confirmation");
  }

  if (isExternalConcept) {
    blockReasons.unshift("external_concept_requires_future_mapping");
  }

  return {
    blockKey: buildKey(["block-stable-bundle", decision.sourceKind, decision.candidateKey]),
    decisionKey: decision.decisionKey,
    candidateKey: decision.candidateKey,
    sourceKind: decision.sourceKind,
    status: decision.status,
    normalizedText: decision.normalizedText,
    title: decision.title,
    blockReasons,
    requiresUserConfirmation: decision.requiresUserConfirmation,
    requiresResolverPersistenceLater: true,
    requiresStableBundleGateLater: true,
    blockedFromStableBundleNow: true,
    canEnterStableBundleNow: false,
    canCreateStableBundleNow: false,
    canPersistNow: false,
    canWriteStateNow: false,
    canCreateStateFact: false,
    safetyNotes: [
      "This candidate is blocked from stable semantic bundle creation now.",
      "Unresolved unknown terms and external concept stubs require future resolver/mapping decisions.",
      "External concept candidates are not internal categories.",
      "No stable bundle, Value Object, Activity Event link or state fact is created.",
    ],
  };
}

function emptySummary(): UnresolvedStableBundleBlockerSummaryV0 {
  return {
    localFutureEligibilityCount: 0,
    unresolvedBlockerCount: 0,
    unknownTermBlockerCount: 0,
    externalConceptBlockerCount: 0,
    totalDecisionCount: 0,
    stableBundleCreationAllowedNow: false,
    stableBundlePersistenceAllowedNow: false,
    resolverPersistenceAllowedNow: false,
    unresolvedCannotEnterStableBundle: true,
    externalConceptIsNotInternalCategory: true,
    categoryDoesNotCreateStateFact: true,
    canCreateStableBundleNow: false,
    canPersistNow: false,
    canWriteStateNow: false,
    localEligibleKeys: [],
    blockedUnknownTermKeys: [],
    blockedExternalConceptKeys: [],
    blockedFromStableBundleKeys: [],
  };
}

export function buildUnresolvedStableBundleBlockerV0(
  rawInput: UnresolvedStableBundleBlockerRawInputV0
): UnresolvedStableBundleBlockerResultV0 {
  const writes = buildUnresolvedStableBundleBlockerWritesV0();
  const resolverDecision = buildResolverDecisionContractV0(rawInput);

  if (!resolverDecision.ok) {
    return {
      ok: false,
      policy: UNRESOLVED_STABLE_BUNDLE_BLOCKER_POLICY_V0,
      mode: UNRESOLVED_STABLE_BUNDLE_BLOCKER_MODE_V0,
      inputText: resolverDecision.inputText,
      normalizedText: resolverDecision.normalizedText,
      inputLanguage: resolverDecision.inputLanguage,
      resolverDecision,
      localFutureEligibilities: [],
      blockerCandidates: [],
      unknownTermBlockers: [],
      externalConceptBlockers: [],
      summary: emptySummary(),
      errors:
        resolverDecision.errors.length > 0
          ? resolverDecision.errors
          : [
              "Unresolved stable bundle blocker requires valid resolver decision input.",
            ],
      warnings: [],
      safetyNotes: [
        "Invalid input cannot produce stable bundle blocker decisions.",
        "No SQL, DB write, Supabase write, stable bundle or state write is performed.",
      ],
      writes,
    };
  }

  const localFutureEligibilities = resolverDecision.acceptedLocalPreviewDecisions.map(
    buildLocalFutureEligibility
  );

  const unknownTermBlockers = resolverDecision.blockedUnknownTermDecisions.map(
    buildBlockerCandidate
  );

  const externalConceptBlockers =
    resolverDecision.blockedExternalConceptDecisions.map(buildBlockerCandidate);

  const blockerCandidates = [...unknownTermBlockers, ...externalConceptBlockers];

  return {
    ok: true,
    policy: UNRESOLVED_STABLE_BUNDLE_BLOCKER_POLICY_V0,
    mode: UNRESOLVED_STABLE_BUNDLE_BLOCKER_MODE_V0,
    inputText: resolverDecision.inputText,
    normalizedText: resolverDecision.normalizedText,
    inputLanguage: resolverDecision.inputLanguage,
    resolverDecision,
    localFutureEligibilities,
    blockerCandidates,
    unknownTermBlockers,
    externalConceptBlockers,
    summary: {
      localFutureEligibilityCount: localFutureEligibilities.length,
      unresolvedBlockerCount: blockerCandidates.length,
      unknownTermBlockerCount: unknownTermBlockers.length,
      externalConceptBlockerCount: externalConceptBlockers.length,
      totalDecisionCount: resolverDecision.decisions.length,
      stableBundleCreationAllowedNow: false,
      stableBundlePersistenceAllowedNow: false,
      resolverPersistenceAllowedNow: false,
      unresolvedCannotEnterStableBundle: true,
      externalConceptIsNotInternalCategory: true,
      categoryDoesNotCreateStateFact: true,
      canCreateStableBundleNow: false,
      canPersistNow: false,
      canWriteStateNow: false,
      localEligibleKeys: localFutureEligibilities.map(
        (item) => item.candidateKey
      ),
      blockedUnknownTermKeys: unknownTermBlockers.map(
        (item) => item.candidateKey
      ),
      blockedExternalConceptKeys: externalConceptBlockers.map(
        (item) => item.candidateKey
      ),
      blockedFromStableBundleKeys: blockerCandidates.map(
        (item) => item.blockKey
      ),
    },
    errors: [],
    warnings: [
      "All stable semantic bundle creation remains blocked in this contract.",
      "Local categories are only marked as future-eligible after later resolver persistence and stable bundle gates.",
    ],
    safetyNotes: [
      "Unresolved stable bundle blocker is read-only.",
      "Unknown terms and external concept stubs are blocked from stable bundle creation.",
      "Local resolver decisions are future-eligible only, not persisted now.",
      "External concepts are not internal categories.",
      "No stable bundle, Value Object, Activity Event, link or state fact is created.",
    ],
    writes,
  };
}

export function buildUnresolvedStableBundleBlockerReadinessV0() {
  return {
    ok: true,
    policy: UNRESOLVED_STABLE_BUNDLE_BLOCKER_POLICY_V0,
    mode: "route_contract_readiness_no_stable_bundle_blocker_execution",
    routeMode: UNRESOLVED_STABLE_BUNDLE_BLOCKER_MODE_V0,
    sourceContracts: {
      resolverDecision: "resolver_decision_contract_v0",
      primaryCategorySourceSearchOrder:
        "primary_category_source_search_order_proof_v0",
      externalConceptStub: "external_concept_stub_v0",
      unknownTermDetector: "unknown_term_detector_v0",
      localControlledCategoryLookup: "local_controlled_category_lookup_v0",
    },
    blockingRules: [
      "Unknown terms are blocked from stable semantic bundle creation.",
      "External concept stubs are blocked from stable semantic bundle creation.",
      "External concept stubs are not internal categories.",
      "Local category decisions are only future-eligible after resolver persistence and stable bundle gate.",
      "No stable bundle is created by this contract.",
      "No state facts, state deltas or state snapshots are created by this contract.",
    ],
    safetyNotes: [
      "This contract proves unresolved-category blocking only.",
      "It does not persist resolver rows.",
      "It does not create stable semantic bundles.",
      "It does not open a persistence gate.",
    ],
    writes: buildUnresolvedStableBundleBlockerWritesV0(),
  };
}
