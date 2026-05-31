import {
  buildStableSemanticBundleSchemaPreflightV0,
  type StableSemanticBundleSchemaPreflightRawInputV0,
  type StableSemanticBundleSchemaPreflightResultV0,
  type StableSemanticBundleSchemaPreflightTableKeyV0,
} from "./stableSemanticBundleSchemaPreflightV0";

export const STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_POLICY_V0 =
  "stable_semantic_bundle_write_gate_dry_run_v0" as const;

export const STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_MODE_V0 =
  "read_only_stable_semantic_bundle_write_gate_dry_run_no_db_mutation" as const;

export type StableSemanticBundleWriteGateDryRunPolicyV0 =
  typeof STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_POLICY_V0;

export type StableSemanticBundleWriteGateDryRunModeV0 =
  typeof STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_MODE_V0;

export type StableSemanticBundleWriteGateDryRunRawInputV0 =
  StableSemanticBundleSchemaPreflightRawInputV0;

export type StableSemanticBundleDryRunOperationKindV0 =
  | "would_create_bundle_header_row"
  | "would_create_source_snapshot_row"
  | "would_create_resolver_snapshot_row"
  | "would_create_member_row"
  | "would_create_blocked_audit_row";

export type StableSemanticBundleDryRunOperationV0 = {
  operationKey: string;
  operationOrder: number;
  operationKind: StableSemanticBundleDryRunOperationKindV0;
  targetTable: StableSemanticBundleSchemaPreflightTableKeyV0;
  sourcePayloadKey: string;
  rowPreview: Record<string, string | number | boolean | null>;
  dependencyKeys: string[];
  dryRunOnly: true;
  executedNow: false;
  rowActuallyCreated: false;
  canPersistNow: false;
  canWriteStateNow: false;
  notes: string[];
};

export type StableSemanticBundleWriteGateDryRunPlanV0 = {
  dryRunPlanKey: string;
  dryRunStatus: "would_write_plan_preview_only";
  policy: StableSemanticBundleWriteGateDryRunPolicyV0;
  mode: StableSemanticBundleWriteGateDryRunModeV0;
  transactionBoundaryPreview: {
    transactionRequiredForFutureWrite: true;
    transactionExecutedNow: false;
    rollbackRequiredNow: false;
    rowsActuallyWritten: 0;
    canCommitNow: false;
  };
  operationCount: number;
  operations: StableSemanticBundleDryRunOperationV0[];
  blockedNow: {
    persistenceGateBlocked: true;
    explicitWriteGateMissing: true;
    schemaLiveVerificationMissing: true;
    resolverPersistenceMissing: true;
    productionWriteForbidden: true;
    canPersistNow: false;
  };
  safetyNotes: string[];
};

export type StableSemanticBundleWriteGateDryRunWritesV0 = {
  sqlExecuted: false;
  dbReadExecuted: false;
  dbWriteExecuted: false;
  informationSchemaSelectExecuted: false;
  supabaseReadExecuted: false;
  supabaseWriteExecuted: false;
  externalNetworkCallExecuted: false;
  transactionExecuted: false;
  rowsActuallyWritten: 0;
  resolverDecisionPersisted: false;
  resolverCandidateInserted: false;
  unknownTermCandidateInserted: false;
  externalConceptCandidateInserted: false;
  categoryInserted: false;
  categoryAliasInserted: false;
  stableBundleCreated: false;
  stableBundlePersisted: false;
  stableBundleTableCreated: false;
  stableBundleTableAltered: false;
  stableBundleMemberInserted: false;
  stableBundleBlockedAuditInserted: false;
  stableBundleSourceSnapshotInserted: false;
  stableBundleResolverSnapshotInserted: false;
  activityEventInserted: false;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  stateFactCreated: false;
  stateDeltaCreated: false;
  stateSnapshotCreated: false;
};

export type StableSemanticBundleWriteGateDryRunSummaryV0 = {
  dryRunCreated: boolean;
  dryRunOnly: true;
  dryRunPlanOperationCount: number;
  rowsActuallyWritten: 0;
  transactionExecuted: false;
  tableSpecCount: number;
  preflightCheckCount: number;
  memberPayloadPreviewCount: number;
  blockedAuditPayloadPreviewCount: number;
  bundleHeaderOperationCount: number;
  sourceSnapshotOperationCount: number;
  resolverSnapshotOperationCount: number;
  memberOperationCount: number;
  blockedAuditOperationCount: number;
  sourceOrderSatisfied: boolean;
  resolverApprovedOnlySatisfied: boolean;
  schemaPreflightReadOnly: true;
  writeContractReadOnly: true;
  selectOnlyFutureVerification: true;
  informationSchemaSelectExecuted: false;
  sqlExecuted: false;
  dbReadExecuted: false;
  dbWriteExecuted: false;
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

export type StableSemanticBundleWriteGateDryRunResultV0 = {
  ok: boolean;
  policy: StableSemanticBundleWriteGateDryRunPolicyV0;
  mode: StableSemanticBundleWriteGateDryRunModeV0;
  inputText: string | null;
  normalizedText: string | null;
  inputLanguage: string;
  stableSemanticBundleSchemaPreflight: StableSemanticBundleSchemaPreflightResultV0;
  dryRunPlan: StableSemanticBundleWriteGateDryRunPlanV0 | null;
  summary: StableSemanticBundleWriteGateDryRunSummaryV0;
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: StableSemanticBundleWriteGateDryRunWritesV0;
};

function normalizeKey(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "stable-semantic-bundle-dry-run"
  );
}

function buildKey(parts: string[]): string {
  return normalizeKey(parts.join("-"));
}

export function buildStableSemanticBundleWriteGateDryRunWritesV0(): StableSemanticBundleWriteGateDryRunWritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    informationSchemaSelectExecuted: false,
    supabaseReadExecuted: false,
    supabaseWriteExecuted: false,
    externalNetworkCallExecuted: false,
    transactionExecuted: false,
    rowsActuallyWritten: 0,
    resolverDecisionPersisted: false,
    resolverCandidateInserted: false,
    unknownTermCandidateInserted: false,
    externalConceptCandidateInserted: false,
    categoryInserted: false,
    categoryAliasInserted: false,
    stableBundleCreated: false,
    stableBundlePersisted: false,
    stableBundleTableCreated: false,
    stableBundleTableAltered: false,
    stableBundleMemberInserted: false,
    stableBundleBlockedAuditInserted: false,
    stableBundleSourceSnapshotInserted: false,
    stableBundleResolverSnapshotInserted: false,
    activityEventInserted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    stateFactCreated: false,
    stateDeltaCreated: false,
    stateSnapshotCreated: false,
  };
}

function emptySummary(): StableSemanticBundleWriteGateDryRunSummaryV0 {
  return {
    dryRunCreated: false,
    dryRunOnly: true,
    dryRunPlanOperationCount: 0,
    rowsActuallyWritten: 0,
    transactionExecuted: false,
    tableSpecCount: 0,
    preflightCheckCount: 0,
    memberPayloadPreviewCount: 0,
    blockedAuditPayloadPreviewCount: 0,
    bundleHeaderOperationCount: 0,
    sourceSnapshotOperationCount: 0,
    resolverSnapshotOperationCount: 0,
    memberOperationCount: 0,
    blockedAuditOperationCount: 0,
    sourceOrderSatisfied: false,
    resolverApprovedOnlySatisfied: false,
    schemaPreflightReadOnly: true,
    writeContractReadOnly: true,
    selectOnlyFutureVerification: true,
    informationSchemaSelectExecuted: false,
    sqlExecuted: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
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

function operation(params: {
  operationOrder: number;
  operationKind: StableSemanticBundleDryRunOperationKindV0;
  targetTable: StableSemanticBundleSchemaPreflightTableKeyV0;
  sourcePayloadKey: string;
  rowPreview: Record<string, string | number | boolean | null>;
  dependencyKeys?: string[];
  notes: string[];
}): StableSemanticBundleDryRunOperationV0 {
  return {
    operationKey: buildKey([
      "dry-run-operation",
      String(params.operationOrder),
      params.operationKind,
      params.targetTable,
      params.sourcePayloadKey,
    ]),
    operationOrder: params.operationOrder,
    operationKind: params.operationKind,
    targetTable: params.targetTable,
    sourcePayloadKey: params.sourcePayloadKey,
    rowPreview: params.rowPreview,
    dependencyKeys: params.dependencyKeys ?? [],
    dryRunOnly: true,
    executedNow: false,
    rowActuallyCreated: false,
    canPersistNow: false,
    canWriteStateNow: false,
    notes: params.notes,
  };
}

function buildDryRunPlan(
  schemaPreflight: StableSemanticBundleSchemaPreflightResultV0
): StableSemanticBundleWriteGateDryRunPlanV0 {
  const writeContract = schemaPreflight.stableSemanticBundleWriteContract;
  const payload = writeContract.wouldWritePayloadPreview;
  const operations: StableSemanticBundleDryRunOperationV0[] = [];

  if (!payload) {
    return {
      dryRunPlanKey: buildKey([
        "stable-semantic-bundle-write-gate-dry-run",
        schemaPreflight.inputText ?? "no-input",
        "no-payload",
      ]),
      dryRunStatus: "would_write_plan_preview_only",
      policy: STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_POLICY_V0,
      mode: STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_MODE_V0,
      transactionBoundaryPreview: {
        transactionRequiredForFutureWrite: true,
        transactionExecutedNow: false,
        rollbackRequiredNow: false,
        rowsActuallyWritten: 0,
        canCommitNow: false,
      },
      operationCount: 0,
      operations,
      blockedNow: {
        persistenceGateBlocked: true,
        explicitWriteGateMissing: true,
        schemaLiveVerificationMissing: true,
        resolverPersistenceMissing: true,
        productionWriteForbidden: true,
        canPersistNow: false,
      },
      safetyNotes: [
        "No payload preview exists, so dry-run operation list is empty.",
        "No database mutation is performed.",
      ],
    };
  }

  const futureBundleKey = payload.payloadPreviewKey;

  operations.push(
    operation({
      operationOrder: operations.length + 1,
      operationKind: "would_create_bundle_header_row",
      targetTable: "stable_semantic_bundles",
      sourcePayloadKey: payload.payloadPreviewKey,
      rowPreview: {
        futureBundleKey,
        inputText: payload.inputSnapshot.inputText,
        normalizedText: payload.inputSnapshot.normalizedText,
        inputLanguage: payload.inputSnapshot.inputLanguage,
        policyVersion: payload.contractPolicy,
        payloadStatus: payload.payloadStatus,
      },
      notes: [
        "Future bundle header row preview only.",
        "No row is created now.",
      ],
    })
  );

  operations.push(
    operation({
      operationOrder: operations.length + 1,
      operationKind: "would_create_source_snapshot_row",
      targetTable: "stable_semantic_bundle_source_snapshots",
      sourcePayloadKey: payload.sourceOrderSnapshot.policy,
      dependencyKeys: [futureBundleKey],
      rowPreview: {
        futureBundleKey,
        sourceOrderPolicy: payload.sourceOrderSnapshot.policy,
        stageCount: payload.sourceOrderSnapshot.stageCount,
      },
      notes: [
        "Future source-order snapshot row preview only.",
        "No row is created now.",
      ],
    })
  );

  operations.push(
    operation({
      operationOrder: operations.length + 1,
      operationKind: "would_create_resolver_snapshot_row",
      targetTable: "stable_semantic_bundle_resolver_snapshots",
      sourcePayloadKey: payload.payloadPreviewKey,
      dependencyKeys: [futureBundleKey],
      rowPreview: {
        futureBundleKey,
        resolverDecisionCount: payload.resolverSnapshot.resolverDecisionCount,
        localAcceptedMemberCount:
          payload.resolverSnapshot.localAcceptedMemberCount,
        unresolvedBlockerCount: payload.resolverSnapshot.unresolvedBlockerCount,
        unknownTermBlockedCount:
          payload.resolverSnapshot.unknownTermBlockedCount,
        externalConceptBlockedCount:
          payload.resolverSnapshot.externalConceptBlockedCount,
      },
      notes: [
        "Future resolver snapshot row preview only.",
        "This is not resolver decision persistence.",
      ],
    })
  );

  for (const member of payload.memberPayloadPreviews) {
    operations.push(
      operation({
        operationOrder: operations.length + 1,
        operationKind: "would_create_member_row",
        targetTable: "stable_semantic_bundle_members",
        sourcePayloadKey: member.memberPayloadKey,
        dependencyKeys: [futureBundleKey],
        rowPreview: {
          futureBundleKey,
          memberPreviewKey: member.memberPreviewKey,
          candidateKey: member.candidateKey,
          normalizedText: member.normalizedText,
          sourceKind: member.sourceKind,
          resolverDecisionStatus: member.resolverDecisionStatus,
        },
        notes: [
          "Future member row preview only.",
          "Only local controlled category members are eligible.",
          "No row is created now.",
        ],
      })
    );
  }

  for (const blocked of payload.blockedAuditPayloadPreviews) {
    operations.push(
      operation({
        operationOrder: operations.length + 1,
        operationKind: "would_create_blocked_audit_row",
        targetTable: "stable_semantic_bundle_blocked_audit_items",
        sourcePayloadKey: blocked.blockedAuditKey,
        dependencyKeys: [futureBundleKey],
        rowPreview: {
          futureBundleKey,
          blockedPreviewKey: blocked.blockedPreviewKey,
          candidateKey: blocked.candidateKey,
          normalizedText: blocked.normalizedText,
          sourceKind: blocked.sourceKind,
          excludedFromFutureBundleMembers:
            blocked.excludedFromFutureBundleMembers,
          retainedForAuditPreview: blocked.retainedForAuditPreview,
        },
        notes: [
          "Future blocked-audit row preview only.",
          "Blocked unknown/external candidates remain excluded from membership.",
          "No row is created now.",
        ],
      })
    );
  }

  return {
    dryRunPlanKey: buildKey([
      "stable-semantic-bundle-write-gate-dry-run",
      schemaPreflight.inputText ?? "no-input",
      String(operations.length),
    ]),
    dryRunStatus: "would_write_plan_preview_only",
    policy: STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_POLICY_V0,
    mode: STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_MODE_V0,
    transactionBoundaryPreview: {
      transactionRequiredForFutureWrite: true,
      transactionExecutedNow: false,
      rollbackRequiredNow: false,
      rowsActuallyWritten: 0,
      canCommitNow: false,
    },
    operationCount: operations.length,
    operations,
    blockedNow: {
      persistenceGateBlocked: true,
      explicitWriteGateMissing: true,
      schemaLiveVerificationMissing: true,
      resolverPersistenceMissing: true,
      productionWriteForbidden: true,
      canPersistNow: false,
    },
    safetyNotes: [
      "This is a dry-run transaction plan only.",
      "No SQL, DB read, DB write, Supabase call or RPC is executed.",
      "No transaction is opened.",
      "No row is created.",
      "Future sandbox writes require a separate explicit gate.",
    ],
  };
}

export function buildStableSemanticBundleWriteGateDryRunV0(
  rawInput: StableSemanticBundleWriteGateDryRunRawInputV0
): StableSemanticBundleWriteGateDryRunResultV0 {
  const writes = buildStableSemanticBundleWriteGateDryRunWritesV0();
  const stableSemanticBundleSchemaPreflight =
    buildStableSemanticBundleSchemaPreflightV0(rawInput);

  if (!stableSemanticBundleSchemaPreflight.ok) {
    return {
      ok: false,
      policy: STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_POLICY_V0,
      mode: STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_MODE_V0,
      inputText: stableSemanticBundleSchemaPreflight.inputText,
      normalizedText: stableSemanticBundleSchemaPreflight.normalizedText,
      inputLanguage: stableSemanticBundleSchemaPreflight.inputLanguage,
      stableSemanticBundleSchemaPreflight,
      dryRunPlan: null,
      summary: emptySummary(),
      errors:
        stableSemanticBundleSchemaPreflight.errors.length > 0
          ? stableSemanticBundleSchemaPreflight.errors
          : [
              "Stable semantic bundle write-gate dry-run requires valid schema preflight input.",
            ],
      warnings: [],
      safetyNotes: [
        "Invalid input cannot produce a write-gate dry-run plan.",
        "No SQL, DB read, DB write, Supabase write, stable bundle or state write is performed.",
      ],
      writes,
    };
  }

  const dryRunPlan = buildDryRunPlan(stableSemanticBundleSchemaPreflight);
  const memberOperationCount = dryRunPlan.operations.filter(
    (item) => item.operationKind === "would_create_member_row"
  ).length;
  const blockedAuditOperationCount = dryRunPlan.operations.filter(
    (item) => item.operationKind === "would_create_blocked_audit_row"
  ).length;

  return {
    ok: true,
    policy: STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_POLICY_V0,
    mode: STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_MODE_V0,
    inputText: stableSemanticBundleSchemaPreflight.inputText,
    normalizedText: stableSemanticBundleSchemaPreflight.normalizedText,
    inputLanguage: stableSemanticBundleSchemaPreflight.inputLanguage,
    stableSemanticBundleSchemaPreflight,
    dryRunPlan,
    summary: {
      dryRunCreated: true,
      dryRunOnly: true,
      dryRunPlanOperationCount: dryRunPlan.operationCount,
      rowsActuallyWritten: 0,
      transactionExecuted: false,
      tableSpecCount: stableSemanticBundleSchemaPreflight.summary.tableSpecCount,
      preflightCheckCount:
        stableSemanticBundleSchemaPreflight.summary.preflightCheckCount,
      memberPayloadPreviewCount:
        stableSemanticBundleSchemaPreflight.summary.memberPayloadPreviewCount,
      blockedAuditPayloadPreviewCount:
        stableSemanticBundleSchemaPreflight.summary
          .blockedAuditPayloadPreviewCount,
      bundleHeaderOperationCount: 1,
      sourceSnapshotOperationCount: 1,
      resolverSnapshotOperationCount: 1,
      memberOperationCount,
      blockedAuditOperationCount,
      sourceOrderSatisfied:
        stableSemanticBundleSchemaPreflight.summary.sourceOrderSatisfied,
      resolverApprovedOnlySatisfied:
        stableSemanticBundleSchemaPreflight.summary
          .resolverApprovedOnlySatisfied,
      schemaPreflightReadOnly: true,
      writeContractReadOnly: true,
      selectOnlyFutureVerification: true,
      informationSchemaSelectExecuted: false,
      sqlExecuted: false,
      dbReadExecuted: false,
      dbWriteExecuted: false,
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
      "Stable semantic bundle write-gate dry-run is read-only.",
      "The route builds a would-create-row plan but performs no persistence.",
      "A later explicit sandbox write gate is still required.",
    ],
    safetyNotes: [
      "This dry-run contract is not a DB mutation contract.",
      "No SQL, DB read, DB write, information_schema SELECT, Supabase call or RPC is executed.",
      "RowsActuallyWritten remains 0.",
      "Unknown and external concept candidates remain excluded from bundle membership.",
      "No resolver row, stable bundle row, member row, audit row, Value Object, link or state fact is created.",
    ],
    writes,
  };
}

export function buildStableSemanticBundleWriteGateDryRunReadinessV0() {
  return {
    ok: true,
    policy: STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_POLICY_V0,
    mode: "route_contract_readiness_no_write_gate_dry_run_execution",
    routeMode: STABLE_SEMANTIC_BUNDLE_WRITE_GATE_DRY_RUN_MODE_V0,
    sourceContracts: {
      stableSemanticBundleSchemaPreflight:
        "stable_semantic_bundle_schema_preflight_v0",
      stableSemanticBundleWriteContract:
        "stable_semantic_bundle_write_contract_v0",
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
    dryRunRules: [
      "This route creates a dry-run plan only.",
      "No SQL is executed.",
      "No DB read is executed.",
      "No DB write is executed.",
      "No information_schema SELECT is executed in this route.",
      "No transaction is opened.",
      "No row is created.",
      "Stable bundle write gate remains closed.",
      "State, Value Object and activity-value-object link writes remain separate.",
    ],
    safetyNotes: [
      "This contract performs no SQL, DB read, DB write, Supabase call or RPC.",
      "It does not verify live schema.",
      "It does not persist resolver decisions.",
      "It does not create stable semantic bundles.",
      "It does not create state facts, state deltas or state snapshots.",
    ],
    writes: buildStableSemanticBundleWriteGateDryRunWritesV0(),
  };
}
