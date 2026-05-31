import {
  buildStableSemanticBundleWriteContractV0,
  type StableSemanticBundleWriteContractRawInputV0,
  type StableSemanticBundleWriteContractResultV0,
} from "./stableSemanticBundleWriteContractV0";

export const STABLE_SEMANTIC_BUNDLE_SCHEMA_PREFLIGHT_POLICY_V0 =
  "stable_semantic_bundle_schema_preflight_v0" as const;

export const STABLE_SEMANTIC_BUNDLE_SCHEMA_PREFLIGHT_MODE_V0 =
  "read_only_stable_semantic_bundle_schema_preflight_no_sql_no_db" as const;

export type StableSemanticBundleSchemaPreflightPolicyV0 =
  typeof STABLE_SEMANTIC_BUNDLE_SCHEMA_PREFLIGHT_POLICY_V0;

export type StableSemanticBundleSchemaPreflightModeV0 =
  typeof STABLE_SEMANTIC_BUNDLE_SCHEMA_PREFLIGHT_MODE_V0;

export type StableSemanticBundleSchemaPreflightRawInputV0 =
  StableSemanticBundleWriteContractRawInputV0;

export type StableSemanticBundleSchemaPreflightCheckStatusV0 =
  | "defined_for_future_preflight"
  | "requires_information_schema_select"
  | "requires_explicit_write_gate"
  | "blocked_by_contract";

export type StableSemanticBundleSchemaPreflightTableKeyV0 =
  | "stable_semantic_bundles"
  | "stable_semantic_bundle_members"
  | "stable_semantic_bundle_blocked_audit_items"
  | "stable_semantic_bundle_source_snapshots"
  | "stable_semantic_bundle_resolver_snapshots";

export type StableSemanticBundleSchemaPreflightFieldV0 = {
  fieldKey: string;
  requiredForFutureWrite: boolean;
  source:
    | "input_snapshot"
    | "source_order_snapshot"
    | "resolver_snapshot"
    | "member_payload_preview"
    | "blocked_audit_payload_preview"
    | "gate_metadata"
    | "audit_metadata";
  notes: string[];
};

export type StableSemanticBundleSchemaPreflightTableSpecV0 = {
  tableKey: StableSemanticBundleSchemaPreflightTableKeyV0;
  tableName: StableSemanticBundleSchemaPreflightTableKeyV0;
  purpose: string;
  requiredForFutureWriteGate: boolean;
  verificationStatus: "not_verified_in_db_this_step";
  futureVerificationMethod: "information_schema_select_only";
  canCreateTableNow: false;
  canAlterTableNow: false;
  canInsertNow: false;
  canUpdateNow: false;
  canDeleteNow: false;
  fields: StableSemanticBundleSchemaPreflightFieldV0[];
  safetyNotes: string[];
};

export type StableSemanticBundleSchemaPreflightCheckV0 = {
  checkKey:
    | "schema_preflight_is_select_only"
    | "stable_bundle_tables_defined"
    | "member_payload_mapping_defined"
    | "blocked_audit_payload_mapping_defined"
    | "source_resolver_snapshot_mapping_defined"
    | "write_gate_still_closed"
    | "state_write_contract_absent_by_design"
    | "value_object_link_write_contract_absent_by_design";
  title: string;
  status: StableSemanticBundleSchemaPreflightCheckStatusV0;
  passedForReadiness: boolean;
  blocksPersistenceNow: boolean;
  canPersistNow: false;
  canWriteStateNow: false;
  notes: string[];
};

export type StableSemanticBundleSchemaPreflightWritesV0 = {
  sqlExecuted: false;
  dbReadExecuted: false;
  dbWriteExecuted: false;
  informationSchemaSelectExecuted: false;
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

export type StableSemanticBundleSchemaPreflightSummaryV0 = {
  schemaPreflightCreated: boolean;
  tableSpecCount: number;
  requiredTableSpecCount: number;
  preflightCheckCount: number;
  blockingPreflightCheckCount: number;
  writeContractPreviewCreated: boolean;
  memberPayloadPreviewCount: number;
  blockedAuditPayloadPreviewCount: number;
  sourceOrderSatisfied: boolean;
  resolverApprovedOnlySatisfied: boolean;
  schemaPreflightReadOnly: true;
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

export type StableSemanticBundleSchemaPreflightResultV0 = {
  ok: boolean;
  policy: StableSemanticBundleSchemaPreflightPolicyV0;
  mode: StableSemanticBundleSchemaPreflightModeV0;
  inputText: string | null;
  normalizedText: string | null;
  inputLanguage: string;
  stableSemanticBundleWriteContract: StableSemanticBundleWriteContractResultV0;
  tableSpecs: StableSemanticBundleSchemaPreflightTableSpecV0[];
  preflightChecks: StableSemanticBundleSchemaPreflightCheckV0[];
  summary: StableSemanticBundleSchemaPreflightSummaryV0;
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: StableSemanticBundleSchemaPreflightWritesV0;
};

export function buildStableSemanticBundleSchemaPreflightWritesV0(): StableSemanticBundleSchemaPreflightWritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    informationSchemaSelectExecuted: false,
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

function field(
  fieldKey: string,
  source: StableSemanticBundleSchemaPreflightFieldV0["source"],
  notes: string[]
): StableSemanticBundleSchemaPreflightFieldV0 {
  return {
    fieldKey,
    requiredForFutureWrite: true,
    source,
    notes,
  };
}

function buildTableSpecs(): StableSemanticBundleSchemaPreflightTableSpecV0[] {
  return [
    {
      tableKey: "stable_semantic_bundles",
      tableName: "stable_semantic_bundles",
      purpose:
        "Future stable semantic bundle header storing one stable semantic interpretation per source activity/input snapshot.",
      requiredForFutureWriteGate: true,
      verificationStatus: "not_verified_in_db_this_step",
      futureVerificationMethod: "information_schema_select_only",
      canCreateTableNow: false,
      canAlterTableNow: false,
      canInsertNow: false,
      canUpdateNow: false,
      canDeleteNow: false,
      fields: [
        field("id", "gate_metadata", ["Future primary key."]),
        field("activity_event_id", "input_snapshot", [
          "Preferred future link to source activity event.",
          "If absent, a separate input snapshot identifier is required.",
        ]),
        field("input_text", "input_snapshot", [
          "Raw input snapshot from write contract preview.",
        ]),
        field("normalized_text", "input_snapshot", [
          "Normalized input snapshot from write contract preview.",
        ]),
        field("input_language", "input_snapshot", [
          "Language code from write contract preview.",
        ]),
        field("policy_version", "gate_metadata", [
          "Must store stable_semantic_bundle_write_contract_v0 or later.",
        ]),
        field("source_order_snapshot_key", "source_order_snapshot", [
          "Reference to exact ordered source chain snapshot.",
        ]),
        field("resolver_snapshot_key", "resolver_snapshot", [
          "Reference to resolver decision summary/snapshot.",
        ]),
        field("created_at", "audit_metadata", ["Future audit timestamp."]),
      ],
      safetyNotes: [
        "This table is not created or verified here.",
        "Future verification must be information_schema select-only before write gate.",
      ],
    },
    {
      tableKey: "stable_semantic_bundle_members",
      tableName: "stable_semantic_bundle_members",
      purpose:
        "Future rows for resolver-approved local category members only.",
      requiredForFutureWriteGate: true,
      verificationStatus: "not_verified_in_db_this_step",
      futureVerificationMethod: "information_schema_select_only",
      canCreateTableNow: false,
      canAlterTableNow: false,
      canInsertNow: false,
      canUpdateNow: false,
      canDeleteNow: false,
      fields: [
        field("id", "gate_metadata", ["Future primary key."]),
        field("stable_semantic_bundle_id", "gate_metadata", [
          "Future foreign key to stable_semantic_bundles.",
        ]),
        field("member_preview_key", "member_payload_preview", [
          "Trace back to C33-I.2 member payload preview.",
        ]),
        field("candidate_key", "member_payload_preview", [
          "Trace back to local controlled category candidate.",
        ]),
        field("normalized_text", "member_payload_preview", [
          "Local controlled category normalized text.",
        ]),
        field("source_kind", "member_payload_preview", [
          "Must be local_controlled_category.",
        ]),
        field("resolver_decision_status", "member_payload_preview", [
          "Must be accepted_for_preview before future write.",
        ]),
      ],
      safetyNotes: [
        "Unknown/external candidates must not be inserted as members.",
        "This route performs no inserts.",
      ],
    },
    {
      tableKey: "stable_semantic_bundle_blocked_audit_items",
      tableName: "stable_semantic_bundle_blocked_audit_items",
      purpose:
        "Future audit rows for excluded unknown terms and external concept candidates.",
      requiredForFutureWriteGate: true,
      verificationStatus: "not_verified_in_db_this_step",
      futureVerificationMethod: "information_schema_select_only",
      canCreateTableNow: false,
      canAlterTableNow: false,
      canInsertNow: false,
      canUpdateNow: false,
      canDeleteNow: false,
      fields: [
        field("id", "gate_metadata", ["Future primary key."]),
        field("stable_semantic_bundle_id", "gate_metadata", [
          "Future foreign key to stable_semantic_bundles.",
        ]),
        field("blocked_preview_key", "blocked_audit_payload_preview", [
          "Trace back to blocked preview item.",
        ]),
        field("candidate_key", "blocked_audit_payload_preview", [
          "Trace back to unknown/external candidate.",
        ]),
        field("normalized_text", "blocked_audit_payload_preview", [
          "Blocked candidate normalized term.",
        ]),
        field("source_kind", "blocked_audit_payload_preview", [
          "Allowed: unknown_term or external_concept_stub.",
        ]),
        field("excluded_from_future_bundle_members", "blocked_audit_payload_preview", [
          "Must remain true.",
        ]),
      ],
      safetyNotes: [
        "Blocked audit rows are not bundle members.",
        "This route performs no inserts.",
      ],
    },
    {
      tableKey: "stable_semantic_bundle_source_snapshots",
      tableName: "stable_semantic_bundle_source_snapshots",
      purpose:
        "Future immutable audit snapshot of source-order stages and counts.",
      requiredForFutureWriteGate: true,
      verificationStatus: "not_verified_in_db_this_step",
      futureVerificationMethod: "information_schema_select_only",
      canCreateTableNow: false,
      canAlterTableNow: false,
      canInsertNow: false,
      canUpdateNow: false,
      canDeleteNow: false,
      fields: [
        field("id", "gate_metadata", ["Future primary key."]),
        field("stable_semantic_bundle_id", "gate_metadata", [
          "Future foreign key to stable_semantic_bundles.",
        ]),
        field("source_order_policy", "source_order_snapshot", [
          "Policy of source order chain.",
        ]),
        field("stage_count", "source_order_snapshot", [
          "Count of ordered processing stages.",
        ]),
        field("stages_json", "source_order_snapshot", [
          "Future JSON snapshot of ordered stage statuses/counts.",
        ]),
      ],
      safetyNotes: [
        "Snapshot format must be locked before any write gate.",
        "This route performs no SQL.",
      ],
    },
    {
      tableKey: "stable_semantic_bundle_resolver_snapshots",
      tableName: "stable_semantic_bundle_resolver_snapshots",
      purpose:
        "Future immutable audit snapshot of resolver decisions and exclusion counts.",
      requiredForFutureWriteGate: true,
      verificationStatus: "not_verified_in_db_this_step",
      futureVerificationMethod: "information_schema_select_only",
      canCreateTableNow: false,
      canAlterTableNow: false,
      canInsertNow: false,
      canUpdateNow: false,
      canDeleteNow: false,
      fields: [
        field("id", "gate_metadata", ["Future primary key."]),
        field("stable_semantic_bundle_id", "gate_metadata", [
          "Future foreign key to stable_semantic_bundles.",
        ]),
        field("resolver_decision_count", "resolver_snapshot", [
          "Count of all resolver decisions.",
        ]),
        field("local_accepted_member_count", "resolver_snapshot", [
          "Count of future bundle members.",
        ]),
        field("unresolved_blocker_count", "resolver_snapshot", [
          "Count of blockers excluded from bundle membership.",
        ]),
        field("unknown_term_blocked_count", "resolver_snapshot", [
          "Count of unknown terms blocked.",
        ]),
        field("external_concept_blocked_count", "resolver_snapshot", [
          "Count of external concept candidates blocked.",
        ]),
      ],
      safetyNotes: [
        "Resolver snapshot persistence is not resolver decision persistence.",
        "Future transaction boundaries must be defined later.",
      ],
    },
  ];
}

function buildPreflightChecks(): StableSemanticBundleSchemaPreflightCheckV0[] {
  return [
    {
      checkKey: "schema_preflight_is_select_only",
      title: "Schema preflight must be select-only",
      status: "requires_information_schema_select",
      passedForReadiness: true,
      blocksPersistenceNow: true,
      canPersistNow: false,
      canWriteStateNow: false,
      notes: [
        "C33-I.3 defines the preflight contract without executing SQL.",
        "A later schema check may use information_schema SELECT only.",
      ],
    },
    {
      checkKey: "stable_bundle_tables_defined",
      title: "Future stable bundle table specs are defined",
      status: "defined_for_future_preflight",
      passedForReadiness: true,
      blocksPersistenceNow: true,
      canPersistNow: false,
      canWriteStateNow: false,
      notes: [
        "Expected table names and field groups are listed for future preflight.",
        "No table is created or altered here.",
      ],
    },
    {
      checkKey: "member_payload_mapping_defined",
      title: "Member payload mapping is defined",
      status: "defined_for_future_preflight",
      passedForReadiness: true,
      blocksPersistenceNow: true,
      canPersistNow: false,
      canWriteStateNow: false,
      notes: [
        "Only resolver-approved local controlled category members can map to future member rows.",
      ],
    },
    {
      checkKey: "blocked_audit_payload_mapping_defined",
      title: "Blocked audit payload mapping is defined",
      status: "defined_for_future_preflight",
      passedForReadiness: true,
      blocksPersistenceNow: true,
      canPersistNow: false,
      canWriteStateNow: false,
      notes: [
        "Unknown/external candidates are audit-only and excluded from future member rows.",
      ],
    },
    {
      checkKey: "source_resolver_snapshot_mapping_defined",
      title: "Source/resolver snapshot mapping is defined",
      status: "defined_for_future_preflight",
      passedForReadiness: true,
      blocksPersistenceNow: true,
      canPersistNow: false,
      canWriteStateNow: false,
      notes: [
        "Future schema must support source-order and resolver snapshot payloads.",
      ],
    },
    {
      checkKey: "write_gate_still_closed",
      title: "Write gate remains closed",
      status: "requires_explicit_write_gate",
      passedForReadiness: true,
      blocksPersistenceNow: true,
      canPersistNow: false,
      canWriteStateNow: false,
      notes: [
        "C33-I.3 cannot persist stable bundles.",
        "C33-I.4 should still be dry-run / would-write payload only.",
      ],
    },
    {
      checkKey: "state_write_contract_absent_by_design",
      title: "State write contract absent by design",
      status: "blocked_by_contract",
      passedForReadiness: true,
      blocksPersistenceNow: true,
      canPersistNow: false,
      canWriteStateNow: false,
      notes: [
        "No state facts/deltas/snapshots can be written from stable semantic bundle preflight.",
      ],
    },
    {
      checkKey: "value_object_link_write_contract_absent_by_design",
      title: "Value Object/link write contract absent by design",
      status: "blocked_by_contract",
      passedForReadiness: true,
      blocksPersistenceNow: true,
      canPersistNow: false,
      canWriteStateNow: false,
      notes: [
        "No Value Object or activity-value-object link can be written from schema preflight.",
      ],
    },
  ];
}

function emptySummary(): StableSemanticBundleSchemaPreflightSummaryV0 {
  return {
    schemaPreflightCreated: false,
    tableSpecCount: 0,
    requiredTableSpecCount: 0,
    preflightCheckCount: 0,
    blockingPreflightCheckCount: 0,
    writeContractPreviewCreated: false,
    memberPayloadPreviewCount: 0,
    blockedAuditPayloadPreviewCount: 0,
    sourceOrderSatisfied: false,
    resolverApprovedOnlySatisfied: false,
    schemaPreflightReadOnly: true,
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

export function buildStableSemanticBundleSchemaPreflightV0(
  rawInput: StableSemanticBundleSchemaPreflightRawInputV0
): StableSemanticBundleSchemaPreflightResultV0 {
  const writes = buildStableSemanticBundleSchemaPreflightWritesV0();
  const stableSemanticBundleWriteContract =
    buildStableSemanticBundleWriteContractV0(rawInput);

  if (!stableSemanticBundleWriteContract.ok) {
    return {
      ok: false,
      policy: STABLE_SEMANTIC_BUNDLE_SCHEMA_PREFLIGHT_POLICY_V0,
      mode: STABLE_SEMANTIC_BUNDLE_SCHEMA_PREFLIGHT_MODE_V0,
      inputText: stableSemanticBundleWriteContract.inputText,
      normalizedText: stableSemanticBundleWriteContract.normalizedText,
      inputLanguage: stableSemanticBundleWriteContract.inputLanguage,
      stableSemanticBundleWriteContract,
      tableSpecs: [],
      preflightChecks: [],
      summary: emptySummary(),
      errors:
        stableSemanticBundleWriteContract.errors.length > 0
          ? stableSemanticBundleWriteContract.errors
          : [
              "Stable semantic bundle schema preflight requires valid write-contract input.",
            ],
      warnings: [],
      safetyNotes: [
        "Invalid input cannot produce schema preflight readiness.",
        "No SQL, DB read, DB write, Supabase write, stable bundle or state write is performed.",
      ],
      writes,
    };
  }

  const tableSpecs = buildTableSpecs();
  const preflightChecks = buildPreflightChecks();
  const requiredTableSpecCount = tableSpecs.filter(
    (table) => table.requiredForFutureWriteGate
  ).length;
  const blockingPreflightCheckCount = preflightChecks.filter(
    (check) => check.blocksPersistenceNow
  ).length;

  return {
    ok: true,
    policy: STABLE_SEMANTIC_BUNDLE_SCHEMA_PREFLIGHT_POLICY_V0,
    mode: STABLE_SEMANTIC_BUNDLE_SCHEMA_PREFLIGHT_MODE_V0,
    inputText: stableSemanticBundleWriteContract.inputText,
    normalizedText: stableSemanticBundleWriteContract.normalizedText,
    inputLanguage: stableSemanticBundleWriteContract.inputLanguage,
    stableSemanticBundleWriteContract,
    tableSpecs,
    preflightChecks,
    summary: {
      schemaPreflightCreated: true,
      tableSpecCount: tableSpecs.length,
      requiredTableSpecCount,
      preflightCheckCount: preflightChecks.length,
      blockingPreflightCheckCount,
      writeContractPreviewCreated:
        stableSemanticBundleWriteContract.summary.writeContractPreviewCreated,
      memberPayloadPreviewCount:
        stableSemanticBundleWriteContract.summary.memberPayloadPreviewCount,
      blockedAuditPayloadPreviewCount:
        stableSemanticBundleWriteContract.summary.blockedAuditPayloadPreviewCount,
      sourceOrderSatisfied:
        stableSemanticBundleWriteContract.summary.sourceOrderSatisfied,
      resolverApprovedOnlySatisfied:
        stableSemanticBundleWriteContract.summary.resolverApprovedOnlySatisfied,
      schemaPreflightReadOnly: true,
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
      "Schema preflight is a read-only contract and does not execute information_schema SELECT yet.",
      "Table names and required fields are readiness specs, not applied migrations.",
      "Stable bundle persistence gate remains closed.",
    ],
    safetyNotes: [
      "No SQL is executed in C33-I.3.",
      "No DB read or write is performed in C33-I.3.",
      "Future schema verification must be information_schema SELECT only.",
      "No table is created, altered or written.",
      "No resolver row, stable bundle row, member row, audit row, Value Object, link or state fact is created.",
    ],
    writes,
  };
}

export function buildStableSemanticBundleSchemaPreflightReadinessV0() {
  return {
    ok: true,
    policy: STABLE_SEMANTIC_BUNDLE_SCHEMA_PREFLIGHT_POLICY_V0,
    mode: "route_contract_readiness_no_schema_preflight_execution",
    routeMode: STABLE_SEMANTIC_BUNDLE_SCHEMA_PREFLIGHT_MODE_V0,
    sourceContracts: {
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
    futureSchemaPreflightRules: [
      "C33-I.3 defines schema preflight readiness only.",
      "No SQL is executed in this route.",
      "No DB read is executed in this route.",
      "Future schema verification must be information_schema SELECT only.",
      "No schema DDL, data DML or RPC is allowed.",
      "Stable bundle write gate remains closed.",
      "State, Value Object and activity-value-object link writes remain separate.",
    ],
    expectedFutureTables: buildTableSpecs().map((table) => table.tableName),
    safetyNotes: [
      "This contract performs no SQL, DB read, DB write, Supabase call or RPC.",
      "It does not verify live schema yet.",
      "It does not persist resolver decisions.",
      "It does not create stable semantic bundles.",
      "It does not create state facts, state deltas or state snapshots.",
    ],
    writes: buildStableSemanticBundleSchemaPreflightWritesV0(),
  };
}

