import { buildStableSemanticBundleTransactionContractV0 } from "./stableSemanticBundleTransactionContractV0";
import {
  buildStableSemanticBundlePersistenceServiceWritesV0,
  runStableSemanticBundlePersistenceServiceV0,
} from "./stableSemanticBundlePersistenceServiceV0";

export const STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_DRY_RUN_PARITY_POLICY_V0 =
  "stable_semantic_bundle_persistence_service_dry_run_parity_v0" as const;

export const STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_DRY_RUN_PARITY_MODE_V0 =
  "service_wrapper_dry_run_parity_no_db_read_no_db_write_v0" as const;

export type StableSemanticBundlePersistenceServiceDryRunParityCaseKeyV0 =
  | "known_math_child_detached_preview"
  | "unknown_quantum_beekeeping_existing_activity_event_ref";

export type StableSemanticBundlePersistenceServiceDryRunParityCaseV0 = {
  caseKey: StableSemanticBundlePersistenceServiceDryRunParityCaseKeyV0;
  title: string;
  rawText: string;
  inputLanguage: string;
  activityEventId: string | null;
  expectedTransactionStepCount: number;
  expectedMemberTransactionStepCount: number;
  expectedBlockedAuditTransactionStepCount: number;
};

export type StableSemanticBundlePersistenceServiceDryRunParityResultCaseV0 = {
  caseKey: StableSemanticBundlePersistenceServiceDryRunParityCaseKeyV0;
  title: string;
  passed: boolean;
  serviceOk: boolean;
  transactionOk: boolean;
  serviceTransactionContractOk: boolean;
  activityEventReferenceAccepted: boolean;
  transactionStepCountMatches: boolean;
  memberTransactionStepCountMatches: boolean;
  blockedAuditTransactionStepCountMatches: boolean;
  expectedTransactionStepCount: number;
  actualServiceTransactionStepCount: number;
  actualDirectTransactionStepCount: number;
  expectedMemberTransactionStepCount: number;
  actualServiceMemberTransactionStepCount: number;
  actualDirectMemberTransactionStepCount: number;
  expectedBlockedAuditTransactionStepCount: number;
  actualServiceBlockedAuditTransactionStepCount: number;
  actualDirectBlockedAuditTransactionStepCount: number;
  noDbRead: boolean;
  noDbWrite: boolean;
  noSql: boolean;
  noActivityEventCreation: boolean;
  noValueObjectCreation: boolean;
  noStateWrite: boolean;
  errors: string[];
};

export type StableSemanticBundlePersistenceServiceDryRunParityResultV0 = {
  ok: boolean;
  policy: typeof STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_DRY_RUN_PARITY_POLICY_V0;
  mode: typeof STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_DRY_RUN_PARITY_MODE_V0;
  caseCount: number;
  passedCount: number;
  failedCount: number;
  cases: StableSemanticBundlePersistenceServiceDryRunParityResultCaseV0[];
  summary: {
    parityPassed: boolean;
    dbReadExecuted: false;
    dbWriteExecuted: false;
    sqlExecuted: false;
    productionWriteGateOpened: false;
    sandboxWriteGateOpened: false;
    activityEventCreated: false;
    valueObjectCreated: false;
    activityValueObjectLinkCreated: false;
    stateFactCreated: false;
    stateDeltaCreated: false;
    stateSnapshotCreated: false;
    productRouteCreated: false;
  };
  safetyNotes: string[];
  writes: ReturnType<typeof buildStableSemanticBundlePersistenceServiceWritesV0>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function evaluateCase(
  testCase: StableSemanticBundlePersistenceServiceDryRunParityCaseV0
): StableSemanticBundlePersistenceServiceDryRunParityResultCaseV0 {
  const serviceResult = runStableSemanticBundlePersistenceServiceV0({
    mode: "dry_run",
    rawText: testCase.rawText,
    inputLanguage: testCase.inputLanguage,
    source: "manual",
    activityEventId: testCase.activityEventId,
  });

  const directTransaction = buildStableSemanticBundleTransactionContractV0({
    rawText: testCase.rawText,
    inputLanguage: testCase.inputLanguage,
  });

  const directTransactionRecord = asRecord(directTransaction);
  const directTransactionSummary = asRecord(directTransactionRecord.summary);

  const actualServiceTransactionStepCount =
    serviceResult.summary.transactionStepCount;
  const actualDirectTransactionStepCount = asNumber(
    directTransactionSummary.transactionStepCount
  );

  const actualServiceMemberTransactionStepCount =
    serviceResult.summary.memberTransactionStepCount;
  const actualDirectMemberTransactionStepCount = asNumber(
    directTransactionSummary.memberTransactionStepCount
  );

  const actualServiceBlockedAuditTransactionStepCount =
    serviceResult.summary.blockedAuditTransactionStepCount;
  const actualDirectBlockedAuditTransactionStepCount = asNumber(
    directTransactionSummary.blockedAuditTransactionStepCount
  );

  const transactionStepCountMatches =
    actualServiceTransactionStepCount === actualDirectTransactionStepCount &&
    actualServiceTransactionStepCount === testCase.expectedTransactionStepCount;

  const memberTransactionStepCountMatches =
    actualServiceMemberTransactionStepCount ===
      actualDirectMemberTransactionStepCount &&
    actualServiceMemberTransactionStepCount ===
      testCase.expectedMemberTransactionStepCount;

  const blockedAuditTransactionStepCountMatches =
    actualServiceBlockedAuditTransactionStepCount ===
      actualDirectBlockedAuditTransactionStepCount &&
    actualServiceBlockedAuditTransactionStepCount ===
      testCase.expectedBlockedAuditTransactionStepCount;

  const noDbRead =
    serviceResult.summary.canReadDbNow === false &&
    serviceResult.writes.dbReadExecuted === false &&
    serviceResult.writes.supabaseReadExecuted === false;

  const noDbWrite =
    serviceResult.summary.canWriteDbNow === false &&
    serviceResult.writes.dbWriteExecuted === false &&
    serviceResult.writes.supabaseWriteExecuted === false &&
    serviceResult.writes.rowsActuallyWritten === 0;

  const noSql = serviceResult.writes.sqlExecuted === false;

  const noActivityEventCreation =
    serviceResult.summary.activityEventCreationAllowed === false &&
    serviceResult.writes.activityEventCreated === false &&
    serviceResult.writes.activityEventInserted === false;

  const noValueObjectCreation =
    serviceResult.summary.valueObjectCreationAllowed === false &&
    serviceResult.writes.valueObjectCreated === false &&
    serviceResult.writes.activityValueObjectLinkCreated === false;

  const noStateWrite =
    serviceResult.summary.stateWriteAllowed === false &&
    serviceResult.writes.stateFactCreated === false &&
    serviceResult.writes.stateDeltaCreated === false &&
    serviceResult.writes.stateSnapshotCreated === false;

  const errors = [
    serviceResult.ok ? null : "service result is not ok",
    directTransactionRecord.ok === true ? null : "direct transaction is not ok",
    serviceResult.summary.transactionContractOk
      ? null
      : "service transaction contract is not ok",
    serviceResult.summary.activityEventReferenceAccepted
      ? null
      : "activityEventId reference was not accepted",
    transactionStepCountMatches ? null : "transaction step count mismatch",
    memberTransactionStepCountMatches
      ? null
      : "member transaction step count mismatch",
    blockedAuditTransactionStepCountMatches
      ? null
      : "blocked audit transaction step count mismatch",
    noDbRead ? null : "DB read flag mismatch",
    noDbWrite ? null : "DB write flag mismatch",
    noSql ? null : "SQL execution flag mismatch",
    noActivityEventCreation ? null : "Activity Event creation flag mismatch",
    noValueObjectCreation ? null : "Value Object creation flag mismatch",
    noStateWrite ? null : "State write flag mismatch",
  ].filter((item): item is string => typeof item === "string");

  return {
    caseKey: testCase.caseKey,
    title: testCase.title,
    passed: errors.length === 0,
    serviceOk: serviceResult.ok,
    transactionOk: directTransactionRecord.ok === true,
    serviceTransactionContractOk: serviceResult.summary.transactionContractOk,
    activityEventReferenceAccepted:
      serviceResult.summary.activityEventReferenceAccepted,
    transactionStepCountMatches,
    memberTransactionStepCountMatches,
    blockedAuditTransactionStepCountMatches,
    expectedTransactionStepCount: testCase.expectedTransactionStepCount,
    actualServiceTransactionStepCount,
    actualDirectTransactionStepCount,
    expectedMemberTransactionStepCount:
      testCase.expectedMemberTransactionStepCount,
    actualServiceMemberTransactionStepCount,
    actualDirectMemberTransactionStepCount,
    expectedBlockedAuditTransactionStepCount:
      testCase.expectedBlockedAuditTransactionStepCount,
    actualServiceBlockedAuditTransactionStepCount,
    actualDirectBlockedAuditTransactionStepCount,
    noDbRead,
    noDbWrite,
    noSql,
    noActivityEventCreation,
    noValueObjectCreation,
    noStateWrite,
    errors,
  };
}

export function buildStableSemanticBundlePersistenceServiceDryRunParityV0(): StableSemanticBundlePersistenceServiceDryRunParityResultV0 {
  const testCases: StableSemanticBundlePersistenceServiceDryRunParityCaseV0[] = [
    {
      caseKey: "known_math_child_detached_preview",
      title: "Known local controlled categories, detached preview context",
      rawText: "studied math with child for 30 minutes",
      inputLanguage: "en",
      activityEventId: null,
      expectedTransactionStepCount: 8,
      expectedMemberTransactionStepCount: 5,
      expectedBlockedAuditTransactionStepCount: 0,
    },
    {
      caseKey: "unknown_quantum_beekeeping_existing_activity_event_ref",
      title:
        "Unknown/external blocker sample with existing Activity Event reference",
      rawText: "studied quantum beekeeping with child for 30 minutes",
      inputLanguage: "en",
      activityEventId: "11111111-1111-4111-8111-111111111111",
      expectedTransactionStepCount: 11,
      expectedMemberTransactionStepCount: 4,
      expectedBlockedAuditTransactionStepCount: 4,
    },
  ];

  const cases = testCases.map(evaluateCase);
  const passedCount = cases.filter((item) => item.passed).length;
  const failedCount = cases.length - passedCount;
  const parityPassed = failedCount === 0;

  return {
    ok: parityPassed,
    policy: STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_DRY_RUN_PARITY_POLICY_V0,
    mode: STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_DRY_RUN_PARITY_MODE_V0,
    caseCount: cases.length,
    passedCount,
    failedCount,
    cases,
    summary: {
      parityPassed,
      dbReadExecuted: false,
      dbWriteExecuted: false,
      sqlExecuted: false,
      productionWriteGateOpened: false,
      sandboxWriteGateOpened: false,
      activityEventCreated: false,
      valueObjectCreated: false,
      activityValueObjectLinkCreated: false,
      stateFactCreated: false,
      stateDeltaCreated: false,
      stateSnapshotCreated: false,
      productRouteCreated: false,
    },
    safetyNotes: [
      "C33-M.2 compares service wrapper dry-run output against transaction contract output.",
      "No SQL text is executed.",
      "No DB read or write is executed.",
      "No production route is created.",
      "No Activity Event is created.",
      "No Value Object or activity-value-object link is created.",
      "No State Fact, State Delta or State Snapshot is created.",
    ],
    writes: buildStableSemanticBundlePersistenceServiceWritesV0(),
  };
}

export function buildStableSemanticBundlePersistenceServiceDryRunParityReadinessV0() {
  return {
    ok: true,
    policy: STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_DRY_RUN_PARITY_POLICY_V0,
    mode: "route_contract_readiness_service_wrapper_dry_run_parity",
    routeMode: STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_DRY_RUN_PARITY_MODE_V0,
    createdFiles: [
      "lib/activity/categoryDerivation/stableSemanticBundlePersistenceServiceDryRunParityV0.ts",
      "src/app/api/activity/debug/stable-semantic-bundle-persistence-service-dry-run-parity/route.ts",
    ],
    rules: [
      "C33-M.2 compares service wrapper dry-run output with transaction contract output.",
      "C33-M.2 performs no SQL execution.",
      "C33-M.2 performs no DB read.",
      "C33-M.2 performs no DB write.",
      "C33-M.2 creates no production route.",
      "C33-M.2 does not create Activity Events.",
      "C33-M.2 does not create Value Objects.",
      "C33-M.2 does not create State Facts, Deltas or Snapshots.",
    ],
    writes: buildStableSemanticBundlePersistenceServiceWritesV0(),
  };
}
