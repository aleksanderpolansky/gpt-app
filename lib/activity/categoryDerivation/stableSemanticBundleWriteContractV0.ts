import {
  buildStableBundleResolverGateIntegrationV0,
  type StableBundleResolverGateIntegrationRawInputV0,
  type StableBundleResolverGateIntegrationResultV0,
} from "./stableBundleResolverGateIntegrationV0";

export const STABLE_SEMANTIC_BUNDLE_WRITE_CONTRACT_POLICY_V0 =
  "stable_semantic_bundle_write_contract_v0" as const;

export const STABLE_SEMANTIC_BUNDLE_WRITE_CONTRACT_MODE_V0 =
  "read_only_stable_semantic_bundle_write_contract_no_db_write" as const;

export type StableSemanticBundleWriteContractPolicyV0 =
  typeof STABLE_SEMANTIC_BUNDLE_WRITE_CONTRACT_POLICY_V0;

export type StableSemanticBundleWriteContractModeV0 =
  typeof STABLE_SEMANTIC_BUNDLE_WRITE_CONTRACT_MODE_V0;

export type StableSemanticBundleWriteContractRawInputV0 =
  StableBundleResolverGateIntegrationRawInputV0;

export type StableSemanticBundleWriteContractRequirementStatusV0 =
  | "satisfied_for_payload_preview"
  | "required_future_gate"
  | "blocked_by_contract";

export type StableSemanticBundleWriteContractRequirementV0 = {
  requirementKey:
    | "valid_input_snapshot"
    | "source_order_snapshot"
    | "resolver_approved_local_members_only"
    | "blocked_unknown_external_audit_snapshot"
    | "stable_bundle_storage_schema"
    | "explicit_write_gate"
    | "state_write_contract_separate"
    | "value_object_link_write_contract_separate";
  title: string;
  status: StableSemanticBundleWriteContractRequirementStatusV0;
  satisfiedForPayloadPreview: boolean;
  blocksPersistenceNow: boolean;
  canPersistNow: false;
  canWriteStateNow: false;
  notes: string[];
};

export type StableSemanticBundleWriteMemberPayloadPreviewV0 = {
  memberPayloadKey: string;
  memberPreviewKey: string;
  candidateKey: string;
  title: string;
  normalizedText: string;
  sourceKind: "local_controlled_category";
  resolverDecisionStatus: "accepted_for_preview";
  includedInFutureBundlePayloadPreview: true;
  canPersistNow: false;
  canWriteStateNow: false;
};

export type StableSemanticBundleWriteBlockedAuditPayloadPreviewV0 = {
  blockedAuditKey: string;
  blockedPreviewKey: string;
  candidateKey: string;
  title: string;
  normalizedText: string;
  sourceKind: "unknown_term" | "external_concept_stub";
  excludedFromFutureBundleMembers: true;
  retainedForAuditPreview: true;
  canPersistNow: false;
  canWriteStateNow: false;
};

export type StableSemanticBundleWouldWritePayloadPreviewV0 = {
  payloadPreviewKey: string;
  payloadStatus: "would_write_payload_preview_only";
  contractPolicy: StableSemanticBundleWriteContractPolicyV0;
  contractMode: StableSemanticBundleWriteContractModeV0;
  inputSnapshot: {
    inputText: string | null;
    normalizedText: string | null;
    inputLanguage: string;
  };
  sourceOrderSnapshot: {
    policy: "stable_bundle_resolver_gate_integration_v0";
    stageCount: number;
    stages: string[];
  };
  resolverSnapshot: {
    resolverDecisionCount: number;
    localAcceptedMemberCount: number;
    unresolvedBlockerCount: number;
    unknownTermBlockedCount: number;
    externalConceptBlockedCount: number;
  };
  memberPayloadPreviews: StableSemanticBundleWriteMemberPayloadPreviewV0[];
  blockedAuditPayloadPreviews: StableSemanticBundleWriteBlockedAuditPayloadPreviewV0[];
  persistenceGate: {
    persistenceGateBlocked: true;
    persistenceGateOpenNow: false;
    resolverPersistenceAllowedNow: false;
    stableBundleCreationAllowedNow: false;
    stableBundlePersistenceAllowedNow: false;
    canPersistNow: false;
  };
  separationRules: {
    stateWriteSeparated: true;
    valueObjectWriteSeparated: true;
    activityValueObjectLinkWriteSeparated: true;
    resolverDecisionPersistenceSeparated: true;
  };
  safetyNotes: string[];
};

export type StableSemanticBundleWriteContractWritesV0 = {
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

export type StableSemanticBundleWriteContractSummaryV0 = {
  writeContractPreviewCreated: boolean;
  memberPayloadPreviewCount: number;
  blockedAuditPayloadPreviewCount: number;
  requirementCount: number;
  persistenceBlockingRequirementCount: number;
  localMatchCount: number;
  resolverDecisionCount: number;
  unresolvedBlockerCount: number;
  unknownTermCandidateCount: number;
  externalConceptCandidateCount: number;
  sourceOrderSatisfied: boolean;
  resolverApprovedOnlySatisfied: boolean;
  stableBundlePreviewReadOnly: true;
  writeContractReadOnly: true;
  persistenceGateBlocked: true;
  persistenceGateOpenNow: false;
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

export type StableSemanticBundleWriteContractResultV0 = {
  ok: boolean;
  policy: StableSemanticBundleWriteContractPolicyV0;
  mode: StableSemanticBundleWriteContractModeV0;
  inputText: string | null;
  normalizedText: string | null;
  inputLanguage: string;
  stableBundleResolverGateIntegration: StableBundleResolverGateIntegrationResultV0;
  requirements: StableSemanticBundleWriteContractRequirementV0[];
  wouldWritePayloadPreview: StableSemanticBundleWouldWritePayloadPreviewV0 | null;
  summary: StableSemanticBundleWriteContractSummaryV0;
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: StableSemanticBundleWriteContractWritesV0;
};

function normalizeKey(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "stable-semantic-bundle-write-contract"
  );
}

function buildKey(parts: string[]): string {
  return normalizeKey(parts.join("-"));
}

export function buildStableSemanticBundleWriteContractWritesV0(): StableSemanticBundleWriteContractWritesV0 {
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

function emptySummary(): StableSemanticBundleWriteContractSummaryV0 {
  return {
    writeContractPreviewCreated: false,
    memberPayloadPreviewCount: 0,
    blockedAuditPayloadPreviewCount: 0,
    requirementCount: 0,
    persistenceBlockingRequirementCount: 0,
    localMatchCount: 0,
    resolverDecisionCount: 0,
    unresolvedBlockerCount: 0,
    unknownTermCandidateCount: 0,
    externalConceptCandidateCount: 0,
    sourceOrderSatisfied: false,
    resolverApprovedOnlySatisfied: false,
    stableBundlePreviewReadOnly: true,
    writeContractReadOnly: true,
    persistenceGateBlocked: true,
    persistenceGateOpenNow: false,
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

function buildRequirement(params: {
  requirementKey: StableSemanticBundleWriteContractRequirementV0["requirementKey"];
  title: string;
  status: StableSemanticBundleWriteContractRequirementStatusV0;
  satisfiedForPayloadPreview: boolean;
  blocksPersistenceNow: boolean;
  notes: string[];
}): StableSemanticBundleWriteContractRequirementV0 {
  return {
    requirementKey: params.requirementKey,
    title: params.title,
    status: params.status,
    satisfiedForPayloadPreview: params.satisfiedForPayloadPreview,
    blocksPersistenceNow: params.blocksPersistenceNow,
    canPersistNow: false,
    canWriteStateNow: false,
    notes: params.notes,
  };
}

function buildRequirements(
  integration: StableBundleResolverGateIntegrationResultV0
): StableSemanticBundleWriteContractRequirementV0[] {
  return [
    buildRequirement({
      requirementKey: "valid_input_snapshot",
      title: "Valid input snapshot",
      status: integration.ok
        ? "satisfied_for_payload_preview"
        : "blocked_by_contract",
      satisfiedForPayloadPreview: integration.ok,
      blocksPersistenceNow: false,
      notes: [
        "Payload preview can carry inputText, normalizedText and inputLanguage.",
        "This does not persist the input snapshot.",
      ],
    }),
    buildRequirement({
      requirementKey: "source_order_snapshot",
      title: "Ordered source chain snapshot",
      status: integration.summary.sourceOrderSatisfied
        ? "satisfied_for_payload_preview"
        : "blocked_by_contract",
      satisfiedForPayloadPreview: integration.summary.sourceOrderSatisfied,
      blocksPersistenceNow: false,
      notes: [
        "C33-H integration exposes ordered stages.",
        "A future write gate must decide exact stored audit/source snapshot format.",
      ],
    }),
    buildRequirement({
      requirementKey: "resolver_approved_local_members_only",
      title: "Resolver-approved local members only",
      status: integration.summary.resolverApprovedOnlySatisfied
        ? "satisfied_for_payload_preview"
        : "blocked_by_contract",
      satisfiedForPayloadPreview:
        integration.summary.resolverApprovedOnlySatisfied,
      blocksPersistenceNow: false,
      notes: [
        "Only local controlled category member previews are included.",
        "Unknown and external candidates are not member payload rows.",
      ],
    }),
    buildRequirement({
      requirementKey: "blocked_unknown_external_audit_snapshot",
      title: "Blocked unknown/external audit snapshot",
      status: "satisfied_for_payload_preview",
      satisfiedForPayloadPreview: true,
      blocksPersistenceNow: false,
      notes: [
        "Blocked unknown/external candidates are retained as audit preview payload.",
        "They remain excluded from future stable bundle members.",
      ],
    }),
    buildRequirement({
      requirementKey: "stable_bundle_storage_schema",
      title: "Stable bundle storage schema",
      status: "required_future_gate",
      satisfiedForPayloadPreview: true,
      blocksPersistenceNow: true,
      notes: [
        "C33-I.2 defines payload only.",
        "C33-I.3 must perform schema preflight before any write route exists.",
      ],
    }),
    buildRequirement({
      requirementKey: "explicit_write_gate",
      title: "Explicit write gate",
      status: "required_future_gate",
      satisfiedForPayloadPreview: true,
      blocksPersistenceNow: true,
      notes: [
        "This route does not open persistence.",
        "A later gate must be explicitly authorized before sandbox writes.",
      ],
    }),
    buildRequirement({
      requirementKey: "state_write_contract_separate",
      title: "State write contract is separate",
      status: "required_future_gate",
      satisfiedForPayloadPreview: true,
      blocksPersistenceNow: true,
      notes: [
        "Stable semantic bundle persistence cannot create state facts.",
        "State writes require source/confidence/evidence/window contract.",
      ],
    }),
    buildRequirement({
      requirementKey: "value_object_link_write_contract_separate",
      title: "Value Object/link write contract is separate",
      status: "required_future_gate",
      satisfiedForPayloadPreview: true,
      blocksPersistenceNow: true,
      notes: [
        "Stable bundle persistence cannot create Value Objects or activity-value-object links.",
        "Value Object/link writes require a separate gate.",
      ],
    }),
  ];
}

function buildMemberPayloadPreviews(
  integration: StableBundleResolverGateIntegrationResultV0
): StableSemanticBundleWriteMemberPayloadPreviewV0[] {
  const stableBundlePreview =
    integration.stableBundlePersistenceGateBlocker.stableSemanticBundlePreview;

  return stableBundlePreview.memberPreviews.map((member) => ({
    memberPayloadKey: buildKey([
      "stable-bundle-member-payload",
      member.memberPreviewKey,
    ]),
    memberPreviewKey: member.memberPreviewKey,
    candidateKey: member.candidateKey,
    title: member.title,
    normalizedText: member.normalizedText,
    sourceKind: "local_controlled_category",
    resolverDecisionStatus: "accepted_for_preview",
    includedInFutureBundlePayloadPreview: true,
    canPersistNow: false,
    canWriteStateNow: false,
  }));
}

function buildBlockedAuditPayloadPreviews(
  integration: StableBundleResolverGateIntegrationResultV0
): StableSemanticBundleWriteBlockedAuditPayloadPreviewV0[] {
  const stableBundlePreview =
    integration.stableBundlePersistenceGateBlocker.stableSemanticBundlePreview;

  return stableBundlePreview.blockedCandidatePreviews.map((blocked) => ({
    blockedAuditKey: buildKey([
      "stable-bundle-blocked-audit-payload",
      blocked.blockedPreviewKey,
    ]),
    blockedPreviewKey: blocked.blockedPreviewKey,
    candidateKey: blocked.candidateKey,
    title: blocked.title,
    normalizedText: blocked.normalizedText,
    sourceKind: blocked.sourceKind,
    excludedFromFutureBundleMembers: true,
    retainedForAuditPreview: true,
    canPersistNow: false,
    canWriteStateNow: false,
  }));
}

function buildWouldWritePayloadPreview(
  integration: StableBundleResolverGateIntegrationResultV0
): StableSemanticBundleWouldWritePayloadPreviewV0 {
  const memberPayloadPreviews = buildMemberPayloadPreviews(integration);
  const blockedAuditPayloadPreviews = buildBlockedAuditPayloadPreviews(
    integration
  );

  return {
    payloadPreviewKey: buildKey([
      "stable-semantic-bundle-write-payload",
      integration.inputText ?? "no-input",
      String(memberPayloadPreviews.length),
      String(blockedAuditPayloadPreviews.length),
    ]),
    payloadStatus: "would_write_payload_preview_only",
    contractPolicy: STABLE_SEMANTIC_BUNDLE_WRITE_CONTRACT_POLICY_V0,
    contractMode: STABLE_SEMANTIC_BUNDLE_WRITE_CONTRACT_MODE_V0,
    inputSnapshot: {
      inputText: integration.inputText,
      normalizedText: integration.normalizedText,
      inputLanguage: integration.inputLanguage,
    },
    sourceOrderSnapshot: {
      policy: "stable_bundle_resolver_gate_integration_v0",
      stageCount: integration.stages.length,
      stages: integration.stages.map(
        (stage) =>
          `${stage.order}:${stage.stageKey}:${stage.status}:${stage.count}`
      ),
    },
    resolverSnapshot: {
      resolverDecisionCount: integration.summary.resolverDecisionCount,
      localAcceptedMemberCount: integration.summary.memberPreviewCount,
      unresolvedBlockerCount: integration.summary.unresolvedBlockerCount,
      unknownTermBlockedCount: integration.summary.unknownTermCandidateCount,
      externalConceptBlockedCount:
        integration.summary.externalConceptCandidateCount,
    },
    memberPayloadPreviews,
    blockedAuditPayloadPreviews,
    persistenceGate: {
      persistenceGateBlocked: true,
      persistenceGateOpenNow: false,
      resolverPersistenceAllowedNow: false,
      stableBundleCreationAllowedNow: false,
      stableBundlePersistenceAllowedNow: false,
      canPersistNow: false,
    },
    separationRules: {
      stateWriteSeparated: true,
      valueObjectWriteSeparated: true,
      activityValueObjectLinkWriteSeparated: true,
      resolverDecisionPersistenceSeparated: true,
    },
    safetyNotes: [
      "This is a would-write payload preview only.",
      "It intentionally does not perform SQL, Supabase, DB read, DB write or RPC.",
      "It includes only resolver-approved local member payload previews.",
      "Blocked unknown/external candidates are retained only for audit preview.",
      "State, Value Object and activity-value-object link writes remain separate.",
    ],
  };
}

export function buildStableSemanticBundleWriteContractV0(
  rawInput: StableSemanticBundleWriteContractRawInputV0
): StableSemanticBundleWriteContractResultV0 {
  const writes = buildStableSemanticBundleWriteContractWritesV0();
  const stableBundleResolverGateIntegration =
    buildStableBundleResolverGateIntegrationV0(rawInput);

  if (!stableBundleResolverGateIntegration.ok) {
    return {
      ok: false,
      policy: STABLE_SEMANTIC_BUNDLE_WRITE_CONTRACT_POLICY_V0,
      mode: STABLE_SEMANTIC_BUNDLE_WRITE_CONTRACT_MODE_V0,
      inputText: stableBundleResolverGateIntegration.inputText,
      normalizedText: stableBundleResolverGateIntegration.normalizedText,
      inputLanguage: stableBundleResolverGateIntegration.inputLanguage,
      stableBundleResolverGateIntegration,
      requirements: [],
      wouldWritePayloadPreview: null,
      summary: emptySummary(),
      errors:
        stableBundleResolverGateIntegration.errors.length > 0
          ? stableBundleResolverGateIntegration.errors
          : [
              "Stable semantic bundle write contract requires valid resolver/gate integration input.",
            ],
      warnings: [],
      safetyNotes: [
        "Invalid input cannot produce a stable semantic bundle write payload preview.",
        "No SQL, DB read, DB write, Supabase write, stable bundle or state write is performed.",
      ],
      writes,
    };
  }

  const requirements = buildRequirements(stableBundleResolverGateIntegration);
  const wouldWritePayloadPreview = buildWouldWritePayloadPreview(
    stableBundleResolverGateIntegration
  );
  const persistenceBlockingRequirementCount = requirements.filter(
    (requirement) => requirement.blocksPersistenceNow
  ).length;

  return {
    ok: true,
    policy: STABLE_SEMANTIC_BUNDLE_WRITE_CONTRACT_POLICY_V0,
    mode: STABLE_SEMANTIC_BUNDLE_WRITE_CONTRACT_MODE_V0,
    inputText: stableBundleResolverGateIntegration.inputText,
    normalizedText: stableBundleResolverGateIntegration.normalizedText,
    inputLanguage: stableBundleResolverGateIntegration.inputLanguage,
    stableBundleResolverGateIntegration,
    requirements,
    wouldWritePayloadPreview,
    summary: {
      writeContractPreviewCreated: true,
      memberPayloadPreviewCount:
        wouldWritePayloadPreview.memberPayloadPreviews.length,
      blockedAuditPayloadPreviewCount:
        wouldWritePayloadPreview.blockedAuditPayloadPreviews.length,
      requirementCount: requirements.length,
      persistenceBlockingRequirementCount,
      localMatchCount: stableBundleResolverGateIntegration.summary.localMatchCount,
      resolverDecisionCount:
        stableBundleResolverGateIntegration.summary.resolverDecisionCount,
      unresolvedBlockerCount:
        stableBundleResolverGateIntegration.summary.unresolvedBlockerCount,
      unknownTermCandidateCount:
        stableBundleResolverGateIntegration.summary.unknownTermCandidateCount,
      externalConceptCandidateCount:
        stableBundleResolverGateIntegration.summary.externalConceptCandidateCount,
      sourceOrderSatisfied:
        stableBundleResolverGateIntegration.summary.sourceOrderSatisfied,
      resolverApprovedOnlySatisfied:
        stableBundleResolverGateIntegration.summary.resolverApprovedOnlySatisfied,
      stableBundlePreviewReadOnly: true,
      writeContractReadOnly: true,
      persistenceGateBlocked: true,
      persistenceGateOpenNow: false,
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
      "Stable semantic bundle write contract is a read-only payload contract.",
      "No stable bundle write is executed.",
      "Schema preflight and explicit write gate remain future C33-I steps.",
    ],
    safetyNotes: [
      "This contract defines what could be written later, not what is written now.",
      "Only resolver-approved local category members are included in member payload preview.",
      "Unknown and external concept candidates remain excluded from bundle membership.",
      "Blocked candidates are retained only as audit preview data.",
      "No SQL, Supabase, DB read, DB write, resolver row, stable bundle row, Value Object, link or state fact is created.",
    ],
    writes,
  };
}

export function buildStableSemanticBundleWriteContractReadinessV0() {
  return {
    ok: true,
    policy: STABLE_SEMANTIC_BUNDLE_WRITE_CONTRACT_POLICY_V0,
    mode: "route_contract_readiness_no_stable_semantic_bundle_write_execution",
    routeMode: STABLE_SEMANTIC_BUNDLE_WRITE_CONTRACT_MODE_V0,
    sourceContracts: {
      stableBundleResolverGateIntegration:
        "stable_bundle_resolver_gate_integration_v0",
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
    writeContractRules: [
      "This route defines a would-write payload preview only.",
      "Only resolver-approved local category member previews may enter the payload preview.",
      "Unknown terms and external concept stubs remain excluded from bundle membership.",
      "Blocked candidates are audit-preview-only.",
      "Stable bundle schema preflight remains a separate future step.",
      "Stable bundle write gate remains closed.",
      "State, Value Object and activity-value-object link writes remain separate.",
    ],
    safetyNotes: [
      "This contract performs no SQL, DB read, DB write, Supabase call or RPC.",
      "It does not persist resolver decisions.",
      "It does not create stable semantic bundles.",
      "It does not open a persistence gate.",
      "It does not create state facts, state deltas or state snapshots.",
    ],
    writes: buildStableSemanticBundleWriteContractWritesV0(),
  };
}
