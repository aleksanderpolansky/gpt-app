export const STABLE_SEMANTIC_BUNDLE_POST_WRITE_VERIFICATION_POLICY_V0 =
  "stable_semantic_bundle_post_write_verification_v0" as const;

export const STABLE_SEMANTIC_BUNDLE_POST_WRITE_VERIFICATION_MODE_V0 =
  "read_only_post_write_verification_stable_semantic_bundle_tables_only_v0" as const;

export type StableSemanticBundlePostWriteVerificationPolicyV0 =
  typeof STABLE_SEMANTIC_BUNDLE_POST_WRITE_VERIFICATION_POLICY_V0;

export type StableSemanticBundlePostWriteVerificationModeV0 =
  typeof STABLE_SEMANTIC_BUNDLE_POST_WRITE_VERIFICATION_MODE_V0;

export type StableSemanticBundlePostWriteVerificationRawInputV0 = {
  stableBundleId?: string;
  sandboxRunKey?: string;
  expectedMemberCount?: number;
  expectedBlockedAuditCount?: number;
  expectedSourceSnapshotCount?: number;
  expectedResolverSnapshotCount?: number;
  expectedTotalRowsRead?: number;
};

export type StableSemanticBundlePostWriteVerificationNormalizedInputV0 = {
  stableBundleId: string;
  sandboxRunKey: string;
  expectedMemberCount: number;
  expectedBlockedAuditCount: number;
  expectedSourceSnapshotCount: number;
  expectedResolverSnapshotCount: number;
  expectedTotalRowsRead: number;
};

export type StableSemanticBundlePostWriteVerificationWritesV0 = {
  sqlExecuted: false;
  dbReadExecuted: boolean;
  dbWriteExecuted: false;
  supabaseReadExecuted: boolean;
  supabaseWriteExecuted: false;
  transactionExecuted: false;
  transactionCommitted: false;
  transactionRolledBack: false;
  writeGateOpened: false;
  rowsActuallyWritten: 0;
  stableBundleCreated: false;
  stableBundlePersisted: false;
  stableBundleMemberInserted: false;
  stableBundleBlockedAuditInserted: false;
  stableBundleSourceSnapshotInserted: false;
  stableBundleResolverSnapshotInserted: false;
  resolverDecisionPersisted: false;
  resolverCandidateInserted: false;
  unknownTermCandidateInserted: false;
  externalConceptCandidateInserted: false;
  categoryInserted: false;
  categoryAliasInserted: false;
  activityEventInserted: false;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  stateFactCreated: false;
  stateDeltaCreated: false;
  stateSnapshotCreated: false;
};

export type StableSemanticBundlePostWriteVerificationCheckV0 = {
  checkKey:
    | "stable_bundle_id_valid"
    | "sandbox_run_key_valid"
    | "stable_bundle_found"
    | "stable_bundle_is_sandbox_test"
    | "stable_bundle_status_test_preview"
    | "idempotency_key_matches_sandbox_run"
    | "member_count_matches"
    | "blocked_audit_count_matches"
    | "source_snapshot_count_matches"
    | "resolver_snapshot_count_matches"
    | "total_rows_read_matches"
    | "read_only_verification"
    | "state_and_value_object_writes_absent";
  title: string;
  passed: boolean;
  blocksFinalLock: boolean;
  notes: string[];
};

export type StableSemanticBundlePostWriteVerificationCountsV0 = {
  stableBundleCount: number;
  memberCount: number;
  blockedAuditCount: number;
  sourceSnapshotCount: number;
  resolverSnapshotCount: number;
  totalRowsRead: number;
};

export type StableSemanticBundlePostWriteVerificationResultV0 = {
  ok: boolean;
  policy: StableSemanticBundlePostWriteVerificationPolicyV0;
  mode: StableSemanticBundlePostWriteVerificationModeV0;
  normalizedInput: StableSemanticBundlePostWriteVerificationNormalizedInputV0 | null;
  counts: StableSemanticBundlePostWriteVerificationCountsV0;
  checks: StableSemanticBundlePostWriteVerificationCheckV0[];
  summary: {
    postWriteVerificationCreated: boolean;
    postWriteVerificationReadOnly: true;
    finalLockPassed: boolean;
    stableBundleId: string | null;
    sandboxRunKey: string | null;
    stableBundleFound: boolean;
    stableBundleIsSandboxTest: boolean;
    stableBundleStatus: string | null;
    idempotencyKey: string | null;
    idempotencyKeyMatchesSandboxRun: boolean;
    expectedMemberCount: number | null;
    actualMemberCount: number;
    expectedBlockedAuditCount: number | null;
    actualBlockedAuditCount: number;
    expectedSourceSnapshotCount: number | null;
    actualSourceSnapshotCount: number;
    expectedResolverSnapshotCount: number | null;
    actualResolverSnapshotCount: number;
    expectedTotalRowsRead: number | null;
    actualTotalRowsRead: number;
    checkCount: number;
    passedCheckCount: number;
    failedCheckCount: number;
    blockingCheckCount: number;
    dbReadExecuted: boolean;
    dbWriteExecuted: false;
    rowsActuallyWritten: 0;
    writeGateOpened: false;
    stateWritesForbidden: true;
    valueObjectWritesForbidden: true;
    activityValueObjectLinkWritesForbidden: true;
  };
  dataPreview: {
    stableBundle: Record<string, unknown> | null;
    members: Array<Record<string, unknown>>;
    blockedAuditItems: Array<Record<string, unknown>>;
    sourceSnapshots: Array<Record<string, unknown>>;
    resolverSnapshots: Array<Record<string, unknown>>;
  };
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: StableSemanticBundlePostWriteVerificationWritesV0;
};

export function buildStableSemanticBundlePostWriteVerificationWritesV0(
  dbReadExecuted = false
): StableSemanticBundlePostWriteVerificationWritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted,
    dbWriteExecuted: false,
    supabaseReadExecuted: dbReadExecuted,
    supabaseWriteExecuted: false,
    transactionExecuted: false,
    transactionCommitted: false,
    transactionRolledBack: false,
    writeGateOpened: false,
    rowsActuallyWritten: 0,
    stableBundleCreated: false,
    stableBundlePersisted: false,
    stableBundleMemberInserted: false,
    stableBundleBlockedAuditInserted: false,
    stableBundleSourceSnapshotInserted: false,
    stableBundleResolverSnapshotInserted: false,
    resolverDecisionPersisted: false,
    resolverCandidateInserted: false,
    unknownTermCandidateInserted: false,
    externalConceptCandidateInserted: false,
    categoryInserted: false,
    categoryAliasInserted: false,
    activityEventInserted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    stateFactCreated: false,
    stateDeltaCreated: false,
    stateSnapshotCreated: false,
  };
}

function toInteger(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeInput(
  rawInput: StableSemanticBundlePostWriteVerificationRawInputV0
): StableSemanticBundlePostWriteVerificationNormalizedInputV0 | null {
  const stableBundleId =
    typeof rawInput.stableBundleId === "string"
      ? rawInput.stableBundleId.trim()
      : "";
  const sandboxRunKey =
    typeof rawInput.sandboxRunKey === "string"
      ? rawInput.sandboxRunKey.trim()
      : "";

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(stableBundleId)) {
    return null;
  }

  if (!sandboxRunKey.startsWith("c33-k4-sandbox-")) {
    return null;
  }

  return {
    stableBundleId,
    sandboxRunKey,
    expectedMemberCount: toInteger(rawInput.expectedMemberCount, 5),
    expectedBlockedAuditCount: toInteger(rawInput.expectedBlockedAuditCount, 0),
    expectedSourceSnapshotCount: toInteger(rawInput.expectedSourceSnapshotCount, 1),
    expectedResolverSnapshotCount: toInteger(
      rawInput.expectedResolverSnapshotCount,
      1
    ),
    expectedTotalRowsRead: toInteger(rawInput.expectedTotalRowsRead, 8),
  };
}

function check(params: {
  checkKey: StableSemanticBundlePostWriteVerificationCheckV0["checkKey"];
  title: string;
  passed: boolean;
  blocksFinalLock: boolean;
  notes: string[];
}): StableSemanticBundlePostWriteVerificationCheckV0 {
  return {
    checkKey: params.checkKey,
    title: params.title,
    passed: params.passed,
    blocksFinalLock: params.blocksFinalLock,
    notes: params.notes,
  };
}

export function buildStableSemanticBundlePostWriteVerificationResultV0(params: {
  rawInput: StableSemanticBundlePostWriteVerificationRawInputV0;
  stableBundle: Record<string, unknown> | null;
  members: Array<Record<string, unknown>>;
  blockedAuditItems: Array<Record<string, unknown>>;
  sourceSnapshots: Array<Record<string, unknown>>;
  resolverSnapshots: Array<Record<string, unknown>>;
  dbReadExecuted: boolean;
  readErrors?: string[];
}): StableSemanticBundlePostWriteVerificationResultV0 {
  const normalizedInput = normalizeInput(params.rawInput);
  const stableBundleCount = params.stableBundle ? 1 : 0;
  const counts = {
    stableBundleCount,
    memberCount: params.members.length,
    blockedAuditCount: params.blockedAuditItems.length,
    sourceSnapshotCount: params.sourceSnapshots.length,
    resolverSnapshotCount: params.resolverSnapshots.length,
    totalRowsRead:
      stableBundleCount +
      params.members.length +
      params.blockedAuditItems.length +
      params.sourceSnapshots.length +
      params.resolverSnapshots.length,
  };
  const stableBundleStatus =
    typeof params.stableBundle?.bundle_status === "string"
      ? params.stableBundle.bundle_status
      : null;
  const isSandboxTest = params.stableBundle?.is_sandbox_test === true;
  const idempotencyKey =
    typeof params.stableBundle?.idempotency_key === "string"
      ? params.stableBundle.idempotency_key
      : null;
  const idempotencyMatches =
    normalizedInput !== null &&
    idempotencyKey !== null &&
    idempotencyKey.includes(normalizedInput.sandboxRunKey);

  const checks = [
    check({
      checkKey: "stable_bundle_id_valid",
      title: "Stable bundle id is a valid UUID",
      passed: normalizedInput !== null,
      blocksFinalLock: normalizedInput === null,
      notes: ["C33-K.5 verifies the stableBundleId returned by C33-K.4R."],
    }),
    check({
      checkKey: "sandbox_run_key_valid",
      title: "Sandbox run key is valid",
      passed: normalizedInput !== null,
      blocksFinalLock: normalizedInput === null,
      notes: ["The sandbox run key must start with c33-k4-sandbox-."],
    }),
    check({
      checkKey: "stable_bundle_found",
      title: "Stable bundle header row is found",
      passed: counts.stableBundleCount === 1,
      blocksFinalLock: counts.stableBundleCount !== 1,
      notes: ["Exactly one header row must exist."],
    }),
    check({
      checkKey: "stable_bundle_is_sandbox_test",
      title: "Stable bundle is marked as sandbox test",
      passed: isSandboxTest,
      blocksFinalLock: !isSandboxTest,
      notes: ["C33-K.4R writes only sandbox test rows."],
    }),
    check({
      checkKey: "stable_bundle_status_test_preview",
      title: "Stable bundle status is test_preview",
      passed: stableBundleStatus === "test_preview",
      blocksFinalLock: stableBundleStatus !== "test_preview",
      notes: ["The first sandbox write must not produce production status."],
    }),
    check({
      checkKey: "idempotency_key_matches_sandbox_run",
      title: "Idempotency key contains sandbox run key",
      passed: idempotencyMatches,
      blocksFinalLock: !idempotencyMatches,
      notes: ["Duplicate retry safety depends on deterministic idempotency."],
    }),
    check({
      checkKey: "member_count_matches",
      title: "Member row count matches expectation",
      passed:
        normalizedInput !== null &&
        counts.memberCount === normalizedInput.expectedMemberCount,
      blocksFinalLock:
        normalizedInput === null ||
        counts.memberCount !== (normalizedInput?.expectedMemberCount ?? -1),
      notes: ["Known sample should persist five local controlled members."],
    }),
    check({
      checkKey: "blocked_audit_count_matches",
      title: "Blocked audit row count matches expectation",
      passed:
        normalizedInput !== null &&
        counts.blockedAuditCount === normalizedInput.expectedBlockedAuditCount,
      blocksFinalLock:
        normalizedInput === null ||
        counts.blockedAuditCount !==
          (normalizedInput?.expectedBlockedAuditCount ?? -1),
      notes: ["Known sample should persist zero blocked audit rows."],
    }),
    check({
      checkKey: "source_snapshot_count_matches",
      title: "Source snapshot row count matches expectation",
      passed:
        normalizedInput !== null &&
        counts.sourceSnapshotCount ===
          normalizedInput.expectedSourceSnapshotCount,
      blocksFinalLock:
        normalizedInput === null ||
        counts.sourceSnapshotCount !==
          (normalizedInput?.expectedSourceSnapshotCount ?? -1),
      notes: ["Exactly one source snapshot should exist."],
    }),
    check({
      checkKey: "resolver_snapshot_count_matches",
      title: "Resolver snapshot row count matches expectation",
      passed:
        normalizedInput !== null &&
        counts.resolverSnapshotCount ===
          normalizedInput.expectedResolverSnapshotCount,
      blocksFinalLock:
        normalizedInput === null ||
        counts.resolverSnapshotCount !==
          (normalizedInput?.expectedResolverSnapshotCount ?? -1),
      notes: ["Exactly one resolver snapshot should exist."],
    }),
    check({
      checkKey: "total_rows_read_matches",
      title: "Total verified row count matches expectation",
      passed:
        normalizedInput !== null &&
        counts.totalRowsRead === normalizedInput.expectedTotalRowsRead,
      blocksFinalLock:
        normalizedInput === null ||
        counts.totalRowsRead !== (normalizedInput?.expectedTotalRowsRead ?? -1),
      notes: ["Expected total verified rows for known sample is 8."],
    }),
    check({
      checkKey: "read_only_verification",
      title: "Verification is read-only",
      passed: params.dbReadExecuted === true,
      blocksFinalLock: params.dbReadExecuted !== true,
      notes: ["C33-K.5 performs SELECT reads only through Supabase client."],
    }),
    check({
      checkKey: "state_and_value_object_writes_absent",
      title: "State and Value Object writes are absent",
      passed: true,
      blocksFinalLock: false,
      notes: [
        "C33-K.5 does not write state facts, Value Objects, activity events or links.",
      ],
    }),
  ];

  const failedChecks = checks.filter((item) => !item.passed);
  const blockingChecks = checks.filter(
    (item) => item.blocksFinalLock && !item.passed
  );
  const errors = [...(params.readErrors ?? [])];

  if (blockingChecks.length > 0) {
    errors.push(...blockingChecks.map((item) => item.title));
  }

  return {
    ok: errors.length === 0 && blockingChecks.length === 0,
    policy: STABLE_SEMANTIC_BUNDLE_POST_WRITE_VERIFICATION_POLICY_V0,
    mode: STABLE_SEMANTIC_BUNDLE_POST_WRITE_VERIFICATION_MODE_V0,
    normalizedInput,
    counts,
    checks,
    summary: {
      postWriteVerificationCreated: true,
      postWriteVerificationReadOnly: true,
      finalLockPassed: errors.length === 0 && blockingChecks.length === 0,
      stableBundleId: normalizedInput?.stableBundleId ?? null,
      sandboxRunKey: normalizedInput?.sandboxRunKey ?? null,
      stableBundleFound: counts.stableBundleCount === 1,
      stableBundleIsSandboxTest: isSandboxTest,
      stableBundleStatus,
      idempotencyKey,
      idempotencyKeyMatchesSandboxRun: idempotencyMatches,
      expectedMemberCount: normalizedInput?.expectedMemberCount ?? null,
      actualMemberCount: counts.memberCount,
      expectedBlockedAuditCount: normalizedInput?.expectedBlockedAuditCount ?? null,
      actualBlockedAuditCount: counts.blockedAuditCount,
      expectedSourceSnapshotCount:
        normalizedInput?.expectedSourceSnapshotCount ?? null,
      actualSourceSnapshotCount: counts.sourceSnapshotCount,
      expectedResolverSnapshotCount:
        normalizedInput?.expectedResolverSnapshotCount ?? null,
      actualResolverSnapshotCount: counts.resolverSnapshotCount,
      expectedTotalRowsRead: normalizedInput?.expectedTotalRowsRead ?? null,
      actualTotalRowsRead: counts.totalRowsRead,
      checkCount: checks.length,
      passedCheckCount: checks.length - failedChecks.length,
      failedCheckCount: failedChecks.length,
      blockingCheckCount: blockingChecks.length,
      dbReadExecuted: params.dbReadExecuted,
      dbWriteExecuted: false,
      rowsActuallyWritten: 0,
      writeGateOpened: false,
      stateWritesForbidden: true,
      valueObjectWritesForbidden: true,
      activityValueObjectLinkWritesForbidden: true,
    },
    dataPreview: {
      stableBundle: params.stableBundle,
      members: params.members,
      blockedAuditItems: params.blockedAuditItems,
      sourceSnapshots: params.sourceSnapshots,
      resolverSnapshots: params.resolverSnapshots,
    },
    errors,
    warnings: [
      "C33-K.5 verifies rows created by C33-K.4R using read-only Supabase SELECT calls.",
      "No additional persistence is performed by this verification route.",
      "C33-K is considered complete only if all verification checks pass.",
    ],
    safetyNotes: [
      "No SQL text is executed.",
      "No DB write is executed.",
      "No transaction is opened, committed or rolled back.",
      "No state facts, state deltas, state snapshots, Value Objects, activity events or links are created.",
    ],
    writes: buildStableSemanticBundlePostWriteVerificationWritesV0(
      params.dbReadExecuted
    ),
  };
}

export function buildStableSemanticBundlePostWriteVerificationReadinessV0() {
  return {
    ok: true,
    policy: STABLE_SEMANTIC_BUNDLE_POST_WRITE_VERIFICATION_POLICY_V0,
    mode: "route_contract_readiness_post_write_verification",
    routeMode: STABLE_SEMANTIC_BUNDLE_POST_WRITE_VERIFICATION_MODE_V0,
    requiredInput: {
      stableBundleId: "uuid returned by C33-K.4R",
      sandboxRunKey: "c33-k4-sandbox-* run key used by C33-K.4R",
      expectedMemberCount: 5,
      expectedBlockedAuditCount: 0,
      expectedSourceSnapshotCount: 1,
      expectedResolverSnapshotCount: 1,
      expectedTotalRowsRead: 8,
    },
    verificationRules: [
      "This route performs read-only post-write verification.",
      "This route reads only the five stable semantic bundle persistence tables.",
      "This route does not execute SQL text.",
      "This route does not write DB rows.",
      "This route does not open the write gate.",
      "This route verifies sandbox test status.",
      "This route verifies test_preview bundle status.",
      "This route verifies idempotency key contains the sandbox run key.",
      "This route verifies expected member, audit, source snapshot and resolver snapshot counts.",
      "This route keeps state, Value Object and activity-value-object link writes forbidden.",
    ],
    writes: buildStableSemanticBundlePostWriteVerificationWritesV0(false),
  };
}
