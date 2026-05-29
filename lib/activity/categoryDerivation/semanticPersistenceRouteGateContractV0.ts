import type { SemanticPersistenceGateDecisionV0 } from "./semanticPersistenceGateV0";
import type { SemanticPreviewPipelineResultV0 } from "./semanticPreviewPipelineV0";

export type SemanticPersistenceRouteGatePolicyV0 =
  "semantic_persistence_route_gate_contract_v0";

export type SemanticPersistenceRouteGateModeV0 =
  | "contract_only_no_write"
  | "blocked_before_route_execution"
  | "eligible_for_future_write_route_after_security_review";

export type SemanticPersistenceRouteIntentV0 =
  | "persist_activity_event"
  | "persist_category_resolution"
  | "persist_value_object_candidate"
  | "persist_activity_value_object_link"
  | "persist_state_delta_candidate"
  | "execute_review_action"
  | "unknown";

export type SemanticPersistenceRouteGateBlockerCodeV0 =
  | "contract_only_route"
  | "explicit_write_execution_disabled"
  | "preview_gate_blocks_persistence"
  | "missing_requested_intent"
  | "missing_requested_target_key"
  | "missing_authenticated_user_id"
  | "missing_actor_id"
  | "missing_rls_verification_token"
  | "missing_user_confirmation"
  | "state_fact_persistence_forbidden"
  | "debug_route_must_not_write";

export type SemanticPersistenceRouteGateBlockerV0 = {
  code: SemanticPersistenceRouteGateBlockerCodeV0;
  severity: "info" | "warning" | "blocking";
  message: string;
};

export type SemanticPersistenceRouteGateRequestV0 = {
  requestedIntent: SemanticPersistenceRouteIntentV0;
  requestedTargetKey: string | null;
  requestedActionKey: string | null;
  authenticatedUserId: string | null;
  actorId: string | null;
  rlsVerificationToken: string | null;
  userConfirmed: boolean;
  explicitWriteExecutionEnabled: boolean;
  sandboxContractOnly: boolean;
};

export type SemanticPersistenceRouteGateDecisionV0 = {
  policy: SemanticPersistenceRouteGatePolicyV0;
  mode: SemanticPersistenceRouteGateModeV0;
  request: SemanticPersistenceRouteGateRequestV0;
  canExecuteRouteNow: false;
  canWriteNow: false;
  wouldWriteNow: false;
  sqlAllowedNow: false;
  supabaseInsertAllowedNow: false;
  canCreateActivityEventNow: false;
  canCreateCategoryResolutionNow: false;
  canCreateValueObjectNow: false;
  canCreateActivityValueObjectLinkNow: false;
  canCreateStateDeltaNow: false;
  canCreateStateFactNow: false;
  canCreateStateSnapshotNow: false;
  matchedPreviewTarget: {
    found: boolean;
    targetKey: string | null;
    targetType: string | null;
    status: string | null;
    reason: string | null;
  };
  blockers: SemanticPersistenceRouteGateBlockerV0[];
  requiredBeforeRealPersistence: string[];
  allowedFutureWriteKinds: string[];
  forbiddenWriteKinds: string[];
  safetyNotes: string[];
};

export type BuildSemanticPersistenceRouteGateV0Params = {
  preview: SemanticPreviewPipelineResultV0;
  requestedIntent?: SemanticPersistenceRouteIntentV0 | null;
  requestedTargetKey?: string | null;
  requestedActionKey?: string | null;
  authenticatedUserId?: string | null;
  actorId?: string | null;
  rlsVerificationToken?: string | null;
  userConfirmed?: boolean | null;
  explicitWriteExecutionEnabled?: boolean | null;
  sandboxContractOnly?: boolean | null;
};

function normalizeIntent(
  value: SemanticPersistenceRouteIntentV0 | null | undefined
): SemanticPersistenceRouteIntentV0 {
  if (
    value === "persist_activity_event" ||
    value === "persist_category_resolution" ||
    value === "persist_value_object_candidate" ||
    value === "persist_activity_value_object_link" ||
    value === "persist_state_delta_candidate" ||
    value === "execute_review_action"
  ) {
    return value;
  }

  return "unknown";
}

function addBlockerIfMissing(
  blockers: SemanticPersistenceRouteGateBlockerV0[],
  blocker: SemanticPersistenceRouteGateBlockerV0
): void {
  if (blockers.some((item) => item.code === blocker.code)) {
    return;
  }

  blockers.push(blocker);
}

function findMatchedPreviewTarget(params: {
  previewGate: SemanticPersistenceGateDecisionV0;
  requestedTargetKey: string | null;
  requestedActionKey: string | null;
}) {
  const lookupKey = params.requestedActionKey ?? params.requestedTargetKey;

  if (!lookupKey) {
    return {
      found: false,
      targetKey: null,
      targetType: null,
      status: null,
      reason: null,
    };
  }

  const allTargets = [
    ...params.previewGate.eligibleFutureTargets,
    ...params.previewGate.blockedNowTargets,
  ];

  const match = allTargets.find((target) => target.targetKey === lookupKey);

  if (!match) {
    return {
      found: false,
      targetKey: lookupKey,
      targetType: null,
      status: null,
      reason: null,
    };
  }

  return {
    found: true,
    targetKey: match.targetKey,
    targetType: match.targetType,
    status: match.status,
    reason: match.reason,
  };
}

export function buildSemanticPersistenceRouteGateV0(
  params: BuildSemanticPersistenceRouteGateV0Params
): SemanticPersistenceRouteGateDecisionV0 {
  const requestedIntent = normalizeIntent(params.requestedIntent);
  const requestedTargetKey = params.requestedTargetKey?.trim() || null;
  const requestedActionKey = params.requestedActionKey?.trim() || null;
  const authenticatedUserId = params.authenticatedUserId?.trim() || null;
  const actorId = params.actorId?.trim() || null;
  const rlsVerificationToken = params.rlsVerificationToken?.trim() || null;
  const userConfirmed = params.userConfirmed === true;
  const explicitWriteExecutionEnabled =
    params.explicitWriteExecutionEnabled === true;
  const sandboxContractOnly = params.sandboxContractOnly !== false;

  const request: SemanticPersistenceRouteGateRequestV0 = {
    requestedIntent,
    requestedTargetKey,
    requestedActionKey,
    authenticatedUserId,
    actorId,
    rlsVerificationToken,
    userConfirmed,
    explicitWriteExecutionEnabled,
    sandboxContractOnly,
  };

  const blockers: SemanticPersistenceRouteGateBlockerV0[] = [];

  addBlockerIfMissing(blockers, {
    code: "contract_only_route",
    severity: "blocking",
    message:
      "This route gate is a contract-only preview and is not allowed to write.",
  });

  addBlockerIfMissing(blockers, {
    code: "debug_route_must_not_write",
    severity: "blocking",
    message:
      "Debug semantic routes must not execute SQL, Supabase insert/update or state persistence.",
  });

  if (!explicitWriteExecutionEnabled) {
    addBlockerIfMissing(blockers, {
      code: "explicit_write_execution_disabled",
      severity: "blocking",
      message:
        "The request did not explicitly enable write execution. This is required for any future real persistence route.",
    });
  }

  if (params.preview.persistenceGate.canPersistNow !== false) {
    addBlockerIfMissing(blockers, {
      code: "preview_gate_blocks_persistence",
      severity: "blocking",
      message:
        "Preview persistence gate must remain canPersistNow=false in the current read-only pipeline.",
    });
  } else {
    addBlockerIfMissing(blockers, {
      code: "preview_gate_blocks_persistence",
      severity: "blocking",
      message:
        "Preview persistence gate blocks persistence by design.",
    });
  }

  if (requestedIntent === "unknown") {
    addBlockerIfMissing(blockers, {
      code: "missing_requested_intent",
      severity: "blocking",
      message:
        "A future real route must specify the requested persistence intent.",
    });
  }

  if (!requestedTargetKey && !requestedActionKey) {
    addBlockerIfMissing(blockers, {
      code: "missing_requested_target_key",
      severity: "blocking",
      message:
        "A future real route must specify requestedTargetKey or requestedActionKey.",
    });
  }

  if (!authenticatedUserId) {
    addBlockerIfMissing(blockers, {
      code: "missing_authenticated_user_id",
      severity: "blocking",
      message:
        "A future real route must have authenticated user identity from server-side auth context.",
    });
  }

  if (!actorId) {
    addBlockerIfMissing(blockers, {
      code: "missing_actor_id",
      severity: "blocking",
      message:
        "A future real route must resolve an actor_id/owner before persistence.",
    });
  }

  if (!rlsVerificationToken) {
    addBlockerIfMissing(blockers, {
      code: "missing_rls_verification_token",
      severity: "blocking",
      message:
        "A future real route must verify RLS/ownership context before persistence.",
    });
  }

  if (!userConfirmed) {
    addBlockerIfMissing(blockers, {
      code: "missing_user_confirmation",
      severity: "blocking",
      message:
        "A future real route must receive explicit user confirmation for semantic persistence.",
    });
  }

  if (
    requestedIntent === "persist_state_delta_candidate" &&
    requestedTargetKey?.includes(":state-fact")
  ) {
    addBlockerIfMissing(blockers, {
      code: "state_fact_persistence_forbidden",
      severity: "blocking",
      message:
        "State facts/snapshots must not be created from semantic preview candidates.",
    });
  }

  const matchedPreviewTarget = findMatchedPreviewTarget({
    previewGate: params.preview.persistenceGate,
    requestedTargetKey,
    requestedActionKey,
  });

  const mode: SemanticPersistenceRouteGateModeV0 =
    sandboxContractOnly || blockers.length > 0
      ? "contract_only_no_write"
      : "eligible_for_future_write_route_after_security_review";

  return {
    policy: "semantic_persistence_route_gate_contract_v0",
    mode,
    request,
    canExecuteRouteNow: false,
    canWriteNow: false,
    wouldWriteNow: false,
    sqlAllowedNow: false,
    supabaseInsertAllowedNow: false,
    canCreateActivityEventNow: false,
    canCreateCategoryResolutionNow: false,
    canCreateValueObjectNow: false,
    canCreateActivityValueObjectLinkNow: false,
    canCreateStateDeltaNow: false,
    canCreateStateFactNow: false,
    canCreateStateSnapshotNow: false,
    matchedPreviewTarget,
    blockers,
    requiredBeforeRealPersistence: [
      "Use a non-debug route dedicated to semantic persistence.",
      "Read authenticated user from server-side auth context, not from client JSON.",
      "Resolve actor_id / owner context server-side.",
      "Verify RLS and ownership with runtime checks.",
      "Require explicit user confirmation for the selected semantic target.",
      "Persist raw Activity Event before derived semantic links.",
      "Persist resolved category decisions only through resolver/governance rules.",
      "Create or link Value Objects only after scope and owner are known.",
      "Create state deltas only as deltas, never as state facts or snapshots from preview.",
      "Keep audit rows for every semantic persistence decision.",
    ],
    allowedFutureWriteKinds: [
      "activity_event_insert_after_gate",
      "category_resolution_decision_after_gate",
      "value_object_find_or_create_after_gate",
      "activity_value_object_link_after_gate",
      "state_delta_candidate_after_gate",
      "review_action_audit_after_gate",
    ],
    forbiddenWriteKinds: [
      "state_fact_from_preview_candidate",
      "state_snapshot_from_preview_candidate",
      "global_active_category_from_ai_without_governance",
      "external_ontology_candidate_as_active_category_without_review",
      "client_supplied_user_id_as_owner_without_server_auth",
      "debug_route_sql_execution",
    ],
    safetyNotes: [
      "This contract intentionally cannot write.",
      "Even when all future conditions are supplied, this debug contract must keep canWriteNow=false.",
      "The next implementation may create a real gated route skeleton, but it must start with no-write dry-run mode.",
    ],
  };
}
