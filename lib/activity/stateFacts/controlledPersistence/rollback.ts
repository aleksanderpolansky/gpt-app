/**
 * GPT-APP / AI-NAVIGATOR
 * P4.10.0-C8-I-D4-L-L-J
 *
 * Controlled state fact rollback - runtime helper.
 *
 * Status:
 * - ROLLBACK HELPER ONLY
 * - CALLS ATOMIC RPC ONLY
 * - NO ROUTE
 * - NO RUNTIME PROOF IN THIS STEP
 * - NO NON-ATOMIC UPDATE + INSERT
 * - NO DIRECT STATE FACT UPDATE
 * - NO DIRECT AUDIT EVENT INSERT
 *
 * Core rules preserved:
 * - Rollback is not delete.
 * - Rollback must not be implemented as Supabase JS update + insert.
 * - Rollback must call the narrow atomic RPC.
 * - Rollback target must be resolved by stateFactId + valueObjectId.
 * - Idempotency must be checked before RPC and enforced again inside RPC.
 */

import { supabase } from "../../../supabase";

import { checkRollbackIdempotency } from "./rollbackIdempotency";
import { resolveRollbackTargetStateFact } from "./rollbackTarget";

import type {
  RollbackIdempotencyLookupResult,
  RollbackStateFactControlledInput,
  RollbackStateFactControlledResult,
  RollbackTargetLookupResult,
  RollbackTargetStateFact,
} from "./types";

const ROLLBACK_RPC_NAME = "rollback_value_object_state_fact_controlled";
const ROLLBACK_ACTION_TYPE = "rolled_back";
const DEFAULT_SOURCE_ROUTE = "internal:controlled-state-fact-rollback";
const DEFAULT_HELPER_VERSION = "P4.10.0-C8-I-D4-L-L-J";
const DEFAULT_CONTRACT_VERSION = "P4.10.0-C8-I-D4-L-L-J";
const DEFAULT_D4_GATE_VERSION = "P4.10.0-C8-I-D4-L-L-J";

type PlainRecord = Record<string, unknown>;

type RpcClient = {
  rpc: (
    functionName: string,
    args: PlainRecord
  ) => Promise<{
    data: unknown;
    error: { message?: string; code?: string; details?: string } | null;
  }>;
};

type NormalizedRollbackInput = {
  userId: string;
  actorId: string | null;
  valueObjectId: string;
  stateFactId: string;
  reason: string;
  requestTraceId: string;
  idempotencyKey: string;
  sourceRoute: string;
  helperVersion: string;
  contractVersion: string;
  d4GateVersion: string;
  rollbackAt: string;
  evidenceJson: PlainRecord;
  metadataJson: PlainRecord;
};

function asPlainRecord(value: unknown): PlainRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as PlainRecord;
}

function readString(source: PlainRecord, key: string): string | null {
  const value = source[key];

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNullableString(source: PlainRecord, key: string): string | null {
  const value = source[key];

  if (value === null || typeof value === "undefined") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeInput(
  input: RollbackStateFactControlledInput
):
  | { ok: true; value: NormalizedRollbackInput }
  | { ok: false; reason: string } {
  const source = asPlainRecord(input);

  const userId = readString(source, "userId");
  if (!userId) {
    return { ok: false, reason: "userId is required." };
  }

  const valueObjectId = readString(source, "valueObjectId");
  if (!valueObjectId) {
    return { ok: false, reason: "valueObjectId is required." };
  }

  const stateFactId = readString(source, "stateFactId");
  if (!stateFactId) {
    return { ok: false, reason: "stateFactId is required." };
  }

  const reason = readString(source, "reason");
  if (!reason) {
    return { ok: false, reason: "reason is required." };
  }

  const requestTraceId = readString(source, "requestTraceId");
  if (!requestTraceId) {
    return { ok: false, reason: "requestTraceId is required." };
  }

  const idempotencyKey = readString(source, "idempotencyKey");
  if (!idempotencyKey) {
    return { ok: false, reason: "idempotencyKey is required." };
  }

  const rollbackAt = readString(source, "rollbackAt");
  if (!rollbackAt) {
    return { ok: false, reason: "rollbackAt is required." };
  }

  return {
    ok: true,
    value: {
      userId,
      actorId: readNullableString(source, "actorId"),
      valueObjectId,
      stateFactId,
      reason,
      requestTraceId,
      idempotencyKey,
      sourceRoute: readString(source, "sourceRoute") ?? DEFAULT_SOURCE_ROUTE,
      helperVersion: readString(source, "helperVersion") ?? DEFAULT_HELPER_VERSION,
      contractVersion:
        readString(source, "contractVersion") ?? DEFAULT_CONTRACT_VERSION,
      d4GateVersion:
        readString(source, "d4GateVersion") ?? DEFAULT_D4_GATE_VERSION,
      rollbackAt,
      evidenceJson: asPlainRecord(source.evidenceJson),
      metadataJson: asPlainRecord(source.metadataJson),
    },
  };
}

function toRollbackResult(value: PlainRecord): RollbackStateFactControlledResult {
  return value as RollbackStateFactControlledResult;
}

function buildRejectedResult(
  status: string,
  reason: string,
  input?: Partial<NormalizedRollbackInput>
): RollbackStateFactControlledResult {
  return toRollbackResult({
    ok: false,
    status,
    reason,
    stateFactId: input?.stateFactId ?? null,
    valueObjectId: input?.valueObjectId ?? null,
    auditEventId: null,
    stateFactsUpdated: 0,
    auditEventsCreated: 0,
  });
}

function normalizeTargetResult(
  result: RollbackTargetLookupResult
):
  | { ok: true; stateFact: RollbackTargetStateFact }
  | { ok: false; reason: string; status: string } {
  const asRecordResult = result as unknown as PlainRecord;

  if (asRecordResult.ok !== true) {
    return {
      ok: false,
      reason:
        typeof asRecordResult.reason === "string"
          ? asRecordResult.reason
          : "Rollback target lookup rejected.",
      status:
        typeof asRecordResult.status === "string"
          ? asRecordResult.status
          : "rejected_fact_not_found",
    };
  }

  const stateFact = asRecordResult.stateFact;

  if (!stateFact || typeof stateFact !== "object") {
    return {
      ok: false,
      reason: "Rollback target lookup returned no normalized state fact.",
      status: "error",
    };
  }

  return {
    ok: true,
    stateFact: stateFact as RollbackTargetStateFact,
  };
}

function normalizeIdempotencyResult(
  result: RollbackIdempotencyLookupResult
):
  | { ok: true; alreadyRolledBack: true; auditEventId: string }
  | { ok: true; alreadyRolledBack: false }
  | { ok: false; reason: string } {
  const asRecordResult = result as unknown as PlainRecord;

  if (asRecordResult.status === "error") {
    return {
      ok: false,
      reason:
        typeof asRecordResult.error === "string"
          ? asRecordResult.error
          : "Rollback idempotency lookup failed.",
    };
  }

  if (asRecordResult.found === true) {
    const auditEventId =
      typeof asRecordResult.auditEventId === "string"
        ? asRecordResult.auditEventId
        : null;

    if (!auditEventId) {
      return {
        ok: false,
        reason: "Rollback idempotency lookup found an audit event without id.",
      };
    }

    return {
      ok: true,
      alreadyRolledBack: true,
      auditEventId,
    };
  }

  return {
    ok: true,
    alreadyRolledBack: false,
  };
}

async function assertPayloadBuilderAvailable(): Promise<void> {
  const payloadBuilderModule = (await import(
    "./rollbackPayloadBuilder"
  )) as PlainRecord;

  if (typeof payloadBuilderModule.buildRollbackPayloads !== "function") {
    throw new Error("Rollback payload builder is not available.");
  }
}

function buildRpcArgs(input: NormalizedRollbackInput): PlainRecord {
  return {
    p_user_id: input.userId,
    p_actor_id: input.actorId,
    p_value_object_id: input.valueObjectId,
    p_state_fact_id: input.stateFactId,
    p_reason: input.reason,
    p_request_trace_id: input.requestTraceId,
    p_idempotency_key: input.idempotencyKey,
    p_source_route: input.sourceRoute,
    p_helper_version: input.helperVersion,
    p_contract_version: input.contractVersion,
    p_d4_gate_version: input.d4GateVersion,
    p_rollback_at: input.rollbackAt,
    p_evidence_json: input.evidenceJson,
    p_metadata_json: input.metadataJson,
  };
}

function normalizeRpcResult(
  rpcResult: unknown,
  fallbackInput: NormalizedRollbackInput
): RollbackStateFactControlledResult {
  const result = asPlainRecord(rpcResult);

  return toRollbackResult({
    ok: result.ok === true,
    status: typeof result.status === "string" ? result.status : "error",
    reason:
      typeof result.reason === "string"
        ? result.reason
        : "Rollback RPC returned an unrecognized result.",
    stateFactId:
      typeof result.stateFactId === "string"
        ? result.stateFactId
        : fallbackInput.stateFactId,
    valueObjectId:
      typeof result.valueObjectId === "string"
        ? result.valueObjectId
        : fallbackInput.valueObjectId,
    auditEventId:
      typeof result.auditEventId === "string" ? result.auditEventId : null,
    stateFactsUpdated:
      typeof result.stateFactsUpdated === "number"
        ? result.stateFactsUpdated
        : 0,
    auditEventsCreated:
      typeof result.auditEventsCreated === "number"
        ? result.auditEventsCreated
        : 0,
  });
}

/**
 * Rolls back one controlled state fact through the atomic database RPC.
 *
 * This helper does not perform a direct Supabase JS update + insert sequence.
 * The only write-capable operation here is a call to the already-applied
 * atomic RPC public.rollback_value_object_state_fact_controlled.
 */
export async function rollbackStateFactControlled(
  input: RollbackStateFactControlledInput
): Promise<RollbackStateFactControlledResult> {
  const normalizedInput = normalizeInput(input);

  if (!normalizedInput.ok) {
    return buildRejectedResult("error", normalizedInput.reason);
  }

  const normalized = normalizedInput.value;

  await assertPayloadBuilderAvailable();

  const targetLookup = await resolveRollbackTargetStateFact({
    stateFactId: normalized.stateFactId,
    valueObjectId: normalized.valueObjectId,
  });

  const normalizedTarget = normalizeTargetResult(targetLookup);

  if (!normalizedTarget.ok) {
    return buildRejectedResult(
      normalizedTarget.status,
      normalizedTarget.reason,
      normalized
    );
  }

  if (normalizedTarget.stateFact.userId !== normalized.userId) {
    return buildRejectedResult(
      "rejected_fact_not_found",
      "Rollback target does not belong to the provided userId.",
      normalized
    );
  }

  const idempotencyLookup = await checkRollbackIdempotency({
    userId: normalized.userId,
    stateFactId: normalized.stateFactId,
    actionType: ROLLBACK_ACTION_TYPE,
    idempotencyKey: normalized.idempotencyKey,
  });

  const normalizedIdempotency =
    normalizeIdempotencyResult(idempotencyLookup);

  if (!normalizedIdempotency.ok) {
    return buildRejectedResult("error", normalizedIdempotency.reason, normalized);
  }

  if (normalizedIdempotency.alreadyRolledBack) {
    return toRollbackResult({
      ok: true,
      status: "already_rolled_back",
      reason: "Matching rollback audit event already exists.",
      stateFactId: normalized.stateFactId,
      valueObjectId: normalized.valueObjectId,
      auditEventId: normalizedIdempotency.auditEventId,
      stateFactsUpdated: 0,
      auditEventsCreated: 0,
    });
  }

  const rpcClient = supabase as unknown as RpcClient;
  const { data, error } = await rpcClient.rpc(
    ROLLBACK_RPC_NAME,
    buildRpcArgs(normalized)
  );

  if (error) {
    return buildRejectedResult(
      "error",
      error.message ?? "Rollback RPC call failed.",
      normalized
    );
  }

  return normalizeRpcResult(data, normalized);
}
