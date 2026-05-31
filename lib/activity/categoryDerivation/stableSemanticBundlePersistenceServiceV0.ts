import { buildStableSemanticBundleTransactionContractV0 } from "./stableSemanticBundleTransactionContractV0";

export const STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_POLICY_V0 =
  "stable_semantic_bundle_persistence_service_v0" as const;

export const STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_MODE_V0 =
  "pure_server_side_wrapper_skeleton_no_db_read_no_db_write_v0" as const;

export type StableSemanticBundlePersistenceServiceModeV0 =
  | "dry_run"
  | "sandbox_write_disabled_in_m1"
  | "production_disabled";

export type StableSemanticBundlePersistenceServiceInputSourceV0 =
  | "manual"
  | "chat_ai"
  | "calendar"
  | "booking"
  | "rule"
  | "import"
  | "system";

export type StableSemanticBundlePersistenceServiceInputV0 = {
  mode?: StableSemanticBundlePersistenceServiceModeV0;
  activityEventId?: string | null;
  rawText?: string;
  durationMinutes?: number;
  inputLanguage?: string;
  source?: StableSemanticBundlePersistenceServiceInputSourceV0;
  sandboxRunKey?: string | null;
  authenticatedUserId?: string | null;
};

export type StableSemanticBundlePersistenceServiceCheckV0 = {
  checkKey:
    | "service_wrapper_created"
    | "debug_route_only"
    | "db_access_disabled"
    | "production_write_disabled"
    | "sandbox_write_disabled_in_m1"
    | "activity_event_creation_forbidden"
    | "activity_event_reference_optional"
    | "value_object_writes_forbidden"
    | "state_writes_forbidden"
    | "transaction_contract_available";
  title: string;
  passed: boolean;
  blocksServiceUse: boolean;
  notes: string[];
};

export type StableSemanticBundlePersistenceServiceWritesV0 = {
  sqlExecuted: false;
  dbReadExecuted: false;
  dbWriteExecuted: false;
  supabaseReadExecuted: false;
  supabaseWriteExecuted: false;
  transactionExecuted: false;
  transactionCommitted: false;
  transactionRolledBack: false;
  writeGateOpened: false;
  productionWriteGateOpened: false;
  sandboxWriteGateOpened: false;
  rowsActuallyWritten: 0;
  activityEventCreated: false;
  activityEventInserted: false;
  stableBundleCreated: false;
  stableBundlePersisted: false;
  stableBundleMemberInserted: false;
  stableBundleBlockedAuditInserted: false;
  stableBundleSourceSnapshotInserted: false;
  stableBundleResolverSnapshotInserted: false;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  stateFactCreated: false;
  stateDeltaCreated: false;
  stateSnapshotCreated: false;
};

export type StableSemanticBundlePersistenceServiceResultV0 = {
  ok: boolean;
  policy: typeof STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_POLICY_V0;
  mode: StableSemanticBundlePersistenceServiceModeV0;
  serviceMode: typeof STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_MODE_V0;
  input: {
    rawText: string;
    durationMinutes: number;
    inputLanguage: string;
    source: StableSemanticBundlePersistenceServiceInputSourceV0;
    activityEventId: string | null;
    sandboxRunKey: string | null;
    authenticatedUserId: string | null;
  };
  transactionContractPreview: unknown;
  checks: StableSemanticBundlePersistenceServiceCheckV0[];
  summary: {
    serviceWrapperCreated: true;
    serverSideOnlyIntended: true;
    debugProofRouteCreated: boolean;
    productRouteCreated: false;
    dbAccessDisabled: true;
    canReadDbNow: false;
    canWriteDbNow: false;
    canExecuteSandboxWriteNow: false;
    canExecuteProductionWriteNow: false;
    productionWriteDisabled: true;
    sandboxWriteDisabledInM1: true;
    activityEventReferenceAccepted: boolean;
    activityEventCreationAllowed: false;
    valueObjectCreationAllowed: false;
    stateWriteAllowed: false;
    transactionContractOk: boolean;
    transactionStepCount: number;
    memberTransactionStepCount: number;
    blockedAuditTransactionStepCount: number;
    rowsActuallyWritten: 0;
    idempotentDuplicateDetected: false;
  };
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: StableSemanticBundlePersistenceServiceWritesV0;
};

export function buildStableSemanticBundlePersistenceServiceWritesV0(): StableSemanticBundlePersistenceServiceWritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    supabaseReadExecuted: false,
    supabaseWriteExecuted: false,
    transactionExecuted: false,
    transactionCommitted: false,
    transactionRolledBack: false,
    writeGateOpened: false,
    productionWriteGateOpened: false,
    sandboxWriteGateOpened: false,
    rowsActuallyWritten: 0,
    activityEventCreated: false,
    activityEventInserted: false,
    stableBundleCreated: false,
    stableBundlePersisted: false,
    stableBundleMemberInserted: false,
    stableBundleBlockedAuditInserted: false,
    stableBundleSourceSnapshotInserted: false,
    stableBundleResolverSnapshotInserted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    stateFactCreated: false,
    stateDeltaCreated: false,
    stateSnapshotCreated: false,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeSource(
  value: unknown
): StableSemanticBundlePersistenceServiceInputSourceV0 {
  const allowed: StableSemanticBundlePersistenceServiceInputSourceV0[] = [
    "manual",
    "chat_ai",
    "calendar",
    "booking",
    "rule",
    "import",
    "system",
  ];

  return typeof value === "string" &&
    allowed.includes(value as StableSemanticBundlePersistenceServiceInputSourceV0)
    ? (value as StableSemanticBundlePersistenceServiceInputSourceV0)
    : "manual";
}

function normalizeMode(value: unknown): StableSemanticBundlePersistenceServiceModeV0 {
  if (
    value === "sandbox_write_disabled_in_m1" ||
    value === "production_disabled"
  ) {
    return value;
  }

  return "dry_run";
}

function isValidUuidOrNull(value: string | null): boolean {
  if (value === null) {
    return true;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function makeCheck(params: {
  checkKey: StableSemanticBundlePersistenceServiceCheckV0["checkKey"];
  title: string;
  passed: boolean;
  blocksServiceUse: boolean;
  notes: string[];
}): StableSemanticBundlePersistenceServiceCheckV0 {
  return {
    checkKey: params.checkKey,
    title: params.title,
    passed: params.passed,
    blocksServiceUse: params.blocksServiceUse,
    notes: params.notes,
  };
}

export function runStableSemanticBundlePersistenceServiceV0(
  input: StableSemanticBundlePersistenceServiceInputV0
): StableSemanticBundlePersistenceServiceResultV0 {
  const mode = normalizeMode(input.mode);
  const rawText = asString(input.rawText, "studied math with child for 30 minutes");
  const durationMinutes = asNumber(input.durationMinutes, 30);
  const inputLanguage = asString(input.inputLanguage, "en");
  const source = normalizeSource(input.source);
  const activityEventId =
    typeof input.activityEventId === "string" && input.activityEventId.trim() !== ""
      ? input.activityEventId.trim()
      : null;
  const sandboxRunKey =
    typeof input.sandboxRunKey === "string" && input.sandboxRunKey.trim() !== ""
      ? input.sandboxRunKey.trim()
      : null;
  const authenticatedUserId =
    typeof input.authenticatedUserId === "string" &&
    input.authenticatedUserId.trim() !== ""
      ? input.authenticatedUserId.trim()
      : null;

  const transactionContractPreview =
    buildStableSemanticBundleTransactionContractV0({
      rawText,
      inputLanguage,
    });

  const transactionRecord = asRecord(transactionContractPreview);
  const transactionSummary = asRecord(transactionRecord.summary);
  const transactionContractOk = transactionRecord.ok === true;
  const transactionStepCount = asNumber(
    transactionSummary.transactionStepCount,
    0
  );
  const memberTransactionStepCount = asNumber(
    transactionSummary.memberTransactionStepCount,
    0
  );
  const blockedAuditTransactionStepCount = asNumber(
    transactionSummary.blockedAuditTransactionStepCount,
    0
  );

  const activityEventReferenceAccepted = isValidUuidOrNull(activityEventId);
  const modeAllowsServiceUse = mode === "dry_run";

  const checks = [
    makeCheck({
      checkKey: "service_wrapper_created",
      title: "Internal service wrapper skeleton is created",
      passed: true,
      blocksServiceUse: false,
      notes: [
        "C33-M.1 creates the pure wrapper skeleton without DB access.",
      ],
    }),
    makeCheck({
      checkKey: "debug_route_only",
      title: "Only debug proof route is created",
      passed: true,
      blocksServiceUse: false,
      notes: [
        "No product route is introduced in C33-M.1.",
      ],
    }),
    makeCheck({
      checkKey: "db_access_disabled",
      title: "DB access is disabled in service skeleton",
      passed: true,
      blocksServiceUse: false,
      notes: [
        "The wrapper imports no Supabase client and performs no SELECT/INSERT/UPDATE/DELETE.",
      ],
    }),
    makeCheck({
      checkKey: "production_write_disabled",
      title: "Production write is disabled",
      passed: mode !== "production_disabled",
      blocksServiceUse: mode === "production_disabled",
      notes: [
        "C33-M.1 cannot execute production writes.",
      ],
    }),
    makeCheck({
      checkKey: "sandbox_write_disabled_in_m1",
      title: "Sandbox write remains disabled in C33-M.1",
      passed: mode !== "sandbox_write_disabled_in_m1",
      blocksServiceUse: mode === "sandbox_write_disabled_in_m1",
      notes: [
        "C33-M.1 is dry-run-only. Sandbox-write adapter belongs to a later step.",
      ],
    }),
    makeCheck({
      checkKey: "activity_event_creation_forbidden",
      title: "Activity Event creation is forbidden",
      passed: true,
      blocksServiceUse: false,
      notes: [
        "The wrapper may accept an existing activityEventId but cannot create Activity Event.",
      ],
    }),
    makeCheck({
      checkKey: "activity_event_reference_optional",
      title: "Activity Event reference is optional and validated",
      passed: activityEventReferenceAccepted,
      blocksServiceUse: !activityEventReferenceAccepted,
      notes: [
        "NULL means detached preview/sandbox context. UUID means reference to an existing Activity Event.",
      ],
    }),
    makeCheck({
      checkKey: "value_object_writes_forbidden",
      title: "Value Object writes are forbidden",
      passed: true,
      blocksServiceUse: false,
      notes: [
        "Value Object creation remains a separate user-confirmed service.",
      ],
    }),
    makeCheck({
      checkKey: "state_writes_forbidden",
      title: "State writes are forbidden",
      passed: true,
      blocksServiceUse: false,
      notes: [
        "Stable semantic bundle service cannot create state facts, deltas or snapshots.",
      ],
    }),
    makeCheck({
      checkKey: "transaction_contract_available",
      title: "Transaction contract preview is available",
      passed: transactionContractOk && transactionStepCount > 0,
      blocksServiceUse: !(transactionContractOk && transactionStepCount > 0),
      notes: [
        "The wrapper delegates semantic write-shape preview to the existing transaction contract.",
      ],
    }),
  ];

  const failedChecks = checks.filter((item) => !item.passed);
  const blockingChecks = checks.filter(
    (item) => item.blocksServiceUse && !item.passed
  );

  const errors = blockingChecks.map((item) => item.title);

  return {
    ok: modeAllowsServiceUse && blockingChecks.length === 0,
    policy: STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_POLICY_V0,
    mode,
    serviceMode: STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_MODE_V0,
    input: {
      rawText,
      durationMinutes,
      inputLanguage,
      source,
      activityEventId,
      sandboxRunKey,
      authenticatedUserId,
    },
    transactionContractPreview,
    checks,
    summary: {
      serviceWrapperCreated: true,
      serverSideOnlyIntended: true,
      debugProofRouteCreated: true,
      productRouteCreated: false,
      dbAccessDisabled: true,
      canReadDbNow: false,
      canWriteDbNow: false,
      canExecuteSandboxWriteNow: false,
      canExecuteProductionWriteNow: false,
      productionWriteDisabled: true,
      sandboxWriteDisabledInM1: true,
      activityEventReferenceAccepted,
      activityEventCreationAllowed: false,
      valueObjectCreationAllowed: false,
      stateWriteAllowed: false,
      transactionContractOk,
      transactionStepCount,
      memberTransactionStepCount,
      blockedAuditTransactionStepCount,
      rowsActuallyWritten: 0,
      idempotentDuplicateDetected: false,
    },
    errors,
    warnings: [
      "C33-M.1 is a dry-run-only service skeleton.",
      "Sandbox-write adapter is intentionally not implemented in C33-M.1.",
      "Production write remains disabled.",
      failedChecks.length > 0
        ? `${failedChecks.length} service wrapper check(s) failed.`
        : "All service wrapper checks passed.",
    ],
    safetyNotes: [
      "No SQL text is executed.",
      "No Supabase client is imported or created.",
      "No DB read or write is executed.",
      "No Activity Event is created.",
      "No Value Object or activity-value-object link is created.",
      "No State Fact, State Delta or State Snapshot is created.",
    ],
    writes: buildStableSemanticBundlePersistenceServiceWritesV0(),
  };
}

export function buildStableSemanticBundlePersistenceServiceReadinessV0() {
  return {
    ok: true,
    policy: STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_POLICY_V0,
    mode: "route_contract_readiness_service_wrapper_skeleton",
    serviceMode: STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_MODE_V0,
    createdFiles: [
      "lib/activity/categoryDerivation/stableSemanticBundlePersistenceServiceV0.ts",
      "src/app/api/activity/debug/stable-semantic-bundle-persistence-service-skeleton/route.ts",
    ],
    rules: [
      "C33-M.1 creates an internal service wrapper skeleton.",
      "C33-M.1 is dry-run-only.",
      "C33-M.1 creates no product route.",
      "C33-M.1 performs no SQL execution.",
      "C33-M.1 performs no DB read.",
      "C33-M.1 performs no DB write.",
      "C33-M.1 does not create Activity Events.",
      "C33-M.1 does not create Value Objects.",
      "C33-M.1 does not create State Facts, Deltas or Snapshots.",
      "Production writes remain closed.",
    ],
    writes: buildStableSemanticBundlePersistenceServiceWritesV0(),
  };
}


