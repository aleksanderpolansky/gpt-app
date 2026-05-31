import {
  buildPrimaryCategorySourceSearchOrderProofV0,
  type PrimaryCategorySourceSearchOrderProofResultV0,
  type PrimaryCategorySourceSearchOrderRawInputV0,
} from "./primaryCategorySourceSearchOrderProofV0";

export const RESOLVER_DECISION_CONTRACT_POLICY_V0 =
  "resolver_decision_contract_v0" as const;

export const RESOLVER_DECISION_CONTRACT_MODE_V0 =
  "read_only_resolver_decision_no_db_write_no_stable_bundle" as const;

export type ResolverDecisionContractPolicyV0 =
  typeof RESOLVER_DECISION_CONTRACT_POLICY_V0;

export type ResolverDecisionContractModeV0 =
  typeof RESOLVER_DECISION_CONTRACT_MODE_V0;

export type ResolverDecisionRawInputV0 = PrimaryCategorySourceSearchOrderRawInputV0;

export type ResolverCandidateSourceKindV0 =
  | "local_controlled_category"
  | "unknown_term"
  | "external_concept_stub";

export type ResolverDecisionStatusV0 =
  | "accepted_for_preview"
  | "needs_user_confirmation"
  | "future_external_mapping_required";

export type ResolverDecisionV0 = {
  decisionKey: string;
  candidateKey: string;
  sourceKind: ResolverCandidateSourceKindV0;
  status: ResolverDecisionStatusV0;
  title: string;
  normalizedText: string;
  sourceContract: string;
  reason: string;
  confidence: number;
  requiresUserConfirmation: boolean;
  requiresResolverPersistenceLater: true;
  requiresStableBundleGateLater: true;
  externalConceptIsInternalCategory: false;
  canBecomeInternalCategoryNow: false;
  canEnterStableBundleNow: false;
  canCreateStableBundleNow: false;
  canPersistNow: false;
  canWriteStateNow: false;
  canCreateStateFact: false;
  safetyNotes: string[];
};

export type ResolverDecisionWritesV0 = {
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

export type ResolverDecisionSummaryV0 = {
  localDecisionCount: number;
  acceptedLocalPreviewDecisionCount: number;
  unknownTermDecisionCount: number;
  externalConceptDecisionCount: number;
  blockedFromStableBundleDecisionCount: number;
  totalDecisionCount: number;
  localCategoryKeys: string[];
  unknownTermKeys: string[];
  externalConceptCandidateKeys: string[];
  acceptedLocalCategoryKeys: string[];
  blockedUnknownTermKeys: string[];
  blockedExternalConceptKeys: string[];
  resolverExecutedReadOnly: true;
  resolverPersistenceAllowedNow: false;
  stableBundleCreationAllowedNow: false;
  unresolvedCannotEnterStableBundle: true;
  externalConceptIsNotInternalCategory: true;
  categoryDoesNotCreateStateFact: true;
  canPersistNow: false;
  canWriteStateNow: false;
};

export type ResolverDecisionContractResultV0 = {
  ok: boolean;
  policy: ResolverDecisionContractPolicyV0;
  mode: ResolverDecisionContractModeV0;
  inputText: string | null;
  normalizedText: string | null;
  inputLanguage: string;
  primarySourceOrderProof: PrimaryCategorySourceSearchOrderProofResultV0;
  decisions: ResolverDecisionV0[];
  acceptedLocalPreviewDecisions: ResolverDecisionV0[];
  blockedUnknownTermDecisions: ResolverDecisionV0[];
  blockedExternalConceptDecisions: ResolverDecisionV0[];
  summary: ResolverDecisionSummaryV0;
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: ResolverDecisionWritesV0;
};

function normalizeDecisionKey(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "resolver-decision"
  );
}

function buildDecisionKey(parts: string[]): string {
  return normalizeDecisionKey(parts.join("-"));
}

export function buildResolverDecisionWritesV0(): ResolverDecisionWritesV0 {
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

function buildLocalDecision(params: {
  categoryKey: string;
  title: string;
  confidence: number;
}): ResolverDecisionV0 {
  return {
    decisionKey: buildDecisionKey(["resolver", "local", params.categoryKey]),
    candidateKey: params.categoryKey,
    sourceKind: "local_controlled_category",
    status: "accepted_for_preview",
    title: params.title,
    normalizedText: params.categoryKey,
    sourceContract: "local_controlled_category_lookup_v0",
    reason:
      "Local controlled category match can be accepted for preview, but persistence and stable bundle creation remain blocked.",
    confidence: params.confidence,
    requiresUserConfirmation: false,
    requiresResolverPersistenceLater: true,
    requiresStableBundleGateLater: true,
    externalConceptIsInternalCategory: false,
    canBecomeInternalCategoryNow: false,
    canEnterStableBundleNow: false,
    canCreateStableBundleNow: false,
    canPersistNow: false,
    canWriteStateNow: false,
    canCreateStateFact: false,
    safetyNotes: [
      "Local category decision is preview-only in this contract.",
      "It cannot be persisted as a resolver row now.",
      "It cannot create a stable semantic bundle now.",
      "It cannot create state facts, state deltas or state snapshots.",
    ],
  };
}

function buildUnknownTermDecision(params: {
  candidateKey: string;
  termText: string;
  normalizedText: string;
}): ResolverDecisionV0 {
  return {
    decisionKey: buildDecisionKey(["resolver", "unknown", params.candidateKey]),
    candidateKey: params.candidateKey,
    sourceKind: "unknown_term",
    status: "needs_user_confirmation",
    title: params.termText,
    normalizedText: params.normalizedText,
    sourceContract: "unknown_term_detector_v0",
    reason:
      "Unknown term remains unresolved and requires user confirmation and future resolver persistence before any bundle decision.",
    confidence: 0,
    requiresUserConfirmation: true,
    requiresResolverPersistenceLater: true,
    requiresStableBundleGateLater: true,
    externalConceptIsInternalCategory: false,
    canBecomeInternalCategoryNow: false,
    canEnterStableBundleNow: false,
    canCreateStableBundleNow: false,
    canPersistNow: false,
    canWriteStateNow: false,
    canCreateStateFact: false,
    safetyNotes: [
      "Unknown term is unresolved.",
      "Unknown term cannot enter stable semantic bundle now.",
      "Unknown term is not an internal category.",
      "Resolver/user decision is required later.",
    ],
  };
}

function buildExternalConceptDecision(params: {
  candidateKey: string;
  termText: string;
  normalizedText: string;
}): ResolverDecisionV0 {
  return {
    decisionKey: buildDecisionKey(["resolver", "external", params.candidateKey]),
    candidateKey: params.candidateKey,
    sourceKind: "external_concept_stub",
    status: "future_external_mapping_required",
    title: params.termText,
    normalizedText: params.normalizedText,
    sourceContract: "external_concept_stub_v0",
    reason:
      "External concept stub is not an internal category and requires future external lookup/mapping plus resolver decision.",
    confidence: 0.25,
    requiresUserConfirmation: true,
    requiresResolverPersistenceLater: true,
    requiresStableBundleGateLater: true,
    externalConceptIsInternalCategory: false,
    canBecomeInternalCategoryNow: false,
    canEnterStableBundleNow: false,
    canCreateStableBundleNow: false,
    canPersistNow: false,
    canWriteStateNow: false,
    canCreateStateFact: false,
    safetyNotes: [
      "External concept candidate is stub-only.",
      "External concept candidate is not an internal category.",
      "No real external ontology provider was called.",
      "It cannot enter stable semantic bundle now.",
    ],
  };
}

export function buildResolverDecisionContractV0(
  rawInput: ResolverDecisionRawInputV0
): ResolverDecisionContractResultV0 {
  const writes = buildResolverDecisionWritesV0();
  const primarySourceOrderProof =
    buildPrimaryCategorySourceSearchOrderProofV0(rawInput);

  if (!primarySourceOrderProof.ok) {
    return {
      ok: false,
      policy: RESOLVER_DECISION_CONTRACT_POLICY_V0,
      mode: RESOLVER_DECISION_CONTRACT_MODE_V0,
      inputText: primarySourceOrderProof.inputText,
      normalizedText: primarySourceOrderProof.normalizedText,
      inputLanguage: primarySourceOrderProof.inputLanguage,
      primarySourceOrderProof,
      decisions: [],
      acceptedLocalPreviewDecisions: [],
      blockedUnknownTermDecisions: [],
      blockedExternalConceptDecisions: [],
      summary: {
        localDecisionCount: 0,
        acceptedLocalPreviewDecisionCount: 0,
        unknownTermDecisionCount: 0,
        externalConceptDecisionCount: 0,
        blockedFromStableBundleDecisionCount: 0,
        totalDecisionCount: 0,
        localCategoryKeys: [],
        unknownTermKeys: [],
        externalConceptCandidateKeys: [],
        acceptedLocalCategoryKeys: [],
        blockedUnknownTermKeys: [],
        blockedExternalConceptKeys: [],
        resolverExecutedReadOnly: true,
        resolverPersistenceAllowedNow: false,
        stableBundleCreationAllowedNow: false,
        unresolvedCannotEnterStableBundle: true,
        externalConceptIsNotInternalCategory: true,
        categoryDoesNotCreateStateFact: true,
        canPersistNow: false,
        canWriteStateNow: false,
      },
      errors:
        primarySourceOrderProof.errors.length > 0
          ? primarySourceOrderProof.errors
          : ["Resolver decision contract requires valid primary source order proof input."],
      warnings: [],
      safetyNotes: [
        "Invalid input cannot produce resolver decisions.",
        "No SQL, DB write, Supabase write, stable bundle or state write is performed.",
      ],
      writes,
    };
  }

  const localLookup =
    primarySourceOrderProof.externalConceptStub.unknownTermDetector.localLookup;
  const unknownTermDetector =
    primarySourceOrderProof.externalConceptStub.unknownTermDetector;
  const externalConceptStub = primarySourceOrderProof.externalConceptStub;

  const acceptedLocalPreviewDecisions = localLookup.matches.map((match) =>
    buildLocalDecision({
      categoryKey: match.categoryKey,
      title: match.title,
      confidence: match.confidence,
    })
  );

  const blockedUnknownTermDecisions =
    unknownTermDetector.unknownTermCandidates.map((candidate) =>
      buildUnknownTermDecision({
        candidateKey: candidate.candidateKey,
        termText: candidate.termText,
        normalizedText: candidate.normalizedText,
      })
    );

  const blockedExternalConceptDecisions =
    externalConceptStub.externalConceptCandidates.map((candidate) =>
      buildExternalConceptDecision({
        candidateKey: candidate.candidateKey,
        termText: candidate.termText,
        normalizedText: candidate.normalizedText,
      })
    );

  const decisions = [
    ...acceptedLocalPreviewDecisions,
    ...blockedUnknownTermDecisions,
    ...blockedExternalConceptDecisions,
  ];

  const localCategoryKeys = localLookup.matches.map((match) => match.categoryKey);
  const unknownTermKeys = unknownTermDetector.unknownTermCandidates.map(
    (candidate) => candidate.candidateKey
  );
  const externalConceptCandidateKeys =
    externalConceptStub.externalConceptCandidates.map(
      (candidate) => candidate.candidateKey
    );

  return {
    ok: true,
    policy: RESOLVER_DECISION_CONTRACT_POLICY_V0,
    mode: RESOLVER_DECISION_CONTRACT_MODE_V0,
    inputText: primarySourceOrderProof.inputText,
    normalizedText: primarySourceOrderProof.normalizedText,
    inputLanguage: primarySourceOrderProof.inputLanguage,
    primarySourceOrderProof,
    decisions,
    acceptedLocalPreviewDecisions,
    blockedUnknownTermDecisions,
    blockedExternalConceptDecisions,
    summary: {
      localDecisionCount: acceptedLocalPreviewDecisions.length,
      acceptedLocalPreviewDecisionCount: acceptedLocalPreviewDecisions.length,
      unknownTermDecisionCount: blockedUnknownTermDecisions.length,
      externalConceptDecisionCount: blockedExternalConceptDecisions.length,
      blockedFromStableBundleDecisionCount:
        blockedUnknownTermDecisions.length +
        blockedExternalConceptDecisions.length,
      totalDecisionCount: decisions.length,
      localCategoryKeys,
      unknownTermKeys,
      externalConceptCandidateKeys,
      acceptedLocalCategoryKeys: localCategoryKeys,
      blockedUnknownTermKeys: unknownTermKeys,
      blockedExternalConceptKeys: externalConceptCandidateKeys,
      resolverExecutedReadOnly: true,
      resolverPersistenceAllowedNow: false,
      stableBundleCreationAllowedNow: false,
      unresolvedCannotEnterStableBundle: true,
      externalConceptIsNotInternalCategory: true,
      categoryDoesNotCreateStateFact: true,
      canPersistNow: false,
      canWriteStateNow: false,
    },
    errors: [],
    warnings: [
      "Resolver decisions are preview-only and are not persisted.",
      "Stable semantic bundle creation remains blocked until a future persistence gate.",
    ],
    safetyNotes: [
      "Resolver decision contract is read-only.",
      "Local category matches are accepted for preview only.",
      "Unknown terms require user confirmation and future resolver persistence.",
      "External concept stubs are not internal categories and require future mapping.",
      "No stable semantic bundle, Value Object, Activity Event, link or state fact is created.",
      "State facts/deltas/snapshots remain blocked until source/confidence/evidence/window contract exists.",
    ],
    writes,
  };
}

export function buildResolverDecisionReadinessV0() {
  return {
    ok: true,
    policy: RESOLVER_DECISION_CONTRACT_POLICY_V0,
    mode: "route_contract_readiness_no_resolver_decision_execution",
    routeMode: RESOLVER_DECISION_CONTRACT_MODE_V0,
    sourceContracts: {
      primaryCategorySourceSearchOrder:
        "primary_category_source_search_order_proof_v0",
      externalConceptStub: "external_concept_stub_v0",
      unknownTermDetector: "unknown_term_detector_v0",
      localControlledCategoryLookup: "local_controlled_category_lookup_v0",
    },
    decisionRules: [
      "Local controlled category matches may be accepted for preview only.",
      "Unknown terms require user confirmation and cannot enter stable bundles.",
      "External concept candidates are not internal categories and require future mapping/resolver decision.",
      "Resolver decisions are not persisted in this contract.",
      "Stable semantic bundle creation is blocked in this contract.",
      "Category decisions do not create state facts, state deltas or state snapshots.",
    ],
    safetyNotes: [
      "This contract proves resolver decision behavior only.",
      "It does not write resolver rows.",
      "It does not create categories or aliases.",
      "It does not create stable semantic bundles.",
      "It does not open a persistence gate.",
    ],
    writes: buildResolverDecisionWritesV0(),
  };
}
