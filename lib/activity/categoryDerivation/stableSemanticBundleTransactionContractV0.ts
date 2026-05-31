import {
  buildStableSemanticBundleWriteGateDryRunV0,
  type StableSemanticBundleDryRunOperationV0,
  type StableSemanticBundleWriteGateDryRunRawInputV0,
  type StableSemanticBundleWriteGateDryRunResultV0,
} from "./stableSemanticBundleWriteGateDryRunV0";

export const STABLE_SEMANTIC_BUNDLE_TRANSACTION_CONTRACT_POLICY_V0 =
  "stable_semantic_bundle_transaction_contract_v0" as const;

export const STABLE_SEMANTIC_BUNDLE_TRANSACTION_CONTRACT_MODE_V0 =
  "read_only_stable_semantic_bundle_transaction_contract_no_db_mutation" as const;

export type StableSemanticBundleTransactionContractPolicyV0 =
  typeof STABLE_SEMANTIC_BUNDLE_TRANSACTION_CONTRACT_POLICY_V0;

export type StableSemanticBundleTransactionContractModeV0 =
  typeof STABLE_SEMANTIC_BUNDLE_TRANSACTION_CONTRACT_MODE_V0;

export type StableSemanticBundleTransactionContractRawInputV0 =
  StableSemanticBundleWriteGateDryRunRawInputV0;

export type StableSemanticBundleTransactionRequirementStatusV0 =
  | "defined_for_future_gate"
  | "required_before_write"
  | "blocked_until_explicit_gate";

export type StableSemanticBundleTransactionRequirementV0 = {
  requirementKey:
    | "server_side_only"
    | "explicit_sandbox_confirmation"
    | "test_input_or_activity_event_required"
    | "idempotency_key_required"
    | "single_transaction_required"
    | "live_schema_preflight_required"
    | "rollback_or_safe_retry_required"
    | "unknown_external_audit_only"
    | "state_write_forbidden"
    | "value_object_link_write_forbidden";
  title: string;
  status: StableSemanticBundleTransactionRequirementStatusV0;
  satisfiedForContractPreview: boolean;
  blocksExecutionNow: boolean;
  canOpenWriteGateNow: false;
  canPersistNow: false;
  canWriteStateNow: false;
  notes: string[];
};

export type StableSemanticBundleTransactionStepV0 = {
  transactionStepKey: string;
  transactionOrder: number;
  dryRunOperationKey: string;
  dryRunOperationKind: StableSemanticBundleDryRunOperationV0["operationKind"];
  targetTable: StableSemanticBundleDryRunOperationV0["targetTable"];
  futureMutationIntent: "future_transaction_row_persistence_preview";
  sourcePayloadKey: string;
  deterministicRowKey: string;
  rowPreview: StableSemanticBundleDryRunOperationV0["rowPreview"];
  dependencyStepKeys: string[];
  serverSideOnly: true;
  requiresExplicitSandboxConfirmation: true;
  idempotencyProtected: true;
  rollbackAware: true;
  dryRunOnly: true;
  executedNow: false;
  rowActuallyCreated: false;
  canOpenWriteGateNow: false;
  canPersistNow: false;
  canWriteStateNow: false;
  notes: string[];
};

export type StableSemanticBundleTransactionContractV0 = {
  transactionContractKey: string;
  transactionStatus: "transaction_contract_preview_only";
  policy: StableSemanticBundleTransactionContractPolicyV0;
  mode: StableSemanticBundleTransactionContractModeV0;
  idempotencyPreview: {
    idempotencyKeyRequired: true;
    deterministicPayloadHash: string;
    deterministicIdempotencyKey: string;
    duplicateRetryMode: "future_safe_noop_or_same_result_required";
    idempotencyCheckedNow: false;
  };
  gateBoundary: {
    serverSideOnly: true;
    clientIdentityTrusted: false;
    explicitSandboxConfirmationRequired: true;
    liveSchemaPreflightRequired: true;
    productionWriteForbidden: true;
    canOpenWriteGateNow: false;
    canPersistNow: false;
  };
  transactionBoundary: {
    singleTransactionRequiredForFutureWrite: true;
    transactionOpenedNow: false;
    transactionCommittedNow: false;
    transactionRolledBackNow: false;
    rowsActuallyWritten: 0;
  };
  transactionSteps: StableSemanticBundleTransactionStepV0[];
  rollbackPreview: {
    rollbackContractRequiredBeforeWrite: true;
    rollbackExecutedNow: false;
    rollbackSafeRetryRequired: true;
    rollbackStepCount: number;
    rowsActuallyRolledBack: 0;
  };
  exclusions: {
    unknownExternalCandidatesAuditOnly: true;
    unknownExternalCandidatesNeverMembers: true;
    stateWritesForbidden: true;
    valueObjectWritesForbidden: true;
    activityValueObjectLinkWritesForbidden: true;
  };
  safetyNotes: string[];
};

export type StableSemanticBundleTransactionContractWritesV0 = {
  sqlExecuted: false;
  dbReadExecuted: false;
  dbWriteExecuted: false;
  informationSchemaSelectExecuted: false;
  supabaseReadExecuted: false;
  supabaseWriteExecuted: false;
  externalNetworkCallExecuted: false;
  transactionExecuted: false;
  transactionCommitted: false;
  transactionRolledBack: false;
  rowsActuallyWritten: 0;
  rowsActuallyRolledBack: 0;
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

export type StableSemanticBundleTransactionContractSummaryV0 = {
  transactionContractCreated: boolean;
  transactionContractReadOnly: true;
  transactionStepCount: number;
  requirementCount: number;
  executionBlockingRequirementCount: number;
  dryRunPlanOperationCount: number;
  memberTransactionStepCount: number;
  blockedAuditTransactionStepCount: number;
  rowsActuallyWritten: 0;
  rowsActuallyRolledBack: 0;
  transactionExecuted: false;
  transactionCommitted: false;
  transactionRolledBack: false;
  idempotencyKeyRequired: true;
  idempotencyCheckedNow: false;
  deterministicPayloadHash: string | null;
  serverSideOnly: true;
  clientIdentityTrusted: false;
  explicitSandboxConfirmationRequired: true;
  liveSchemaPreflightRequired: true;
  productionWriteForbidden: true;
  sourceOrderSatisfied: boolean;
  resolverApprovedOnlySatisfied: boolean;
  dryRunOnly: true;
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
  canOpenWriteGateNow: false;
  canCreateStableBundleNow: false;
  canPersistNow: false;
  canWriteStateNow: false;
};

export type StableSemanticBundleTransactionContractResultV0 = {
  ok: boolean;
  policy: StableSemanticBundleTransactionContractPolicyV0;
  mode: StableSemanticBundleTransactionContractModeV0;
  inputText: string | null;
  normalizedText: string | null;
  inputLanguage: string;
  stableSemanticBundleWriteGateDryRun: StableSemanticBundleWriteGateDryRunResultV0;
  requirements: StableSemanticBundleTransactionRequirementV0[];
  transactionContract: StableSemanticBundleTransactionContractV0 | null;
  summary: StableSemanticBundleTransactionContractSummaryV0;
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: StableSemanticBundleTransactionContractWritesV0;
};

function normalizeKey(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "stable-semantic-bundle-transaction-contract"
  );
}

function buildKey(parts: string[]): string {
  return normalizeKey(parts.join("-"));
}

function deterministicHash(input: string): string {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function buildStableSemanticBundleTransactionContractWritesV0(): StableSemanticBundleTransactionContractWritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    informationSchemaSelectExecuted: false,
    supabaseReadExecuted: false,
    supabaseWriteExecuted: false,
    externalNetworkCallExecuted: false,
    transactionExecuted: false,
    transactionCommitted: false,
    transactionRolledBack: false,
    rowsActuallyWritten: 0,
    rowsActuallyRolledBack: 0,
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

function emptySummary(): StableSemanticBundleTransactionContractSummaryV0 {
  return {
    transactionContractCreated: false,
    transactionContractReadOnly: true,
    transactionStepCount: 0,
    requirementCount: 0,
    executionBlockingRequirementCount: 0,
    dryRunPlanOperationCount: 0,
    memberTransactionStepCount: 0,
    blockedAuditTransactionStepCount: 0,
    rowsActuallyWritten: 0,
    rowsActuallyRolledBack: 0,
    transactionExecuted: false,
    transactionCommitted: false,
    transactionRolledBack: false,
    idempotencyKeyRequired: true,
    idempotencyCheckedNow: false,
    deterministicPayloadHash: null,
    serverSideOnly: true,
    clientIdentityTrusted: false,
    explicitSandboxConfirmationRequired: true,
    liveSchemaPreflightRequired: true,
    productionWriteForbidden: true,
    sourceOrderSatisfied: false,
    resolverApprovedOnlySatisfied: false,
    dryRunOnly: true,
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
    canOpenWriteGateNow: false,
    canCreateStableBundleNow: false,
    canPersistNow: false,
    canWriteStateNow: false,
  };
}

function requirement(params: {
  requirementKey: StableSemanticBundleTransactionRequirementV0["requirementKey"];
  title: string;
  status: StableSemanticBundleTransactionRequirementStatusV0;
  satisfiedForContractPreview: boolean;
  blocksExecutionNow: boolean;
  notes: string[];
}): StableSemanticBundleTransactionRequirementV0 {
  return {
    requirementKey: params.requirementKey,
    title: params.title,
    status: params.status,
    satisfiedForContractPreview: params.satisfiedForContractPreview,
    blocksExecutionNow: params.blocksExecutionNow,
    canOpenWriteGateNow: false,
    canPersistNow: false,
    canWriteStateNow: false,
    notes: params.notes,
  };
}

function buildRequirements(): StableSemanticBundleTransactionRequirementV0[] {
  return [
    requirement({
      requirementKey: "server_side_only",
      title: "Server-side only gate",
      status: "required_before_write",
      satisfiedForContractPreview: true,
      blocksExecutionNow: true,
      notes: [
        "A future write route must be server-side only.",
        "Client identity cannot open the write gate.",
      ],
    }),
    requirement({
      requirementKey: "explicit_sandbox_confirmation",
      title: "Explicit sandbox confirmation",
      status: "blocked_until_explicit_gate",
      satisfiedForContractPreview: true,
      blocksExecutionNow: true,
      notes: [
        "A future write gate must require an exact typed sandbox confirmation.",
        "This contract does not ask for or accept persistence confirmation.",
      ],
    }),
    requirement({
      requirementKey: "test_input_or_activity_event_required",
      title: "Test input snapshot or activity event reference required",
      status: "required_before_write",
      satisfiedForContractPreview: true,
      blocksExecutionNow: true,
      notes: [
        "Future write must be bound to an activity_event_id or a clearly marked sandbox test input snapshot.",
      ],
    }),
    requirement({
      requirementKey: "idempotency_key_required",
      title: "Idempotency key required",
      status: "defined_for_future_gate",
      satisfiedForContractPreview: true,
      blocksExecutionNow: true,
      notes: [
        "The contract computes deterministic idempotency preview keys.",
        "Actual duplicate detection is not executed in this read-only step.",
      ],
    }),
    requirement({
      requirementKey: "single_transaction_required",
      title: "Single transaction required",
      status: "defined_for_future_gate",
      satisfiedForContractPreview: true,
      blocksExecutionNow: true,
      notes: [
        "Header, source snapshot, resolver snapshot, member rows and blocked-audit rows must be written atomically later.",
      ],
    }),
    requirement({
      requirementKey: "live_schema_preflight_required",
      title: "Live schema preflight required",
      status: "required_before_write",
      satisfiedForContractPreview: true,
      blocksExecutionNow: true,
      notes: [
        "C33-J.3 must verify live schema with information_schema SELECT only before any mutation gate.",
      ],
    }),
    requirement({
      requirementKey: "rollback_or_safe_retry_required",
      title: "Rollback or safe retry required",
      status: "defined_for_future_gate",
      satisfiedForContractPreview: true,
      blocksExecutionNow: true,
      notes: [
        "Future write implementation must support safe no-op on duplicate retry and rollback strategy on partial failure.",
      ],
    }),
    requirement({
      requirementKey: "unknown_external_audit_only",
      title: "Unknown/external candidates remain audit-only",
      status: "defined_for_future_gate",
      satisfiedForContractPreview: true,
      blocksExecutionNow: true,
      notes: [
        "Unknown terms and external concept candidates cannot become stable bundle members in this transaction contract.",
      ],
    }),
    requirement({
      requirementKey: "state_write_forbidden",
      title: "State writes forbidden",
      status: "blocked_until_explicit_gate",
      satisfiedForContractPreview: true,
      blocksExecutionNow: true,
      notes: [
        "Stable semantic bundle transaction cannot create state facts, deltas or snapshots.",
      ],
    }),
    requirement({
      requirementKey: "value_object_link_write_forbidden",
      title: "Value Object and activity-value-object link writes forbidden",
      status: "blocked_until_explicit_gate",
      satisfiedForContractPreview: true,
      blocksExecutionNow: true,
      notes: [
        "Stable semantic bundle transaction cannot create Value Objects or activity-value-object links.",
      ],
    }),
  ];
}

function buildTransactionStep(params: {
  dryRunOperation: StableSemanticBundleDryRunOperationV0;
  deterministicPayloadHash: string;
  dependencyStepKeys: string[];
}): StableSemanticBundleTransactionStepV0 {
  const deterministicRowKey = buildKey([
    "future-row",
    params.dryRunOperation.targetTable,
    params.dryRunOperation.operationKey,
    params.deterministicPayloadHash,
  ]);

  return {
    transactionStepKey: buildKey([
      "transaction-step",
      String(params.dryRunOperation.operationOrder),
      params.dryRunOperation.targetTable,
      params.dryRunOperation.operationKey,
    ]),
    transactionOrder: params.dryRunOperation.operationOrder,
    dryRunOperationKey: params.dryRunOperation.operationKey,
    dryRunOperationKind: params.dryRunOperation.operationKind,
    targetTable: params.dryRunOperation.targetTable,
    futureMutationIntent: "future_transaction_row_persistence_preview",
    sourcePayloadKey: params.dryRunOperation.sourcePayloadKey,
    deterministicRowKey,
    rowPreview: params.dryRunOperation.rowPreview,
    dependencyStepKeys: params.dependencyStepKeys,
    serverSideOnly: true,
    requiresExplicitSandboxConfirmation: true,
    idempotencyProtected: true,
    rollbackAware: true,
    dryRunOnly: true,
    executedNow: false,
    rowActuallyCreated: false,
    canOpenWriteGateNow: false,
    canPersistNow: false,
    canWriteStateNow: false,
    notes: [
      "This is a transaction step preview only.",
      "No database row is created in C33-J.2.",
      "Future execution requires live schema preflight and explicit sandbox write gate.",
    ],
  };
}

function buildTransactionContract(
  dryRunResult: StableSemanticBundleWriteGateDryRunResultV0
): StableSemanticBundleTransactionContractV0 {
  const dryRunPlan = dryRunResult.dryRunPlan;
  const operations = dryRunPlan?.operations ?? [];
  const payloadForHash = stableStringify({
    inputText: dryRunResult.inputText,
    normalizedText: dryRunResult.normalizedText,
    inputLanguage: dryRunResult.inputLanguage,
    operationKeys: operations.map((operationItem) => operationItem.operationKey),
    operationKinds: operations.map((operationItem) => operationItem.operationKind),
    targetTables: operations.map((operationItem) => operationItem.targetTable),
  });
  const deterministicPayloadHash = deterministicHash(payloadForHash);
  const deterministicIdempotencyKey = buildKey([
    "stable-semantic-bundle",
    "transaction",
    deterministicPayloadHash,
  ]);

  const transactionSteps = operations.map((operationItem) => {
    const dependencyStepKeys = operationItem.dependencyKeys.map((dependency) =>
      buildKey([
        "dependency",
        dependency,
        deterministicPayloadHash,
      ])
    );

    return buildTransactionStep({
      dryRunOperation: operationItem,
      deterministicPayloadHash,
      dependencyStepKeys,
    });
  });

  return {
    transactionContractKey: buildKey([
      "stable-semantic-bundle-transaction-contract",
      deterministicPayloadHash,
      String(transactionSteps.length),
    ]),
    transactionStatus: "transaction_contract_preview_only",
    policy: STABLE_SEMANTIC_BUNDLE_TRANSACTION_CONTRACT_POLICY_V0,
    mode: STABLE_SEMANTIC_BUNDLE_TRANSACTION_CONTRACT_MODE_V0,
    idempotencyPreview: {
      idempotencyKeyRequired: true,
      deterministicPayloadHash,
      deterministicIdempotencyKey,
      duplicateRetryMode: "future_safe_noop_or_same_result_required",
      idempotencyCheckedNow: false,
    },
    gateBoundary: {
      serverSideOnly: true,
      clientIdentityTrusted: false,
      explicitSandboxConfirmationRequired: true,
      liveSchemaPreflightRequired: true,
      productionWriteForbidden: true,
      canOpenWriteGateNow: false,
      canPersistNow: false,
    },
    transactionBoundary: {
      singleTransactionRequiredForFutureWrite: true,
      transactionOpenedNow: false,
      transactionCommittedNow: false,
      transactionRolledBackNow: false,
      rowsActuallyWritten: 0,
    },
    transactionSteps,
    rollbackPreview: {
      rollbackContractRequiredBeforeWrite: true,
      rollbackExecutedNow: false,
      rollbackSafeRetryRequired: true,
      rollbackStepCount: transactionSteps.length,
      rowsActuallyRolledBack: 0,
    },
    exclusions: {
      unknownExternalCandidatesAuditOnly: true,
      unknownExternalCandidatesNeverMembers: true,
      stateWritesForbidden: true,
      valueObjectWritesForbidden: true,
      activityValueObjectLinkWritesForbidden: true,
    },
    safetyNotes: [
      "This is a transaction contract preview only.",
      "No SQL, DB read, DB write, Supabase call or RPC is executed.",
      "No transaction is opened or committed.",
      "No row is created, updated or deleted.",
      "A future write gate must be sandbox-only, server-side, idempotency-protected and schema-verified first.",
    ],
  };
}

export function buildStableSemanticBundleTransactionContractV0(
  rawInput: StableSemanticBundleTransactionContractRawInputV0
): StableSemanticBundleTransactionContractResultV0 {
  const writes = buildStableSemanticBundleTransactionContractWritesV0();
  const stableSemanticBundleWriteGateDryRun =
    buildStableSemanticBundleWriteGateDryRunV0(rawInput);

  if (!stableSemanticBundleWriteGateDryRun.ok) {
    return {
      ok: false,
      policy: STABLE_SEMANTIC_BUNDLE_TRANSACTION_CONTRACT_POLICY_V0,
      mode: STABLE_SEMANTIC_BUNDLE_TRANSACTION_CONTRACT_MODE_V0,
      inputText: stableSemanticBundleWriteGateDryRun.inputText,
      normalizedText: stableSemanticBundleWriteGateDryRun.normalizedText,
      inputLanguage: stableSemanticBundleWriteGateDryRun.inputLanguage,
      stableSemanticBundleWriteGateDryRun,
      requirements: [],
      transactionContract: null,
      summary: emptySummary(),
      errors:
        stableSemanticBundleWriteGateDryRun.errors.length > 0
          ? stableSemanticBundleWriteGateDryRun.errors
          : [
              "Stable semantic bundle transaction contract requires valid dry-run input.",
            ],
      warnings: [],
      safetyNotes: [
        "Invalid input cannot produce a transaction contract preview.",
        "No SQL, DB read, DB write, Supabase write, stable bundle or state write is performed.",
      ],
      writes,
    };
  }

  const requirements = buildRequirements();
  const transactionContract = buildTransactionContract(
    stableSemanticBundleWriteGateDryRun
  );
  const executionBlockingRequirementCount = requirements.filter(
    (item) => item.blocksExecutionNow
  ).length;
  const memberTransactionStepCount =
    transactionContract.transactionSteps.filter(
      (item) => item.dryRunOperationKind === "would_create_member_row"
    ).length;
  const blockedAuditTransactionStepCount =
    transactionContract.transactionSteps.filter(
      (item) => item.dryRunOperationKind === "would_create_blocked_audit_row"
    ).length;

  return {
    ok: true,
    policy: STABLE_SEMANTIC_BUNDLE_TRANSACTION_CONTRACT_POLICY_V0,
    mode: STABLE_SEMANTIC_BUNDLE_TRANSACTION_CONTRACT_MODE_V0,
    inputText: stableSemanticBundleWriteGateDryRun.inputText,
    normalizedText: stableSemanticBundleWriteGateDryRun.normalizedText,
    inputLanguage: stableSemanticBundleWriteGateDryRun.inputLanguage,
    stableSemanticBundleWriteGateDryRun,
    requirements,
    transactionContract,
    summary: {
      transactionContractCreated: true,
      transactionContractReadOnly: true,
      transactionStepCount: transactionContract.transactionSteps.length,
      requirementCount: requirements.length,
      executionBlockingRequirementCount,
      dryRunPlanOperationCount:
        stableSemanticBundleWriteGateDryRun.summary.dryRunPlanOperationCount,
      memberTransactionStepCount,
      blockedAuditTransactionStepCount,
      rowsActuallyWritten: 0,
      rowsActuallyRolledBack: 0,
      transactionExecuted: false,
      transactionCommitted: false,
      transactionRolledBack: false,
      idempotencyKeyRequired: true,
      idempotencyCheckedNow: false,
      deterministicPayloadHash:
        transactionContract.idempotencyPreview.deterministicPayloadHash,
      serverSideOnly: true,
      clientIdentityTrusted: false,
      explicitSandboxConfirmationRequired: true,
      liveSchemaPreflightRequired: true,
      productionWriteForbidden: true,
      sourceOrderSatisfied:
        stableSemanticBundleWriteGateDryRun.summary.sourceOrderSatisfied,
      resolverApprovedOnlySatisfied:
        stableSemanticBundleWriteGateDryRun.summary
          .resolverApprovedOnlySatisfied,
      dryRunOnly: true,
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
      canOpenWriteGateNow: false,
      canCreateStableBundleNow: false,
      canPersistNow: false,
      canWriteStateNow: false,
    },
    errors: [],
    warnings: [
      "Stable semantic bundle transaction contract is read-only.",
      "The route defines future mutation order but performs no persistence.",
      "C33-J.3 live schema preflight and C33-J.4 explicit sandbox write gate remain required.",
    ],
    safetyNotes: [
      "This transaction contract is not a DB mutation contract.",
      "No SQL, DB read, DB write, information_schema SELECT, Supabase call or RPC is executed.",
      "RowsActuallyWritten remains 0.",
      "Unknown and external concept candidates remain audit-only and excluded from bundle membership.",
      "No resolver row, stable bundle row, member row, audit row, Value Object, link or state fact is created.",
    ],
    writes,
  };
}

export function buildStableSemanticBundleTransactionContractReadinessV0() {
  return {
    ok: true,
    policy: STABLE_SEMANTIC_BUNDLE_TRANSACTION_CONTRACT_POLICY_V0,
    mode: "route_contract_readiness_no_transaction_execution",
    routeMode: STABLE_SEMANTIC_BUNDLE_TRANSACTION_CONTRACT_MODE_V0,
    sourceContracts: {
      stableSemanticBundleWriteGateDryRun:
        "stable_semantic_bundle_write_gate_dry_run_v0",
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
    transactionContractRules: [
      "This route creates a transaction contract preview only.",
      "No SQL is executed.",
      "No DB read is executed.",
      "No DB write is executed.",
      "No information_schema SELECT is executed.",
      "No transaction is opened.",
      "No row is created.",
      "Client identity cannot open the future write gate.",
      "A future write gate must be server-side only, sandbox-only and explicitly confirmed.",
      "State, Value Object and activity-value-object link writes remain separate.",
    ],
    safetyNotes: [
      "This contract performs no SQL, DB read, DB write, Supabase call or RPC.",
      "It does not verify live schema.",
      "It does not persist resolver decisions.",
      "It does not create stable semantic bundles.",
      "It does not create state facts, state deltas or state snapshots.",
    ],
    writes: buildStableSemanticBundleTransactionContractWritesV0(),
  };
}
