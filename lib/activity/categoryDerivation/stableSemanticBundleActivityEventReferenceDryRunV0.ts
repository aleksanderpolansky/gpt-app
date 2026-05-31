import {
  buildStableSemanticBundlePersistenceServiceWritesV0,
  runStableSemanticBundlePersistenceServiceV0,
} from "./stableSemanticBundlePersistenceServiceV0";

export const STABLE_SEMANTIC_BUNDLE_ACTIVITY_EVENT_REFERENCE_DRY_RUN_POLICY_V0 =
  "stable_semantic_bundle_activity_event_reference_dry_run_v0" as const;

export const STABLE_SEMANTIC_BUNDLE_ACTIVITY_EVENT_REFERENCE_DRY_RUN_MODE_V0 =
  "activity_event_reference_only_no_activity_event_creation_v0" as const;

export type StableSemanticBundleActivityEventReferenceCaseKeyV0 =
  | "detached_preview_null_activity_event_id"
  | "valid_uuid_reference_only"
  | "invalid_activity_event_id_blocked";

export type StableSemanticBundleActivityEventReferenceCaseV0 = {
  caseKey: StableSemanticBundleActivityEventReferenceCaseKeyV0;
  title: string;
  rawText: string;
  inputLanguage: string;
  activityEventId: string | null;
  expectedServiceOk: boolean;
  expectedActivityEventReferenceAccepted: boolean;
  expectedTransactionStepCount: number;
  expectedMemberTransactionStepCount: number;
  expectedBlockedAuditTransactionStepCount: number;
};

export type StableSemanticBundleActivityEventReferenceCaseResultV0 = {
  caseKey: StableSemanticBundleActivityEventReferenceCaseKeyV0;
  title: string;
  passed: boolean;
  serviceOk: boolean;
  expectedServiceOk: boolean;
  activityEventId: string | null;
  activityEventReferenceAccepted: boolean;
  expectedActivityEventReferenceAccepted: boolean;
  activityEventReferenceOnly: boolean;
  transactionStepCount: number;
  expectedTransactionStepCount: number;
  memberTransactionStepCount: number;
  expectedMemberTransactionStepCount: number;
  blockedAuditTransactionStepCount: number;
  expectedBlockedAuditTransactionStepCount: number;
  noSql: boolean;
  noDbRead: boolean;
  noDbWrite: boolean;
  noActivityEventCreation: boolean;
  noValueObjectCreation: boolean;
  noStateWrite: boolean;
  errors: string[];
};

export type StableSemanticBundleActivityEventReferenceDryRunResultV0 = {
  ok: boolean;
  policy: typeof STABLE_SEMANTIC_BUNDLE_ACTIVITY_EVENT_REFERENCE_DRY_RUN_POLICY_V0;
  mode: typeof STABLE_SEMANTIC_BUNDLE_ACTIVITY_EVENT_REFERENCE_DRY_RUN_MODE_V0;
  caseCount: number;
  passedCount: number;
  failedCount: number;
  cases: StableSemanticBundleActivityEventReferenceCaseResultV0[];
  summary: {
    activityEventReferenceDryRunPassed: boolean;
    detachedPreviewAllowed: boolean;
    validReferenceAccepted: boolean;
    invalidReferenceBlocked: boolean;
    activityEventCreationAllowed: false;
    activityEventCreated: false;
    dbReadExecuted: false;
    dbWriteExecuted: false;
    sqlExecuted: false;
    productionWriteGateOpened: false;
    sandboxWriteGateOpened: false;
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

function evaluateCase(
  testCase: StableSemanticBundleActivityEventReferenceCaseV0
): StableSemanticBundleActivityEventReferenceCaseResultV0 {
  const serviceResult = runStableSemanticBundlePersistenceServiceV0({
    mode: "dry_run",
    rawText: testCase.rawText,
    inputLanguage: testCase.inputLanguage,
    source: "manual",
    activityEventId: testCase.activityEventId,
  });

  const transactionStepCount = serviceResult.summary.transactionStepCount;
  const memberTransactionStepCount =
    serviceResult.summary.memberTransactionStepCount;
  const blockedAuditTransactionStepCount =
    serviceResult.summary.blockedAuditTransactionStepCount;

  const noSql = serviceResult.writes.sqlExecuted === false;

  const noDbRead =
    serviceResult.summary.canReadDbNow === false &&
    serviceResult.writes.dbReadExecuted === false &&
    serviceResult.writes.supabaseReadExecuted === false;

  const noDbWrite =
    serviceResult.summary.canWriteDbNow === false &&
    serviceResult.writes.dbWriteExecuted === false &&
    serviceResult.writes.supabaseWriteExecuted === false &&
    serviceResult.writes.rowsActuallyWritten === 0;

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

  const activityEventReferenceOnly =
    testCase.activityEventId === null
      ? serviceResult.input.activityEventId === null
      : serviceResult.input.activityEventId === testCase.activityEventId &&
        noActivityEventCreation;

  const expectedStepCountsApply = testCase.expectedActivityEventReferenceAccepted;

  const errors = [
    serviceResult.ok === testCase.expectedServiceOk
      ? null
      : "service ok did not match expectation",
    serviceResult.summary.activityEventReferenceAccepted ===
    testCase.expectedActivityEventReferenceAccepted
      ? null
      : "activity event reference acceptance did not match expectation",
    activityEventReferenceOnly ? null : "activity event was not reference-only",
    expectedStepCountsApply &&
    transactionStepCount !== testCase.expectedTransactionStepCount
      ? "transaction step count mismatch"
      : null,
    expectedStepCountsApply &&
    memberTransactionStepCount !== testCase.expectedMemberTransactionStepCount
      ? "member transaction step count mismatch"
      : null,
    expectedStepCountsApply &&
    blockedAuditTransactionStepCount !==
      testCase.expectedBlockedAuditTransactionStepCount
      ? "blocked audit transaction step count mismatch"
      : null,
    noSql ? null : "SQL execution flag mismatch",
    noDbRead ? null : "DB read flag mismatch",
    noDbWrite ? null : "DB write flag mismatch",
    noActivityEventCreation ? null : "Activity Event creation flag mismatch",
    noValueObjectCreation ? null : "Value Object creation flag mismatch",
    noStateWrite ? null : "State write flag mismatch",
  ].filter((item): item is string => typeof item === "string");

  return {
    caseKey: testCase.caseKey,
    title: testCase.title,
    passed: errors.length === 0,
    serviceOk: serviceResult.ok,
    expectedServiceOk: testCase.expectedServiceOk,
    activityEventId: serviceResult.input.activityEventId,
    activityEventReferenceAccepted:
      serviceResult.summary.activityEventReferenceAccepted,
    expectedActivityEventReferenceAccepted:
      testCase.expectedActivityEventReferenceAccepted,
    activityEventReferenceOnly,
    transactionStepCount,
    expectedTransactionStepCount: testCase.expectedTransactionStepCount,
    memberTransactionStepCount,
    expectedMemberTransactionStepCount:
      testCase.expectedMemberTransactionStepCount,
    blockedAuditTransactionStepCount,
    expectedBlockedAuditTransactionStepCount:
      testCase.expectedBlockedAuditTransactionStepCount,
    noSql,
    noDbRead,
    noDbWrite,
    noActivityEventCreation,
    noValueObjectCreation,
    noStateWrite,
    errors,
  };
}

export function buildStableSemanticBundleActivityEventReferenceDryRunV0(): StableSemanticBundleActivityEventReferenceDryRunResultV0 {
  const testCases: StableSemanticBundleActivityEventReferenceCaseV0[] = [
    {
      caseKey: "detached_preview_null_activity_event_id",
      title: "Detached preview path with activityEventId = null",
      rawText: "studied math with child for 30 minutes",
      inputLanguage: "en",
      activityEventId: null,
      expectedServiceOk: true,
      expectedActivityEventReferenceAccepted: true,
      expectedTransactionStepCount: 8,
      expectedMemberTransactionStepCount: 5,
      expectedBlockedAuditTransactionStepCount: 0,
    },
    {
      caseKey: "valid_uuid_reference_only",
      title: "Valid UUID Activity Event reference accepted as reference-only",
      rawText: "studied quantum beekeeping with child for 30 minutes",
      inputLanguage: "en",
      activityEventId: "11111111-1111-4111-8111-111111111111",
      expectedServiceOk: true,
      expectedActivityEventReferenceAccepted: true,
      expectedTransactionStepCount: 11,
      expectedMemberTransactionStepCount: 4,
      expectedBlockedAuditTransactionStepCount: 4,
    },
    {
      caseKey: "invalid_activity_event_id_blocked",
      title: "Invalid Activity Event id is blocked without writes",
      rawText: "studied math with child for 30 minutes",
      inputLanguage: "en",
      activityEventId: "not-a-valid-uuid",
      expectedServiceOk: false,
      expectedActivityEventReferenceAccepted: false,
      expectedTransactionStepCount: 8,
      expectedMemberTransactionStepCount: 5,
      expectedBlockedAuditTransactionStepCount: 0,
    },
  ];

  const cases = testCases.map(evaluateCase);
  const passedCount = cases.filter((item) => item.passed).length;
  const failedCount = cases.length - passedCount;
  const activityEventReferenceDryRunPassed = failedCount === 0;

  return {
    ok: activityEventReferenceDryRunPassed,
    policy: STABLE_SEMANTIC_BUNDLE_ACTIVITY_EVENT_REFERENCE_DRY_RUN_POLICY_V0,
    mode: STABLE_SEMANTIC_BUNDLE_ACTIVITY_EVENT_REFERENCE_DRY_RUN_MODE_V0,
    caseCount: cases.length,
    passedCount,
    failedCount,
    cases,
    summary: {
      activityEventReferenceDryRunPassed,
      detachedPreviewAllowed: cases.some(
        (item) =>
          item.caseKey === "detached_preview_null_activity_event_id" &&
          item.passed
      ),
      validReferenceAccepted: cases.some(
        (item) => item.caseKey === "valid_uuid_reference_only" && item.passed
      ),
      invalidReferenceBlocked: cases.some(
        (item) => item.caseKey === "invalid_activity_event_id_blocked" && item.passed
      ),
      activityEventCreationAllowed: false,
      activityEventCreated: false,
      dbReadExecuted: false,
      dbWriteExecuted: false,
      sqlExecuted: false,
      productionWriteGateOpened: false,
      sandboxWriteGateOpened: false,
      valueObjectCreated: false,
      activityValueObjectLinkCreated: false,
      stateFactCreated: false,
      stateDeltaCreated: false,
      stateSnapshotCreated: false,
      productRouteCreated: false,
    },
    safetyNotes: [
      "C33-M.4 proves Activity Event reference behavior in dry-run only.",
      "activityEventId = null remains valid for detached preview.",
      "valid UUID is accepted as reference-only and does not create an Activity Event.",
      "invalid Activity Event id is blocked without writes.",
      "No SQL text is executed.",
      "No DB read or write is executed.",
      "No production route is created.",
      "No Value Object or activity-value-object link is created.",
      "No State Fact, State Delta or State Snapshot is created.",
    ],
    writes: buildStableSemanticBundlePersistenceServiceWritesV0(),
  };
}

export function buildStableSemanticBundleActivityEventReferenceDryRunReadinessV0() {
  return {
    ok: true,
    policy: STABLE_SEMANTIC_BUNDLE_ACTIVITY_EVENT_REFERENCE_DRY_RUN_POLICY_V0,
    mode: "route_contract_readiness_activity_event_reference_dry_run",
    routeMode: STABLE_SEMANTIC_BUNDLE_ACTIVITY_EVENT_REFERENCE_DRY_RUN_MODE_V0,
    createdFiles: [
      "lib/activity/categoryDerivation/stableSemanticBundleActivityEventReferenceDryRunV0.ts",
      "src/app/api/activity/debug/stable-semantic-bundle-activity-event-reference-dry-run/route.ts",
    ],
    rules: [
      "C33-M.4 is dry-run-only.",
      "C33-M.4 accepts activityEventId = null for detached preview.",
      "C33-M.4 accepts valid UUID activityEventId as reference-only.",
      "C33-M.4 blocks invalid Activity Event ids.",
      "C33-M.4 performs no SQL execution.",
      "C33-M.4 performs no DB read.",
      "C33-M.4 performs no DB write.",
      "C33-M.4 creates no production route.",
      "C33-M.4 does not create Activity Events.",
      "C33-M.4 does not create Value Objects.",
      "C33-M.4 does not create State Facts, Deltas or Snapshots.",
    ],
    writes: buildStableSemanticBundlePersistenceServiceWritesV0(),
  };
}
