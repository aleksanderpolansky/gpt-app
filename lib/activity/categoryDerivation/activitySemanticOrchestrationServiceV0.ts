import {
  buildStableSemanticBundlePersistenceServiceWritesV0,
  runStableSemanticBundlePersistenceServiceV0,
  type StableSemanticBundlePersistenceServiceInputSourceV0,
} from "./stableSemanticBundlePersistenceServiceV0";

export const ACTIVITY_SEMANTIC_ORCHESTRATION_SERVICE_POLICY_V0 =
  "activity_semantic_orchestration_service_v0" as const;

export const ACTIVITY_SEMANTIC_ORCHESTRATION_SERVICE_MODE_V0 =
  "orchestration_skeleton_no_db_read_no_db_write_v0" as const;

export type ActivitySemanticOrchestrationModeV0 =
  | "preview_only"
  | "dry_run_existing_event";

export type ActivitySemanticOrchestrationInputV0 = {
  mode?: ActivitySemanticOrchestrationModeV0;
  rawText?: string;
  inputLanguage?: string;
  source?: StableSemanticBundlePersistenceServiceInputSourceV0;
  activityEventId?: string | null;
  authenticatedUserId?: string | null;
  allowActivityEventCreation?: boolean;
  allowValueObjectCreation?: boolean;
  allowStateWrites?: boolean;
};

export type ActivitySemanticOrchestrationResultV0 = {
  ok: boolean;
  policy: typeof ACTIVITY_SEMANTIC_ORCHESTRATION_SERVICE_POLICY_V0;
  mode: ActivitySemanticOrchestrationModeV0;
  serviceMode: typeof ACTIVITY_SEMANTIC_ORCHESTRATION_SERVICE_MODE_V0;
  input: {
    rawText: string;
    inputLanguage: string;
    source: StableSemanticBundlePersistenceServiceInputSourceV0;
    activityEventId: string | null;
    authenticatedUserId: string | null;
    allowActivityEventCreation: boolean;
    allowValueObjectCreation: boolean;
    allowStateWrites: boolean;
  };
  orchestration: {
    previewOnly: boolean;
    existingActivityEventReference: boolean;
    activityEventCreationRequested: boolean;
    valueObjectCreationRequested: boolean;
    stateWritesRequested: boolean;
    stableBundleServiceCalled: boolean;
    stableBundleServiceMode: "dry_run";
    stableBundleServiceOk: boolean;
    activityEventReferenceAccepted: boolean;
    transactionStepCount: number;
    memberTransactionStepCount: number;
    blockedAuditTransactionStepCount: number;
  };
  summary: {
    orchestrationSkeletonCreated: true;
    productRouteCreated: false;
    productionWriteGateOpened: false;
    sandboxWriteGateOpened: false;
    dbReadExecuted: false;
    dbWriteExecuted: false;
    sqlExecuted: false;
    activityEventCreated: false;
    stableBundlePersisted: false;
    valueObjectCreated: false;
    activityValueObjectLinkCreated: false;
    stateFactCreated: false;
    stateDeltaCreated: false;
    stateSnapshotCreated: false;
    rowsActuallyWritten: 0;
  };
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: ReturnType<typeof buildStableSemanticBundlePersistenceServiceWritesV0>;
};

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : fallback;
}

function normalizeMode(value: unknown): ActivitySemanticOrchestrationModeV0 {
  return value === "dry_run_existing_event" ? value : "preview_only";
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

function normalizeNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : null;
}

export function runActivitySemanticOrchestrationServiceV0(
  input: ActivitySemanticOrchestrationInputV0
): ActivitySemanticOrchestrationResultV0 {
  const mode = normalizeMode(input.mode);
  const rawText = asString(input.rawText, "studied math with child for 30 minutes");
  const inputLanguage = asString(input.inputLanguage, "en");
  const source = normalizeSource(input.source);
  const authenticatedUserId = normalizeNullableString(input.authenticatedUserId);

  const allowActivityEventCreation = input.allowActivityEventCreation === true;
  const allowValueObjectCreation = input.allowValueObjectCreation === true;
  const allowStateWrites = input.allowStateWrites === true;

  const activityEventId =
    mode === "preview_only" ? null : normalizeNullableString(input.activityEventId);

  const activityEventCreationRequested = allowActivityEventCreation;
  const valueObjectCreationRequested = allowValueObjectCreation;
  const stateWritesRequested = allowStateWrites;

  const preflightErrors = [
    activityEventCreationRequested
      ? "Activity Event creation is not allowed in C33-N.2 orchestration skeleton"
      : null,
    valueObjectCreationRequested
      ? "Value Object creation is not allowed in C33-N.2 orchestration skeleton"
      : null,
    stateWritesRequested
      ? "State writes are not allowed in C33-N.2 orchestration skeleton"
      : null,
    mode === "dry_run_existing_event" && activityEventId === null
      ? "dry_run_existing_event requires a non-empty activityEventId"
      : null,
  ].filter((item): item is string => typeof item === "string");

  const shouldCallStableBundleService = preflightErrors.length === 0;

  const stableBundleResult = shouldCallStableBundleService
    ? runStableSemanticBundlePersistenceServiceV0({
        mode: "dry_run",
        rawText,
        inputLanguage,
        source,
        activityEventId,
        authenticatedUserId,
      })
    : null;

  const stableBundleServiceOk = stableBundleResult?.ok === true;
  const activityEventReferenceAccepted =
    stableBundleResult?.summary.activityEventReferenceAccepted === true;

  const stableBundleErrors = shouldCallStableBundleService
    ? [
        stableBundleServiceOk ? null : "Stable bundle service dry-run was not ok",
        activityEventReferenceAccepted
          ? null
          : "Activity Event reference was not accepted by stable bundle service",
      ].filter((item): item is string => typeof item === "string")
    : [];

  const errors = [...preflightErrors, ...stableBundleErrors];

  const writes = buildStableSemanticBundlePersistenceServiceWritesV0();

  return {
    ok: errors.length === 0,
    policy: ACTIVITY_SEMANTIC_ORCHESTRATION_SERVICE_POLICY_V0,
    mode,
    serviceMode: ACTIVITY_SEMANTIC_ORCHESTRATION_SERVICE_MODE_V0,
    input: {
      rawText,
      inputLanguage,
      source,
      activityEventId,
      authenticatedUserId,
      allowActivityEventCreation,
      allowValueObjectCreation,
      allowStateWrites,
    },
    orchestration: {
      previewOnly: mode === "preview_only",
      existingActivityEventReference: mode === "dry_run_existing_event",
      activityEventCreationRequested,
      valueObjectCreationRequested,
      stateWritesRequested,
      stableBundleServiceCalled: shouldCallStableBundleService,
      stableBundleServiceMode: "dry_run",
      stableBundleServiceOk,
      activityEventReferenceAccepted,
      transactionStepCount:
        stableBundleResult?.summary.transactionStepCount ?? 0,
      memberTransactionStepCount:
        stableBundleResult?.summary.memberTransactionStepCount ?? 0,
      blockedAuditTransactionStepCount:
        stableBundleResult?.summary.blockedAuditTransactionStepCount ?? 0,
    },
    summary: {
      orchestrationSkeletonCreated: true,
      productRouteCreated: false,
      productionWriteGateOpened: false,
      sandboxWriteGateOpened: false,
      dbReadExecuted: false,
      dbWriteExecuted: false,
      sqlExecuted: false,
      activityEventCreated: false,
      stableBundlePersisted: false,
      valueObjectCreated: false,
      activityValueObjectLinkCreated: false,
      stateFactCreated: false,
      stateDeltaCreated: false,
      stateSnapshotCreated: false,
      rowsActuallyWritten: 0,
    },
    errors,
    warnings: [
      "C33-N.2 is an orchestration skeleton only.",
      "Stable bundle service is called in dry_run mode only.",
      "Activity Event creation remains separate from orchestration.",
      "Value Object and State writes remain separate future services.",
      "Production writes remain closed.",
    ],
    safetyNotes: [
      "No SQL text is executed.",
      "No Supabase client is imported or created.",
      "No DB read or write is executed.",
      "No Activity Event is created.",
      "No Stable Bundle is persisted.",
      "No Value Object or Activity Value Object link is created.",
      "No State Fact, State Delta or State Snapshot is created.",
    ],
    writes,
  };
}

export function buildActivitySemanticOrchestrationServiceReadinessV0() {
  return {
    ok: true,
    policy: ACTIVITY_SEMANTIC_ORCHESTRATION_SERVICE_POLICY_V0,
    mode: "route_contract_readiness_activity_semantic_orchestration_skeleton",
    serviceMode: ACTIVITY_SEMANTIC_ORCHESTRATION_SERVICE_MODE_V0,
    createdFiles: [
      "lib/activity/categoryDerivation/activitySemanticOrchestrationServiceV0.ts",
      "src/app/api/activity/debug/activity-semantic-orchestration-skeleton/route.ts",
    ],
    rules: [
      "C33-N.2 creates an orchestration skeleton.",
      "C33-N.2 calls stable bundle service in dry-run only.",
      "C33-N.2 supports preview_only.",
      "C33-N.2 supports dry_run_existing_event.",
      "C33-N.2 blocks Activity Event creation requests.",
      "C33-N.2 blocks Value Object creation requests.",
      "C33-N.2 blocks State write requests.",
      "C33-N.2 performs no SQL execution.",
      "C33-N.2 performs no DB read.",
      "C33-N.2 performs no DB write.",
      "C33-N.2 creates no production route.",
    ],
    writes: buildStableSemanticBundlePersistenceServiceWritesV0(),
  };
}
