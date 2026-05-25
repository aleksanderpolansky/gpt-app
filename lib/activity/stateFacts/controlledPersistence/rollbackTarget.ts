/**
 * GPT-APP / AI-NAVIGATOR
 * P4.10.0-C8-I-D4-L-L-D
 *
 * Controlled state fact rollback - rollback target resolver.
 *
 * Status:
 * - ROLLBACK TARGET RESOLVER ONLY
 * - READ-ONLY DATABASE LOOKUP ONLY
 * - NO ROUTE
 * - NO DATABASE WRITE
 * - NO STATE FACT UPDATE
 * - NO AUDIT EVENT INSERT
 * - NO RUNTIME ROLLBACK
 *
 * Core rules preserved:
 * - A rollback target must be resolved by stateFactId + valueObjectId together.
 * - This helper must not authorize by stateFactId alone.
 * - This helper only normalizes the rollback target state fact.
 * - This helper does not create, update, or delete state facts.
 * - This helper does not insert audit events.
 */

import { supabase } from "../../../supabase";

import type {
  RollbackTargetLookupInput,
  RollbackTargetLookupResult,
  RollbackTargetStateFact,
} from "./types";

type StateFactRow = {
  id?: unknown;
  user_id?: unknown;
  value_object_id?: unknown;
  dimension_id?: unknown;
  dimension_key?: unknown;
  correction_status?: unknown;
  valid_from?: unknown;
  valid_to?: unknown;
  metadata_json?: unknown;
  evidence_json?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

const STATE_FACT_SELECT_COLUMNS = [
  "id",
  "user_id",
  "value_object_id",
  "dimension_id",
  "dimension_key",
  "correction_status",
  "valid_from",
  "valid_to",
  "metadata_json",
  "evidence_json",
  "created_at",
  "updated_at",
].join(",");

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requireString(value: unknown, fieldName: string): string {
  const trimmed = trimOrNull(value);

  if (!trimmed) {
    throw new Error(`Rollback target field ${fieldName} is required.`);
  }

  return trimmed;
}

function asPlainRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function validateInput(input: RollbackTargetLookupInput): string | null {
  if (!trimOrNull(input.stateFactId)) {
    return "Rollback target stateFactId is required.";
  }

  if (!trimOrNull(input.valueObjectId)) {
    return "Rollback target valueObjectId is required.";
  }

  return null;
}

function normalizeTargetStateFact(row: StateFactRow): RollbackTargetStateFact {
  return {
    id: requireString(row.id, "id"),
    userId: requireString(row.user_id, "user_id"),
    valueObjectId: requireString(row.value_object_id, "value_object_id"),
    dimensionId: trimOrNull(row.dimension_id),
    dimensionKey: requireString(row.dimension_key, "dimension_key"),
    correctionStatus: trimOrNull(row.correction_status),
    validFrom: trimOrNull(row.valid_from),
    validTo: trimOrNull(row.valid_to),
    metadataJson: asPlainRecord(row.metadata_json),
    evidenceJson: asPlainRecord(row.evidence_json),
    createdAt: trimOrNull(row.created_at),
    updatedAt: trimOrNull(row.updated_at),
  };
}

function buildNotFound(reason: string): RollbackTargetLookupResult {
  return {
    ok: false,
    status: "rejected_fact_not_found",
    reason,
  };
}

function buildMismatch(reason: string): RollbackTargetLookupResult {
  return {
    ok: false,
    status: "rejected_value_object_mismatch",
    reason,
  };
}

function buildError(reason: string): RollbackTargetLookupResult {
  return {
    ok: false,
    status: "error",
    reason,
  };
}

/**
 * Resolves a rollback target state fact by stateFactId + valueObjectId together.
 *
 * This helper intentionally does not perform a stateFactId-alone lookup.
 * If no row is returned for the pair, the helper rejects the target.
 */
export async function resolveRollbackTargetStateFact(
  input: RollbackTargetLookupInput
): Promise<RollbackTargetLookupResult> {
  const validationError = validateInput(input);

  if (validationError) {
    return buildError(validationError);
  }

  const stateFactId = input.stateFactId.trim();
  const valueObjectId = input.valueObjectId.trim();

  const { data: stateFactData, error: stateFactError } = await supabase
    .from("value_object_state_facts")
    .select(STATE_FACT_SELECT_COLUMNS)
    .eq("id", stateFactId)
    .eq("value_object_id", valueObjectId)
    .limit(1)
    .maybeSingle();

  if (stateFactError) {
    return buildError("Rollback target lookup failed.");
  }

  if (!stateFactData) {
    return buildNotFound(
      "Rollback target was not found for the provided stateFactId + valueObjectId pair. No stateFactId-alone authorization was performed."
    );
  }

  const stateFact = normalizeTargetStateFact(stateFactData as StateFactRow);

  if (stateFact.id !== stateFactId) {
    return buildError("Rollback target returned an unexpected state fact id.");
  }

  if (stateFact.valueObjectId !== valueObjectId) {
    return buildMismatch("Rollback target valueObjectId mismatch.");
  }

  return {
    ok: true,
    stateFact,
  };
}
