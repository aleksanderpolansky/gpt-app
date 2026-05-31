import { buildStableSemanticBundlePersistenceServiceWritesV0 } from "./stableSemanticBundlePersistenceServiceV0";

export const STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_SANDBOX_WRITE_ADAPTER_POLICY_V0 =
  "stable_semantic_bundle_persistence_service_sandbox_write_adapter_v0" as const;

export const STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_SANDBOX_WRITE_ADAPTER_MODE_V0 =
  "duplicate_fixture_only_adapter_no_new_rows_v0" as const;

export const C33_K4_SANDBOX_FIXTURE_STABLE_BUNDLE_ID_V0 =
  "87067c54-f8b3-46e7-8451-69e28bc9a69b" as const;

export const C33_K4_SANDBOX_FIXTURE_RUN_KEY_V0 =
  "c33-k4-sandbox-20260531101917" as const;

export type StableSemanticBundlePersistenceServiceSandboxWriteAdapterInputV0 = {
  endpointBaseUrl?: string;
  adapterMode?: "duplicate_fixture_only";
};

export type StableSemanticBundlePersistenceServiceSandboxWriteAdapterResultV0 = {
  ok: boolean;
  policy: typeof STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_SANDBOX_WRITE_ADAPTER_POLICY_V0;
  mode: typeof STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_SANDBOX_WRITE_ADAPTER_MODE_V0;
  adapterMode: "duplicate_fixture_only";
  delegatedEndpoint: string;
  fixture: {
    stableBundleId: typeof C33_K4_SANDBOX_FIXTURE_STABLE_BUNDLE_ID_V0;
    sandboxRunKey: typeof C33_K4_SANDBOX_FIXTURE_RUN_KEY_V0;
  };
  delegated: {
    httpStatus: number;
    responseOk: boolean;
    bodyOk: boolean;
    idempotentDuplicateDetected: boolean;
    existingStableBundleId: string | null;
    rowsActuallyWritten: number;
    memberRowsInserted: number;
    blockedAuditRowsInserted: number;
    delegatedWriteGateOpened: boolean;
    delegatedDbReadExecuted: boolean;
    delegatedDbWriteExecuted: boolean;
    delegatedSupabaseWriteExecuted: boolean;
    delegatedStableBundleCreated: boolean;
    delegatedStableBundlePersisted: boolean;
    delegatedStableBundleMemberInserted: boolean;
    delegatedStateFactCreated: boolean;
    delegatedStateDeltaCreated: boolean;
    delegatedStateSnapshotCreated: boolean;
    delegatedValueObjectCreated: boolean;
    delegatedActivityValueObjectLinkCreated: boolean;
  };
  summary: {
    adapterProofPassed: boolean;
    duplicateFixtureOnly: true;
    newRowsWritten: false;
    rowsActuallyWritten: 0;
    directDbAccessUsed: false;
    directSqlExecuted: false;
    directProductionWriteGateOpened: false;
    productRouteCreated: false;
    productionWriteStillClosed: true;
    activityEventCreated: false;
    valueObjectCreated: false;
    activityValueObjectLinkCreated: false;
    stateFactCreated: false;
    stateDeltaCreated: false;
    stateSnapshotCreated: false;
  };
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: ReturnType<typeof buildStableSemanticBundlePersistenceServiceWritesV0>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : null;
}

function normalizeBaseUrl(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    return "http://localhost:3000";
  }

  return value.trim().replace(/\/+$/, "");
}

export function buildStableSemanticBundlePersistenceServiceSandboxWriteAdapterReadinessV0() {
  return {
    ok: true,
    policy: STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_SANDBOX_WRITE_ADAPTER_POLICY_V0,
    mode: "route_contract_readiness_service_wrapper_sandbox_write_adapter",
    routeMode: STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_SANDBOX_WRITE_ADAPTER_MODE_V0,
    adapterMode: "duplicate_fixture_only",
    fixture: {
      stableBundleId: C33_K4_SANDBOX_FIXTURE_STABLE_BUNDLE_ID_V0,
      sandboxRunKey: C33_K4_SANDBOX_FIXTURE_RUN_KEY_V0,
    },
    rules: [
      "C33-M.3 adapter delegates only to the existing C33-K.4 explicit sandbox write gate.",
      "C33-M.3 uses the existing C33-K.4R fixture run key.",
      "C33-M.3 must detect idempotent duplicate.",
      "C33-M.3 must write zero new rows.",
      "C33-M.3 creates no production route.",
      "C33-M.3 uses no direct DB client.",
      "C33-M.3 executes no SQL text directly.",
      "C33-M.3 does not create Activity Events.",
      "C33-M.3 does not create Value Objects.",
      "C33-M.3 does not create State Facts, Deltas or Snapshots.",
    ],
    directAdapterWrites: buildStableSemanticBundlePersistenceServiceWritesV0(),
  };
}

export async function runStableSemanticBundlePersistenceServiceSandboxWriteAdapterV0(
  input: StableSemanticBundlePersistenceServiceSandboxWriteAdapterInputV0
): Promise<StableSemanticBundlePersistenceServiceSandboxWriteAdapterResultV0> {
  const endpointBaseUrl = normalizeBaseUrl(input.endpointBaseUrl);
  const delegatedEndpoint = `${endpointBaseUrl}/api/activity/debug/stable-semantic-bundle-explicit-sandbox-write-gate`;

  const manualSchemaReadinessSummary = {
    section: "C33-K.2_SUMMARY",
    expectedTableCount: 5,
    presentTableCount: 5,
    missingTableCount: 0,
    expectedRequiredColumnCount: 45,
    presentRequiredColumnCount: 45,
    missingRequiredColumnCount: 0,
    c33K2Decision:
      "ready_for_c33_k3_post_schema_transaction_write_gate_readiness_audit",
  };

  const delegatedBody = {
    rawText: "studied math with child for 30 minutes",
    durationMinutes: 30,
    inputLanguage: "en",
    source: "manual",
    manualSchemaReadinessSummary,
    sandboxWriteConfirmation: "EXECUTE C33-K.4 SANDBOX STABLE BUNDLE WRITE",
    sandboxWriteEnabled: true,
    sandboxProjectAcknowledged: true,
    sandboxRunKey: C33_K4_SANDBOX_FIXTURE_RUN_KEY_V0,
  };

  const response = await fetch(delegatedEndpoint, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(delegatedBody),
  });

  const json = (await response.json()) as unknown;
  const jsonRecord = asRecord(json);
  const execution = asRecord(jsonRecord.execution);
  const delegatedWrites = asRecord(jsonRecord.writes);

  const existingStableBundleId = asStringOrNull(
    execution.existingStableBundleId
  );
  const rowsActuallyWritten = asNumber(execution.rowsActuallyWritten);
  const memberRowsInserted = asNumber(execution.memberRowsInserted);
  const blockedAuditRowsInserted = asNumber(execution.blockedAuditRowsInserted);

  const idempotentDuplicateDetected = asBoolean(
    execution.idempotentDuplicateDetected
  );
  const delegatedWriteGateOpened = asBoolean(execution.writeGateOpened);
  const delegatedDbReadExecuted = asBoolean(execution.dbReadExecuted);
  const delegatedDbWriteExecuted = asBoolean(execution.dbWriteExecuted);
  const delegatedSupabaseWriteExecuted = asBoolean(
    execution.supabaseWriteExecuted
  );

  const delegatedStableBundleCreated = asBoolean(
    delegatedWrites.stableBundleCreated
  );
  const delegatedStableBundlePersisted = asBoolean(
    delegatedWrites.stableBundlePersisted
  );
  const delegatedStableBundleMemberInserted = asBoolean(
    delegatedWrites.stableBundleMemberInserted
  );
  const delegatedStateFactCreated = asBoolean(delegatedWrites.stateFactCreated);
  const delegatedStateDeltaCreated = asBoolean(delegatedWrites.stateDeltaCreated);
  const delegatedStateSnapshotCreated = asBoolean(
    delegatedWrites.stateSnapshotCreated
  );
  const delegatedValueObjectCreated = asBoolean(
    delegatedWrites.valueObjectCreated
  );
  const delegatedActivityValueObjectLinkCreated = asBoolean(
    delegatedWrites.activityValueObjectLinkCreated
  );

  const errors = [
    response.status === 200 ? null : `delegated HTTP status was ${response.status}`,
    jsonRecord.ok === true ? null : "delegated body ok was not true",
    idempotentDuplicateDetected ? null : "duplicate fixture was not detected",
    existingStableBundleId === C33_K4_SANDBOX_FIXTURE_STABLE_BUNDLE_ID_V0
      ? null
      : "existingStableBundleId did not match C33-K.4R fixture",
    rowsActuallyWritten === 0 ? null : "delegated route wrote new rows",
    memberRowsInserted === 0 ? null : "delegated route inserted member rows",
    blockedAuditRowsInserted === 0
      ? null
      : "delegated route inserted blocked audit rows",
    delegatedWriteGateOpened ? null : "delegated write gate did not open",
    delegatedDbReadExecuted ? null : "delegated duplicate check did not read DB",
    delegatedDbWriteExecuted ? "delegated route performed DB write" : null,
    delegatedSupabaseWriteExecuted
      ? "delegated route performed Supabase write"
      : null,
    delegatedStableBundleCreated
      ? "delegated route created stable bundle"
      : null,
    delegatedStableBundlePersisted
      ? "delegated route persisted stable bundle"
      : null,
    delegatedStableBundleMemberInserted
      ? "delegated route inserted stable bundle members"
      : null,
    delegatedStateFactCreated ? "delegated route created State Fact" : null,
    delegatedStateDeltaCreated ? "delegated route created State Delta" : null,
    delegatedStateSnapshotCreated
      ? "delegated route created State Snapshot"
      : null,
    delegatedValueObjectCreated ? "delegated route created Value Object" : null,
    delegatedActivityValueObjectLinkCreated
      ? "delegated route created Activity Value Object link"
      : null,
  ].filter((item): item is string => typeof item === "string");

  const adapterProofPassed = errors.length === 0;

  return {
    ok: adapterProofPassed,
    policy: STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_SANDBOX_WRITE_ADAPTER_POLICY_V0,
    mode: STABLE_SEMANTIC_BUNDLE_PERSISTENCE_SERVICE_SANDBOX_WRITE_ADAPTER_MODE_V0,
    adapterMode: "duplicate_fixture_only",
    delegatedEndpoint,
    fixture: {
      stableBundleId: C33_K4_SANDBOX_FIXTURE_STABLE_BUNDLE_ID_V0,
      sandboxRunKey: C33_K4_SANDBOX_FIXTURE_RUN_KEY_V0,
    },
    delegated: {
      httpStatus: response.status,
      responseOk: response.ok,
      bodyOk: jsonRecord.ok === true,
      idempotentDuplicateDetected,
      existingStableBundleId,
      rowsActuallyWritten,
      memberRowsInserted,
      blockedAuditRowsInserted,
      delegatedWriteGateOpened,
      delegatedDbReadExecuted,
      delegatedDbWriteExecuted,
      delegatedSupabaseWriteExecuted,
      delegatedStableBundleCreated,
      delegatedStableBundlePersisted,
      delegatedStableBundleMemberInserted,
      delegatedStateFactCreated,
      delegatedStateDeltaCreated,
      delegatedStateSnapshotCreated,
      delegatedValueObjectCreated,
      delegatedActivityValueObjectLinkCreated,
    },
    summary: {
      adapterProofPassed,
      duplicateFixtureOnly: true,
      newRowsWritten: false,
      rowsActuallyWritten: 0,
      directDbAccessUsed: false,
      directSqlExecuted: false,
      directProductionWriteGateOpened: false,
      productRouteCreated: false,
      productionWriteStillClosed: true,
      activityEventCreated: false,
      valueObjectCreated: false,
      activityValueObjectLinkCreated: false,
      stateFactCreated: false,
      stateDeltaCreated: false,
      stateSnapshotCreated: false,
    },
    errors,
    warnings: [
      "C33-M.3 validates only duplicate fixture behavior.",
      "C33-M.3 intentionally does not create a new sandbox bundle.",
      "The delegated C33-K.4 route may read DB to detect duplicate fixture.",
      "Any rowsActuallyWritten value other than zero blocks this adapter.",
    ],
    safetyNotes: [
      "Adapter imports no Supabase client.",
      "Adapter performs no direct SQL execution.",
      "Adapter performs no direct DB read/write.",
      "Production write remains closed.",
      "Activity Event creation remains forbidden.",
      "Value Object creation remains forbidden.",
      "State writes remain forbidden.",
    ],
    writes: buildStableSemanticBundlePersistenceServiceWritesV0(),
  };
}
