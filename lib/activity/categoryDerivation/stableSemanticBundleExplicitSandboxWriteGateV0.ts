import {
  buildStableSemanticBundlePostSchemaWriteGateReadinessV0,
  type StableSemanticBundleManualSchemaReadinessSummaryV0,
  type StableSemanticBundlePostSchemaWriteGateReadinessRawInputV0,
  type StableSemanticBundlePostSchemaWriteGateReadinessResultV0,
} from "./stableSemanticBundlePostSchemaWriteGateReadinessV0";

export const STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_GATE_POLICY_V0 =
  "stable_semantic_bundle_explicit_sandbox_write_gate_v0" as const;

export const STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_GATE_MODE_V0 =
  "explicit_sandbox_stable_semantic_bundle_write_gate_server_side_only_v0" as const;

export const STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_CONFIRMATION_V0 =
  "EXECUTE C33-K.4 SANDBOX STABLE BUNDLE WRITE" as const;

export type StableSemanticBundleExplicitSandboxWriteGatePolicyV0 =
  typeof STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_GATE_POLICY_V0;

export type StableSemanticBundleExplicitSandboxWriteGateModeV0 =
  typeof STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_GATE_MODE_V0;

export type StableSemanticBundleExplicitSandboxWriteGateRawInputV0 =
  StableSemanticBundlePostSchemaWriteGateReadinessRawInputV0 & {
    sandboxWriteConfirmation?: string;
    sandboxWriteEnabled?: boolean;
    sandboxProjectAcknowledged?: boolean;
    sandboxRunKey?: string;
  };

export type StableSemanticBundleHeaderPayloadV0 = {
  activity_event_id: null;
  input_text: string;
  normalized_text: string;
  input_language: string;
  policy_version: string;
  source_order_snapshot_key: string;
  resolver_snapshot_key: string;
  idempotency_key: string;
  payload_hash: string;
  bundle_status: "test_preview";
  is_sandbox_test: true;
  created_by_user_id: null;
};

export type StableSemanticBundleMemberPayloadWithoutBundleIdV0 = {
  member_preview_key: string;
  candidate_key: string;
  normalized_text: string;
  source_kind: "local_controlled_category";
  resolver_decision_status: "accepted_for_preview";
};

export type StableSemanticBundleBlockedAuditPayloadWithoutBundleIdV0 = {
  blocked_preview_key: string;
  candidate_key: string;
  normalized_text: string;
  source_kind: "unknown_term" | "external_concept_stub";
  excluded_from_future_bundle_members: true;
  retained_for_audit_preview: true;
};

export type StableSemanticBundleSourceSnapshotPayloadWithoutBundleIdV0 = {
  source_order_policy: string;
  stage_count: number;
  stages_json: Array<Record<string, unknown>>;
};

export type StableSemanticBundleResolverSnapshotPayloadWithoutBundleIdV0 = {
  resolver_decision_count: number;
  local_accepted_member_count: number;
  unresolved_blocker_count: number;
  unknown_term_blocked_count: number;
  external_concept_blocked_count: number;
};

export type StableSemanticBundleExplicitSandboxWriteGatePayloadsV0 = {
  header: StableSemanticBundleHeaderPayloadV0;
  members: StableSemanticBundleMemberPayloadWithoutBundleIdV0[];
  blockedAuditItems: StableSemanticBundleBlockedAuditPayloadWithoutBundleIdV0[];
  sourceSnapshot: StableSemanticBundleSourceSnapshotPayloadWithoutBundleIdV0;
  resolverSnapshot: StableSemanticBundleResolverSnapshotPayloadWithoutBundleIdV0;
};

export type StableSemanticBundleExplicitSandboxWriteGateCheckV0 = {
  checkKey:
    | "post_schema_readiness_ok"
    | "manual_schema_summary_accepted"
    | "sandbox_confirmation_exact"
    | "sandbox_write_enabled"
    | "sandbox_project_acknowledged"
    | "sandbox_run_key_valid"
    | "server_side_route_required"
    | "state_writes_forbidden"
    | "value_object_writes_forbidden";
  title: string;
  passed: boolean;
  blocksWrite: boolean;
  canExecuteSandboxWriteNow: boolean;
  notes: string[];
};

export type StableSemanticBundleExplicitSandboxWriteGatePlanV0 = {
  planKey: string;
  policy: StableSemanticBundleExplicitSandboxWriteGatePolicyV0;
  mode: StableSemanticBundleExplicitSandboxWriteGateModeV0;
  canExecuteSandboxWriteNow: boolean;
  writeGateOpenNow: boolean;
  writeGateScope: "sandbox_only";
  productionWriteForbidden: true;
  serverSideOnly: true;
  clientIdentityTrusted: false;
  sandboxRunKey: string | null;
  expectedRowsToWrite: number;
  payloads: StableSemanticBundleExplicitSandboxWriteGatePayloadsV0 | null;
  checks: StableSemanticBundleExplicitSandboxWriteGateCheckV0[];
  safetyNotes: string[];
};

export type StableSemanticBundleExplicitSandboxWriteGateWritesV0 = {
  sqlExecuted: false;
  dbReadExecuted: boolean;
  dbWriteExecuted: boolean;
  supabaseReadExecuted: boolean;
  supabaseWriteExecuted: boolean;
  externalNetworkCallExecuted: false;
  transactionExecuted: false;
  transactionCommitted: false;
  transactionRolledBack: false;
  sandboxSequentialWriteExecuted: boolean;
  writeGateOpened: boolean;
  rowsActuallyWritten: number;
  rowsActuallyRolledBack: number;
  stableBundleCreated: boolean;
  stableBundlePersisted: boolean;
  stableBundleMemberInserted: boolean;
  stableBundleBlockedAuditInserted: boolean;
  stableBundleSourceSnapshotInserted: boolean;
  stableBundleResolverSnapshotInserted: boolean;
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

export type StableSemanticBundleExplicitSandboxWriteGateResultV0 = {
  ok: boolean;
  policy: StableSemanticBundleExplicitSandboxWriteGatePolicyV0;
  mode: StableSemanticBundleExplicitSandboxWriteGateModeV0;
  inputText: string | null;
  normalizedText: string | null;
  inputLanguage: string;
  postSchemaReadiness: StableSemanticBundlePostSchemaWriteGateReadinessResultV0;
  manualSchemaReadinessSummary: StableSemanticBundleManualSchemaReadinessSummaryV0 | null;
  plan: StableSemanticBundleExplicitSandboxWriteGatePlanV0;
  summary: {
    canExecuteSandboxWriteNow: boolean;
    writeGateOpenNow: boolean;
    expectedRowsToWrite: number;
    memberRowsToWrite: number;
    blockedAuditRowsToWrite: number;
    sourceSnapshotRowsToWrite: number;
    resolverSnapshotRowsToWrite: number;
    rowsActuallyWritten: number;
    idempotencyKey: string | null;
    payloadHash: string | null;
    sandboxRunKey: string | null;
    postSchemaReadinessOk: boolean;
    canDesignC33K4: boolean;
    productionWriteForbidden: true;
    serverSideOnly: true;
    clientIdentityTrusted: false;
    stateWritesForbidden: true;
    valueObjectWritesForbidden: true;
    activityValueObjectLinkWritesForbidden: true;
  };
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: StableSemanticBundleExplicitSandboxWriteGateWritesV0;
};

function normalizeKey(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "c33-k4-sandbox-write"
  );
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

function limited(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function getManualSummary(
  rawInput: StableSemanticBundleExplicitSandboxWriteGateRawInputV0
): StableSemanticBundleManualSchemaReadinessSummaryV0 | null {
  const value = rawInput.manualSchemaReadinessSummary;

  if (!value) {
    return null;
  }

  const expectedTableCount = Number(value.expectedTableCount);
  const presentTableCount = Number(value.presentTableCount);
  const missingTableCount = Number(value.missingTableCount);
  const expectedRequiredColumnCount = Number(value.expectedRequiredColumnCount);
  const presentRequiredColumnCount = Number(value.presentRequiredColumnCount);
  const missingRequiredColumnCount = Number(value.missingRequiredColumnCount);

  if (
    !Number.isFinite(expectedTableCount) ||
    !Number.isFinite(presentTableCount) ||
    !Number.isFinite(missingTableCount) ||
    !Number.isFinite(expectedRequiredColumnCount) ||
    !Number.isFinite(presentRequiredColumnCount) ||
    !Number.isFinite(missingRequiredColumnCount)
  ) {
    return null;
  }

  return {
    section: "C33-K.2_SUMMARY",
    expectedTableCount,
    presentTableCount,
    missingTableCount,
    expectedRequiredColumnCount,
    presentRequiredColumnCount,
    missingRequiredColumnCount,
    c33K2Decision:
      typeof value.c33K2Decision === "string"
        ? value.c33K2Decision
        : "",
  };
}

function makeCheck(params: {
  checkKey: StableSemanticBundleExplicitSandboxWriteGateCheckV0["checkKey"];
  title: string;
  passed: boolean;
  blocksWrite: boolean;
  notes: string[];
}): StableSemanticBundleExplicitSandboxWriteGateCheckV0 {
  return {
    checkKey: params.checkKey,
    title: params.title,
    passed: params.passed,
    blocksWrite: params.blocksWrite,
    canExecuteSandboxWriteNow: params.passed && !params.blocksWrite,
    notes: params.notes,
  };
}

function emptyWrites(): StableSemanticBundleExplicitSandboxWriteGateWritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    supabaseReadExecuted: false,
    supabaseWriteExecuted: false,
    externalNetworkCallExecuted: false,
    transactionExecuted: false,
    transactionCommitted: false,
    transactionRolledBack: false,
    sandboxSequentialWriteExecuted: false,
    writeGateOpened: false,
    rowsActuallyWritten: 0,
    rowsActuallyRolledBack: 0,
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

export function buildStableSemanticBundleExplicitSandboxWriteGatePlanV0(
  rawInput: StableSemanticBundleExplicitSandboxWriteGateRawInputV0
): StableSemanticBundleExplicitSandboxWriteGateResultV0 {
  const writes = emptyWrites();
  const postSchemaReadiness =
    buildStableSemanticBundlePostSchemaWriteGateReadinessV0(rawInput);
  const manualSchemaReadinessSummary = getManualSummary(rawInput);
  const sandboxRunKey =
    typeof rawInput.sandboxRunKey === "string" &&
    rawInput.sandboxRunKey.startsWith("c33-k4-sandbox-")
      ? normalizeKey(rawInput.sandboxRunKey)
      : null;
  const transactionContract =
    postSchemaReadiness.stableSemanticBundleTransactionContract
      .transactionContract;
  const payloadHash =
    transactionContract?.idempotencyPreview.deterministicPayloadHash ?? null;
  const baseIdempotencyKey =
    transactionContract?.idempotencyPreview.deterministicIdempotencyKey ?? null;
  const idempotencyKey =
    baseIdempotencyKey && sandboxRunKey
      ? limited(`${baseIdempotencyKey}-${sandboxRunKey}`, 240)
      : null;
  const exactConfirmation =
    rawInput.sandboxWriteConfirmation ===
    STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_CONFIRMATION_V0;
  const sandboxWriteEnabled = rawInput.sandboxWriteEnabled === true;
  const sandboxProjectAcknowledged =
    rawInput.sandboxProjectAcknowledged === true;

  const checks = [
    makeCheck({
      checkKey: "post_schema_readiness_ok",
      title: "C33-K.3 post-schema readiness is ok",
      passed: postSchemaReadiness.ok === true,
      blocksWrite: postSchemaReadiness.ok !== true,
      notes: [
        "C33-K.4 requires the read-only post-schema readiness audit to pass.",
      ],
    }),
    makeCheck({
      checkKey: "manual_schema_summary_accepted",
      title: "Manual C33-K.2 schema summary is accepted",
      passed:
        manualSchemaReadinessSummary?.c33K2Decision ===
          "ready_for_c33_k3_post_schema_transaction_write_gate_readiness_audit" &&
        manualSchemaReadinessSummary.presentTableCount === 5 &&
        manualSchemaReadinessSummary.missingTableCount === 0 &&
        manualSchemaReadinessSummary.presentRequiredColumnCount === 45 &&
        manualSchemaReadinessSummary.missingRequiredColumnCount === 0,
      blocksWrite:
        !manualSchemaReadinessSummary ||
        manualSchemaReadinessSummary.c33K2Decision !==
          "ready_for_c33_k3_post_schema_transaction_write_gate_readiness_audit",
      notes: [
        "The live schema was verified manually with SELECT-only preflight.",
      ],
    }),
    makeCheck({
      checkKey: "sandbox_confirmation_exact",
      title: "Exact sandbox write confirmation is present",
      passed: exactConfirmation,
      blocksWrite: !exactConfirmation,
      notes: [
        `Required confirmation: ${STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_CONFIRMATION_V0}`,
      ],
    }),
    makeCheck({
      checkKey: "sandbox_write_enabled",
      title: "sandboxWriteEnabled is true",
      passed: sandboxWriteEnabled,
      blocksWrite: !sandboxWriteEnabled,
      notes: ["The caller must explicitly set sandboxWriteEnabled to true."],
    }),
    makeCheck({
      checkKey: "sandbox_project_acknowledged",
      title: "Sandbox project acknowledgement is true",
      passed: sandboxProjectAcknowledged,
      blocksWrite: !sandboxProjectAcknowledged,
      notes: ["The caller must confirm this is the sandbox Supabase project."],
    }),
    makeCheck({
      checkKey: "sandbox_run_key_valid",
      title: "Sandbox run key is valid",
      passed: sandboxRunKey !== null,
      blocksWrite: sandboxRunKey === null,
      notes: ["sandboxRunKey must start with c33-k4-sandbox-."],
    }),
    makeCheck({
      checkKey: "server_side_route_required",
      title: "Server-side route required",
      passed: true,
      blocksWrite: false,
      notes: [
        "The actual persistence call is implemented only in the Next.js server route.",
      ],
    }),
    makeCheck({
      checkKey: "state_writes_forbidden",
      title: "State writes are forbidden",
      passed: true,
      blocksWrite: false,
      notes: [
        "The stable semantic bundle write gate cannot create state facts, deltas or snapshots.",
      ],
    }),
    makeCheck({
      checkKey: "value_object_writes_forbidden",
      title: "Value Object and activity-value-object link writes are forbidden",
      passed: true,
      blocksWrite: false,
      notes: [
        "The stable semantic bundle write gate cannot create Value Objects or links.",
      ],
    }),
  ];

  const blockingChecks = checks.filter(
    (item) => item.blocksWrite && !item.passed
  );
  const canExecuteSandboxWriteNow = blockingChecks.length === 0;
  const transactionSteps = transactionContract?.transactionSteps ?? [];
  const memberSteps = transactionSteps.filter(
    (item) => item.dryRunOperationKind === "would_create_member_row"
  );
  const blockedAuditSteps = transactionSteps.filter(
    (item) => item.dryRunOperationKind === "would_create_blocked_audit_row"
  );

  const members: StableSemanticBundleMemberPayloadWithoutBundleIdV0[] =
    memberSteps.map((step, index) => {
      const row = asRecord(step.rowPreview);

      return {
        member_preview_key: limited(
          asString(row.member_preview_key, step.deterministicRowKey),
          240
        ),
        candidate_key: limited(
          asString(row.candidate_key, asString(row.candidateKey, step.deterministicRowKey)),
          240
        ),
        normalized_text: limited(
          asString(row.normalized_text, asString(row.normalizedText, step.sourcePayloadKey || `member-${index + 1}`)),
          500
        ),
        source_kind: "local_controlled_category",
        resolver_decision_status: "accepted_for_preview",
      };
    });

  const blockedAuditItems: StableSemanticBundleBlockedAuditPayloadWithoutBundleIdV0[] =
    blockedAuditSteps.map((step, index) => {
      const row = asRecord(step.rowPreview);
      const rawSourceKind = asString(
        row.source_kind,
        asString(row.sourceKind, index % 2 === 0 ? "unknown_term" : "external_concept_stub")
      );
      const sourceKind =
        rawSourceKind === "external_concept_stub"
          ? "external_concept_stub"
          : "unknown_term";

      return {
        blocked_preview_key: limited(
          asString(row.blocked_preview_key, step.deterministicRowKey),
          240
        ),
        candidate_key: limited(
          asString(row.candidate_key, asString(row.candidateKey, step.deterministicRowKey)),
          240
        ),
        normalized_text: limited(
          asString(row.normalized_text, asString(row.normalizedText, step.sourcePayloadKey || `blocked-${index + 1}`)),
          500
        ),
        source_kind: sourceKind,
        excluded_from_future_bundle_members: true,
        retained_for_audit_preview: true,
      };
    });

  const unknownTermBlockedCount = blockedAuditItems.filter(
    (item) => item.source_kind === "unknown_term"
  ).length;
  const externalConceptBlockedCount = blockedAuditItems.filter(
    (item) => item.source_kind === "external_concept_stub"
  ).length;

  const payloads =
    postSchemaReadiness.ok && idempotencyKey && payloadHash
      ? {
          header: {
            activity_event_id: null,
            input_text: postSchemaReadiness.inputText ?? "",
            normalized_text: postSchemaReadiness.normalizedText ?? "",
            input_language: postSchemaReadiness.inputLanguage,
            policy_version:
              STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_GATE_POLICY_V0,
            source_order_snapshot_key: limited(
              `c33-k4-source-order-${sandboxRunKey ?? "missing-run-key"}`,
              240
            ),
            resolver_snapshot_key: limited(
              `c33-k4-resolver-${sandboxRunKey ?? "missing-run-key"}`,
              240
            ),
            idempotency_key: idempotencyKey,
            payload_hash: payloadHash,
            bundle_status: "test_preview",
            is_sandbox_test: true,
            created_by_user_id: null,
          } satisfies StableSemanticBundleHeaderPayloadV0,
          members,
          blockedAuditItems,
          sourceSnapshot: {
            source_order_policy:
              "source_order_resolver_blocker_preview_v0",
            stage_count: 4,
            stages_json: [
              {
                order: 1,
                source: "local_controlled_category_lookup",
                role: "member_candidates",
              },
              {
                order: 2,
                source: "unknown_term_detector",
                role: "blocked_audit_candidates",
              },
              {
                order: 3,
                source: "external_concept_stub",
                role: "blocked_audit_candidates",
              },
              {
                order: 4,
                source: "resolver_decision_contract",
                role: "final_member_or_audit_decision",
              },
            ],
          } satisfies StableSemanticBundleSourceSnapshotPayloadWithoutBundleIdV0,
          resolverSnapshot: {
            resolver_decision_count: members.length + blockedAuditItems.length,
            local_accepted_member_count: members.length,
            unresolved_blocker_count: blockedAuditItems.length,
            unknown_term_blocked_count: unknownTermBlockedCount,
            external_concept_blocked_count: externalConceptBlockedCount,
          } satisfies StableSemanticBundleResolverSnapshotPayloadWithoutBundleIdV0,
        }
      : null;

  const expectedRowsToWrite = payloads
    ? 1 + payloads.members.length + payloads.blockedAuditItems.length + 1 + 1
    : 0;

  return {
    ok: canExecuteSandboxWriteNow,
    policy: STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_GATE_POLICY_V0,
    mode: STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_GATE_MODE_V0,
    inputText: postSchemaReadiness.inputText,
    normalizedText: postSchemaReadiness.normalizedText,
    inputLanguage: postSchemaReadiness.inputLanguage,
    postSchemaReadiness,
    manualSchemaReadinessSummary,
    plan: {
      planKey: normalizeKey(
        `stable-semantic-bundle-explicit-sandbox-write-gate-${sandboxRunKey ?? "missing"}`
      ),
      policy: STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_GATE_POLICY_V0,
      mode: STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_GATE_MODE_V0,
      canExecuteSandboxWriteNow,
      writeGateOpenNow: canExecuteSandboxWriteNow,
      writeGateScope: "sandbox_only",
      productionWriteForbidden: true,
      serverSideOnly: true,
      clientIdentityTrusted: false,
      sandboxRunKey,
      expectedRowsToWrite,
      payloads,
      checks,
      safetyNotes: [
        "This gate is sandbox-only and requires exact confirmation.",
        "It is server-side only; client identity is not trusted.",
        "It writes only stable semantic bundle persistence rows.",
        "It does not create state facts, Value Objects, activity-value-object links or activity events.",
      ],
    },
    summary: {
      canExecuteSandboxWriteNow,
      writeGateOpenNow: canExecuteSandboxWriteNow,
      expectedRowsToWrite,
      memberRowsToWrite: members.length,
      blockedAuditRowsToWrite: blockedAuditItems.length,
      sourceSnapshotRowsToWrite: payloads ? 1 : 0,
      resolverSnapshotRowsToWrite: payloads ? 1 : 0,
      rowsActuallyWritten: 0,
      idempotencyKey,
      payloadHash,
      sandboxRunKey,
      postSchemaReadinessOk: postSchemaReadiness.ok,
      canDesignC33K4: postSchemaReadiness.summary.canDesignC33K4,
      productionWriteForbidden: true,
      serverSideOnly: true,
      clientIdentityTrusted: false,
      stateWritesForbidden: true,
      valueObjectWritesForbidden: true,
      activityValueObjectLinkWritesForbidden: true,
    },
    errors: blockingChecks.map((item) => item.title),
    warnings: [
      "C33-K.4 is an explicit sandbox write gate.",
      "The route may perform DB writes only after exact sandbox confirmation.",
      "Production write remains forbidden.",
      "This is a sandbox sequential write, not a production transaction implementation.",
    ],
    safetyNotes: [
      "No SQL text is executed.",
      "No state facts, state deltas or state snapshots are created.",
      "No Value Objects or activity-value-object links are created.",
      "Unknown and external candidates are retained as blocked audit rows only.",
    ],
    writes,
  };
}

export function buildStableSemanticBundleExplicitSandboxWriteGateReadinessV0() {
  return {
    ok: true,
    policy: STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_GATE_POLICY_V0,
    mode: "route_contract_readiness_explicit_sandbox_write_gate",
    routeMode: STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_GATE_MODE_V0,
    requiredConfirmation:
      STABLE_SEMANTIC_BUNDLE_EXPLICIT_SANDBOX_WRITE_CONFIRMATION_V0,
    requiredManualEvidence: {
      section: "C33-K.2_SUMMARY",
      expectedTableCount: 5,
      presentTableCount: 5,
      missingTableCount: 0,
      expectedRequiredColumnCount: 45,
      presentRequiredColumnCount: 45,
      missingRequiredColumnCount: 0,
      c33K2Decision:
        "ready_for_c33_k3_post_schema_transaction_write_gate_readiness_audit",
    },
    gateRules: [
      "This route is sandbox-only.",
      "This route requires exact sandbox write confirmation.",
      "This route requires sandboxWriteEnabled=true.",
      "This route requires sandboxProjectAcknowledged=true.",
      "This route requires sandboxRunKey starting with c33-k4-sandbox-.",
      "This route requires accepted C33-K.2 manual schema readiness summary.",
      "This route uses server-side service-role access only after all gates pass.",
      "This route writes only stable semantic bundle tables.",
      "This route does not create state facts, Value Objects, activity events or activity-value-object links.",
      "Production write remains forbidden.",
    ],
    writes: emptyWrites(),
  };
}
