import type {
  RollbackAuditEventPayload,
  RollbackStateFactControlledInput,
  RollbackStateFactUpdatePayload,
  RollbackTargetStateFact,
} from "./types";

export type BuildRollbackPayloadsInput = {
  input: RollbackStateFactControlledInput;
  targetStateFact: RollbackTargetStateFact;
  userId: string;
  actorId?: string | null;
  rollbackAtIso: string;
  auditEvidenceJson?: Record<string, unknown> | null;
  auditMetadataJson?: Record<string, unknown> | null;
};

export type BuildRollbackPayloadsResult = {
  stateFactUpdatePayload: RollbackStateFactUpdatePayload;
  auditEventPayload: RollbackAuditEventPayload;
};

const ROLLED_BACK_CORRECTION_STATUS = "rolled_back" as const;
const ROLLED_BACK_ACTION_TYPE = "rolled_back" as const;

function asPlainRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function requireNonEmptyString(value: string, fieldName: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  return trimmed;
}

function buildRollbackMetadata(
  input: RollbackStateFactControlledInput,
  rollbackAtIso: string,
): Record<string, unknown> {
  return {
    requestedAt: rollbackAtIso,
    reason: requireNonEmptyString(input.reason, "reason"),
    requestTraceId: requireNonEmptyString(input.requestTraceId, "requestTraceId"),
    idempotencyKey: requireNonEmptyString(input.idempotencyKey, "idempotencyKey"),
    sourceRoute: requireNonEmptyString(input.sourceRoute, "sourceRoute"),
    helperVersion: requireNonEmptyString(input.helperVersion, "helperVersion"),
    contractVersion: requireNonEmptyString(input.contractVersion, "contractVersion"),
    d4GateVersion: requireNonEmptyString(input.d4GateVersion, "d4GateVersion"),
  };
}

export function buildRollbackStateFactUpdatePayload(params: {
  input: RollbackStateFactControlledInput;
  targetStateFact: RollbackTargetStateFact;
  rollbackAtIso: string;
}): RollbackStateFactUpdatePayload {
  const { input, targetStateFact, rollbackAtIso } = params;

  const previousMetadata = asPlainRecord(targetStateFact.metadataJson);

  return {
    correction_status: ROLLED_BACK_CORRECTION_STATUS,
    valid_to: requireNonEmptyString(rollbackAtIso, "rollbackAtIso"),
    metadata_json: {
      ...previousMetadata,
      rollback: buildRollbackMetadata(input, rollbackAtIso),
    },
    updated_at: rollbackAtIso,
  };
}

export function buildRollbackAuditEventPayload(params: BuildRollbackPayloadsInput): RollbackAuditEventPayload {
  const {
    input,
    targetStateFact,
    userId,
    actorId = null,
    rollbackAtIso,
    auditEvidenceJson = null,
    auditMetadataJson = null,
  } = params;

  return {
    user_id: requireNonEmptyString(userId, "userId"),
    actor_id: actorId,
    value_object_id: requireNonEmptyString(input.valueObjectId, "valueObjectId"),
    state_fact_id: requireNonEmptyString(input.stateFactId, "stateFactId"),
    related_state_fact_id: null,
    dimension_key: requireNonEmptyString(targetStateFact.dimensionKey, "dimensionKey"),
    action_type: ROLLED_BACK_ACTION_TYPE,
    previous_correction_status: targetStateFact.correctionStatus,
    new_correction_status: ROLLED_BACK_CORRECTION_STATUS,
    reason: requireNonEmptyString(input.reason, "reason"),
    request_trace_id: requireNonEmptyString(input.requestTraceId, "requestTraceId"),
    idempotency_key: requireNonEmptyString(input.idempotencyKey, "idempotencyKey"),
    source_route: requireNonEmptyString(input.sourceRoute, "sourceRoute"),
    helper_version: requireNonEmptyString(input.helperVersion, "helperVersion"),
    contract_version: requireNonEmptyString(input.contractVersion, "contractVersion"),
    d4_gate_version: requireNonEmptyString(input.d4GateVersion, "d4GateVersion"),
    previous_valid_to: targetStateFact.validTo,
    new_valid_to: rollbackAtIso,
    evidence_json: asPlainRecord(auditEvidenceJson),
    metadata_json: {
      ...asPlainRecord(auditMetadataJson),
      rollback: buildRollbackMetadata(input, rollbackAtIso),
      targetStateFact: {
        id: targetStateFact.id,
        valueObjectId: targetStateFact.valueObjectId,
        dimensionKey: targetStateFact.dimensionKey,
        previousCorrectionStatus: targetStateFact.correctionStatus,
        previousValidTo: targetStateFact.validTo,
      },
    },
  };
}

export function buildRollbackPayloads(params: BuildRollbackPayloadsInput): BuildRollbackPayloadsResult {
  return {
    stateFactUpdatePayload: buildRollbackStateFactUpdatePayload({
      input: params.input,
      targetStateFact: params.targetStateFact,
      rollbackAtIso: params.rollbackAtIso,
    }),
    auditEventPayload: buildRollbackAuditEventPayload(params),
  };
}
