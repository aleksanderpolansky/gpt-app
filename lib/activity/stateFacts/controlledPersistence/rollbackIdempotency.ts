/**
 * GPT-APP / AI-NAVIGATOR
 * P4.10.0-C8-I-D4-L-L-C
 *
 * Controlled state fact rollback - rollback idempotency helper.
 *
 * Status:
 * - ROLLBACK IDEMPOTENCY HELPER ONLY
 * - READ-ONLY DATABASE LOOKUP ONLY
 * - NO ROUTE
 * - NO DATABASE WRITE
 * - NO STATE FACT UPDATE
 * - NO AUDIT EVENT INSERT
 * - NO RUNTIME ROLLBACK
 *
 * Core rules preserved:
 * - Idempotency lookup is not rollback.
 * - Duplicate rollback prevention must happen before any future update/insert.
 * - This helper reads the audit table only to prevent duplicate rollback effects.
 * - This helper does not create, update, or delete state facts.
 * - This helper does not insert audit events.
 */

import { supabase } from "../../../supabase";

import type {
  RollbackIdempotencyLookupInput,
  RollbackIdempotencyLookupResult,
} from "./types";

type RollbackAuditIdempotencyRow = {
  id?: unknown;
  [key: string]: unknown;
};

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildNotFound(): RollbackIdempotencyLookupResult {
  return {
    found: false,
    status: "not_found",
  };
}

function buildFound(auditEventId: string): RollbackIdempotencyLookupResult {
  return {
    found: true,
    auditEventId,
    status: "found",
  };
}

function buildError(error: string): RollbackIdempotencyLookupResult {
  return {
    found: false,
    status: "error",
    error,
  };
}

function validateInput(input: RollbackIdempotencyLookupInput): string | null {
  if (!isNonEmptyString(input.userId)) {
    return "Rollback idempotency userId is required.";
  }

  if (!isNonEmptyString(input.stateFactId)) {
    return "Rollback idempotency stateFactId is required.";
  }

  if (input.actionType !== "rolled_back") {
    return "Rollback idempotency actionType must be rolled_back.";
  }

  if (!isNonEmptyString(input.idempotencyKey)) {
    return "Rollback idempotency idempotencyKey is required.";
  }

  return null;
}

/**
 * Checks whether a successful rollback audit event already exists for the same
 * user_id + state_fact_id + action_type + idempotency_key.
 *
 * This function is intentionally read-only.
 */
export async function checkRollbackIdempotency(
  input: RollbackIdempotencyLookupInput
): Promise<RollbackIdempotencyLookupResult> {
  const validationError = validateInput(input);

  if (validationError) {
    return buildError(validationError);
  }

  const { data: existingAuditEventData, error: existingAuditEventError } =
    await supabase
      .from("value_object_state_fact_audit_events")
      .select("id")
      .eq("user_id", input.userId)
      .eq("state_fact_id", input.stateFactId)
      .eq("action_type", input.actionType)
      .eq("idempotency_key", input.idempotencyKey)
      .limit(1)
      .maybeSingle();

  if (existingAuditEventError) {
    return buildError("Rollback idempotency lookup failed.");
  }

  const existingAuditEvent =
    existingAuditEventData as RollbackAuditIdempotencyRow | null;

  if (!existingAuditEvent) {
    return buildNotFound();
  }

  const existingAuditEventId = trimOrNull(existingAuditEvent.id);

  if (!existingAuditEventId) {
    return buildError("Existing rollback audit event has no valid identifier.");
  }

  return buildFound(existingAuditEventId);
}
