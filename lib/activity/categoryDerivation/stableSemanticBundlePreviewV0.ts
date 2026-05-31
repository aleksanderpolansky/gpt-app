import {
  buildSourceOrderResolverBlockerPreviewV0,
  type SourceOrderResolverBlockerPreviewRawInputV0,
  type SourceOrderResolverBlockerPreviewResultV0,
} from "./sourceOrderResolverBlockerPreviewV0";

export const STABLE_SEMANTIC_BUNDLE_PREVIEW_POLICY_V0 =
  "stable_semantic_bundle_preview_v0" as const;

export const STABLE_SEMANTIC_BUNDLE_PREVIEW_MODE_V0 =
  "read_only_stable_semantic_bundle_preview_no_db_write" as const;

export type StableSemanticBundlePreviewPolicyV0 =
  typeof STABLE_SEMANTIC_BUNDLE_PREVIEW_POLICY_V0;

export type StableSemanticBundlePreviewModeV0 =
  typeof STABLE_SEMANTIC_BUNDLE_PREVIEW_MODE_V0;

export type StableSemanticBundlePreviewRawInputV0 =
  SourceOrderResolverBlockerPreviewRawInputV0;

export type StableSemanticBundleMemberPreviewV0 = {
  memberPreviewKey: string;
  sourceEligibilityKey: string;
  sourceDecisionKey: string;
  candidateKey: string;
  title: string;
  normalizedText: string;
  sourceKind: "local_controlled_category";
  status: "future_bundle_member_preview_only";
  sourceContract: "unresolved_stable_bundle_blocker_v0";
  resolverDecisionStatus: "accepted_for_preview";
  eligibleForFutureStableBundleAfterResolverPersistence: true;
  acceptedByResolverPreview: true;
  blockedFromStableBundleNow: true;
  canEnterStableBundleNow: false;
  canCreateStableBundleNow: false;
  canPersistNow: false;
  canWriteStateNow: false;
  canCreateStateFact: false;
  safetyNotes: string[];
};

export type StableSemanticBundleBlockedCandidatePreviewV0 = {
  blockedPreviewKey: string;
  sourceBlockKey: string;
  sourceDecisionKey: string;
  candidateKey: string;
  title: string;
  normalizedText: string;
  sourceKind: "unknown_term" | "external_concept_stub";
  status: "blocked_from_bundle_preview_membership";
  sourceContract: "unresolved_stable_bundle_blocker_v0";
  blockReasons: string[];
  blockedFromPreviewMembership: true;
  blockedFromStableBundleNow: true;
  canEnterStableBundleNow: false;
  canCreateStableBundleNow: false;
  canPersistNow: false;
  canWriteStateNow: false;
  canCreateStateFact: false;
  safetyNotes: string[];
};

export type StableSemanticBundlePreviewObjectV0 = {
  previewKey: string;
  status: "preview_only_not_persisted";
  memberPreviewCount: number;
  blockedCandidatePreviewCount: number;
  sourceOrderSatisfied: boolean;
  resolverApprovedOnlySatisfied: boolean;
  unresolvedCandidatesExcluded: true;
  externalConceptsExcluded: true;
  persistenceGateOpenNow: false;
  stableBundlePersistenceAllowedNow: false;
  canCreateStableBundleNow: false;
  canPersistNow: false;
  canWriteStateNow: false;
  memberPreviews: StableSemanticBundleMemberPreviewV0[];
  blockedCandidatePreviews: StableSemanticBundleBlockedCandidatePreviewV0[];
  safetyNotes: string[];
};

export type StableSemanticBundlePreviewWritesV0 = {
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

export type StableSemanticBundlePreviewSummaryV0 = {
  memberPreviewCount: number;
  blockedCandidatePreviewCount: number;
  localResolverAcceptedMemberCount: number;
  unknownTermBlockedCount: number;
  externalConceptBlockedCount: number;
  totalResolverDecisionCount: number;
  sourceOrderSatisfied: boolean;
  stableBundlePreviewReadOnly: true;
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
  memberPreviewKeys: string[];
  blockedCandidatePreviewKeys: string[];
};

export type StableSemanticBundlePreviewResultV0 = {
  ok: boolean;
  policy: StableSemanticBundlePreviewPolicyV0;
  mode: StableSemanticBundlePreviewModeV0;
  inputText: string | null;
  normalizedText: string | null;
  inputLanguage: string;
  sourceOrderResolverBlockerPreview: SourceOrderResolverBlockerPreviewResultV0;
  stableSemanticBundlePreview: StableSemanticBundlePreviewObjectV0 | null;
  memberPreviews: StableSemanticBundleMemberPreviewV0[];
  blockedCandidatePreviews: StableSemanticBundleBlockedCandidatePreviewV0[];
  summary: StableSemanticBundlePreviewSummaryV0;
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: StableSemanticBundlePreviewWritesV0;
};

function normalizeKey(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "stable-semantic-bundle-preview"
  );
}

function buildKey(parts: string[]): string {
  return normalizeKey(parts.join("-"));
}

export function buildStableSemanticBundlePreviewWritesV0(): StableSemanticBundlePreviewWritesV0 {
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

function emptySummary(): StableSemanticBundlePreviewSummaryV0 {
  return {
    memberPreviewCount: 0,
    blockedCandidatePreviewCount: 0,
    localResolverAcceptedMemberCount: 0,
    unknownTermBlockedCount: 0,
    externalConceptBlockedCount: 0,
    totalResolverDecisionCount: 0,
    sourceOrderSatisfied: false,
    stableBundlePreviewReadOnly: true,
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
    memberPreviewKeys: [],
    blockedCandidatePreviewKeys: [],
  };
}

function buildMemberPreview(
  item: SourceOrderResolverBlockerPreviewResultV0["unresolvedStableBundleBlocker"]["localFutureEligibilities"][number]
): StableSemanticBundleMemberPreviewV0 {
  return {
    memberPreviewKey: buildKey([
      "stable-bundle-member-preview",
      item.candidateKey,
    ]),
    sourceEligibilityKey: item.eligibilityKey,
    sourceDecisionKey: item.decisionKey,
    candidateKey: item.candidateKey,
    title: item.title,
    normalizedText: item.normalizedText,
    sourceKind: "local_controlled_category",
    status: "future_bundle_member_preview_only",
    sourceContract: "unresolved_stable_bundle_blocker_v0",
    resolverDecisionStatus: "accepted_for_preview",
    eligibleForFutureStableBundleAfterResolverPersistence: true,
    acceptedByResolverPreview: true,
    blockedFromStableBundleNow: true,
    canEnterStableBundleNow: false,
    canCreateStableBundleNow: false,
    canPersistNow: false,
    canWriteStateNow: false,
    canCreateStateFact: false,
    safetyNotes: [
      "This is a future stable bundle member preview only.",
      "It originates from a local resolver preview decision.",
      "It cannot be persisted until resolver persistence and stable bundle gates are explicitly opened.",
      "It cannot create Value Objects, Activity Events, links or state facts.",
    ],
  };
}

type StableSemanticBundleBlockedSourceCandidateV0 =
  SourceOrderResolverBlockerPreviewResultV0["unresolvedStableBundleBlocker"]["blockerCandidates"][number] & {
    sourceKind: "unknown_term" | "external_concept_stub";
  };

function isStableSemanticBundleBlockedSourceCandidateV0(
  item: SourceOrderResolverBlockerPreviewResultV0["unresolvedStableBundleBlocker"]["blockerCandidates"][number]
): item is StableSemanticBundleBlockedSourceCandidateV0 {
  return (
    item.sourceKind === "unknown_term" ||
    item.sourceKind === "external_concept_stub"
  );
}

function buildBlockedPreview(
  item: StableSemanticBundleBlockedSourceCandidateV0
): StableSemanticBundleBlockedCandidatePreviewV0 {
  return {
    blockedPreviewKey: buildKey([
      "stable-bundle-blocked-preview",
      item.sourceKind,
      item.candidateKey,
    ]),
    sourceBlockKey: item.blockKey,
    sourceDecisionKey: item.decisionKey,
    candidateKey: item.candidateKey,
    title: item.title,
    normalizedText: item.normalizedText,
    sourceKind: item.sourceKind,
    status: "blocked_from_bundle_preview_membership",
    sourceContract: "unresolved_stable_bundle_blocker_v0",
    blockReasons: item.blockReasons,
    blockedFromPreviewMembership: true,
    blockedFromStableBundleNow: true,
    canEnterStableBundleNow: false,
    canCreateStableBundleNow: false,
    canPersistNow: false,
    canWriteStateNow: false,
    canCreateStateFact: false,
    safetyNotes: [
      "This candidate is excluded from the stable semantic bundle preview.",
      "Unknown terms and external concept stubs must remain blocked.",
      "External concept stubs are not internal categories.",
      "No stable bundle, Value Object, Activity Event link or state fact is created.",
    ],
  };
}

function buildPreviewKey(inputText: string | null, memberCount: number): string {
  const base = inputText ? inputText.slice(0, 64) : "empty-input";

  return buildKey(["stable-bundle-preview", base, String(memberCount)]);
}

export function buildStableSemanticBundlePreviewV0(
  rawInput: StableSemanticBundlePreviewRawInputV0
): StableSemanticBundlePreviewResultV0 {
  const writes = buildStableSemanticBundlePreviewWritesV0();
  const sourceOrderResolverBlockerPreview =
    buildSourceOrderResolverBlockerPreviewV0(rawInput);

  if (!sourceOrderResolverBlockerPreview.ok) {
    return {
      ok: false,
      policy: STABLE_SEMANTIC_BUNDLE_PREVIEW_POLICY_V0,
      mode: STABLE_SEMANTIC_BUNDLE_PREVIEW_MODE_V0,
      inputText: sourceOrderResolverBlockerPreview.inputText,
      normalizedText: sourceOrderResolverBlockerPreview.normalizedText,
      inputLanguage: sourceOrderResolverBlockerPreview.inputLanguage,
      sourceOrderResolverBlockerPreview,
      stableSemanticBundlePreview: null,
      memberPreviews: [],
      blockedCandidatePreviews: [],
      summary: emptySummary(),
      errors:
        sourceOrderResolverBlockerPreview.errors.length > 0
          ? sourceOrderResolverBlockerPreview.errors
          : [
              "Stable semantic bundle preview requires valid source order resolver/blocker input.",
            ],
      warnings: [],
      safetyNotes: [
        "Invalid input cannot produce stable semantic bundle preview.",
        "No SQL, DB write, Supabase write, stable bundle or state write is performed.",
      ],
      writes,
    };
  }

  const blocker =
    sourceOrderResolverBlockerPreview.unresolvedStableBundleBlocker;
  const resolverDecision = blocker.resolverDecision;

  const memberPreviews = blocker.localFutureEligibilities.map(
    buildMemberPreview
  );
  const blockedCandidatePreviews = blocker.blockerCandidates
    .filter(isStableSemanticBundleBlockedSourceCandidateV0)
    .map(buildBlockedPreview);

  const unknownTermBlockedCount = blocker.unknownTermBlockers.length;
  const externalConceptBlockedCount = blocker.externalConceptBlockers.length;

  const resolverApprovedOnlySatisfied =
    memberPreviews.every(
      (member) =>
        member.sourceKind === "local_controlled_category" &&
        member.resolverDecisionStatus === "accepted_for_preview" &&
        member.acceptedByResolverPreview === true
    ) &&
    blockedCandidatePreviews.every(
      (blocked) =>
        blocked.sourceKind === "unknown_term" ||
        blocked.sourceKind === "external_concept_stub"
    );

  const stableSemanticBundlePreview: StableSemanticBundlePreviewObjectV0 = {
    previewKey: buildPreviewKey(
      sourceOrderResolverBlockerPreview.inputText,
      memberPreviews.length
    ),
    status: "preview_only_not_persisted",
    memberPreviewCount: memberPreviews.length,
    blockedCandidatePreviewCount: blockedCandidatePreviews.length,
    sourceOrderSatisfied:
      sourceOrderResolverBlockerPreview.summary.sourceOrderSatisfied,
    resolverApprovedOnlySatisfied,
    unresolvedCandidatesExcluded: true,
    externalConceptsExcluded: true,
    persistenceGateOpenNow: false,
    stableBundlePersistenceAllowedNow: false,
    canCreateStableBundleNow: false,
    canPersistNow: false,
    canWriteStateNow: false,
    memberPreviews,
    blockedCandidatePreviews,
    safetyNotes: [
      "Stable semantic bundle preview is read-only.",
      "Only local resolver preview decisions are proposed as future bundle members.",
      "Unknown terms and external concept candidates are excluded from membership.",
      "No stable semantic bundle is persisted by this preview.",
      "No state fact, state delta or state snapshot is created by this preview.",
    ],
  };

  return {
    ok: true,
    policy: STABLE_SEMANTIC_BUNDLE_PREVIEW_POLICY_V0,
    mode: STABLE_SEMANTIC_BUNDLE_PREVIEW_MODE_V0,
    inputText: sourceOrderResolverBlockerPreview.inputText,
    normalizedText: sourceOrderResolverBlockerPreview.normalizedText,
    inputLanguage: sourceOrderResolverBlockerPreview.inputLanguage,
    sourceOrderResolverBlockerPreview,
    stableSemanticBundlePreview,
    memberPreviews,
    blockedCandidatePreviews,
    summary: {
      memberPreviewCount: memberPreviews.length,
      blockedCandidatePreviewCount: blockedCandidatePreviews.length,
      localResolverAcceptedMemberCount: memberPreviews.length,
      unknownTermBlockedCount,
      externalConceptBlockedCount,
      totalResolverDecisionCount: resolverDecision.decisions.length,
      sourceOrderSatisfied:
        sourceOrderResolverBlockerPreview.summary.sourceOrderSatisfied,
      stableBundlePreviewReadOnly: true,
      resolverApprovedOnlySatisfied,
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
      memberPreviewKeys: memberPreviews.map((member) => member.memberPreviewKey),
      blockedCandidatePreviewKeys: blockedCandidatePreviews.map(
        (blocked) => blocked.blockedPreviewKey
      ),
    },
    errors: [],
    warnings: [
      "This is a stable semantic bundle preview only.",
      "Resolver persistence and stable bundle persistence gates remain closed.",
      "Value Object, Activity Event, link and state write policies remain blocked.",
    ],
    safetyNotes: [
      "Stable semantic bundle preview contract is read-only.",
      "Only resolver-approved local preview decisions are proposed as future members.",
      "Unknown terms and external concept stubs are explicitly excluded from bundle membership.",
      "External concept candidates are not internal categories.",
      "No SQL, Supabase, DB write, resolver row, stable bundle row, Value Object, link or state fact is created.",
    ],
    writes,
  };
}

export function buildStableSemanticBundlePreviewReadinessV0() {
  return {
    ok: true,
    policy: STABLE_SEMANTIC_BUNDLE_PREVIEW_POLICY_V0,
    mode: "route_contract_readiness_no_stable_bundle_preview_execution",
    routeMode: STABLE_SEMANTIC_BUNDLE_PREVIEW_MODE_V0,
    sourceContracts: {
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
    previewRules: [
      "Stable semantic bundle preview is read-only.",
      "Only accepted local resolver preview decisions may become member previews.",
      "Unknown terms are excluded from member previews.",
      "External concept stubs are excluded from member previews and are not internal categories.",
      "Stable bundle persistence gate remains closed.",
      "No Value Object, Activity Event, activity-value-object link or state fact is created.",
    ],
    safetyNotes: [
      "This contract builds only a non-persisted preview object.",
      "It does not persist resolver decisions.",
      "It does not create stable semantic bundles.",
      "It does not open a persistence gate.",
      "It does not create state facts, state deltas or state snapshots.",
    ],
    writes: buildStableSemanticBundlePreviewWritesV0(),
  };
}

