/**
 * GPT-APP / AI-NAVIGATOR
 * P4.10.0-C8-I-D4-F-B-D-G
 *
 * Controlled state fact persistence - state fact idempotency helper.
 *
 * Status:
 * - STATE FACT IDEMPOTENCY HELPER ONLY
 * - READ-ONLY DATABASE LOOKUP ONLY
 * - NO ROUTE
 * - NO DATABASE WRITE
 * - NO STATE FACT INSERT
 * - NO STATE FACT CREATED
 *
 * Core rules preserved:
 * - Idempotency lookup is not persistence.
 * - Duplicate prevention must happen before any future insert.
 * - This helper reads the state fact storage table only to prevent duplicates.
 * - This helper does not create, update, or delete state facts.
 * - This helper does not persist state facts.
 */

import { supabase } from "../../../supabase";

import type {
  StateFactIdempotencyDecision,
  StateFactPersistenceErrorCode,
  UuidString,
  ValueObjectStateFactInsertPayload,
} from "./types";

type StateFactIdempotencyRow = {
  id?: unknown;
  [key: string]: unknown;
};

export type CheckStateFactIdempotencyInput = {
  insertPayload: ValueObjectStateFactInsertPayload;
  idempotencyKey?: string;
};

export type CheckStateFactIdempotencySuccess = {
  ok: true;
  decision: StateFactIdempotencyDecision;
  errorCode: null;
  safeMessage: null;
};

export type CheckStateFactIdempotencyFailure = {
  ok: false;
  decision: null;
  errorCode: StateFactPersistenceErrorCode;
  safeMessage: string;
  stateFactsCreated: 0;
  writesAttempted: false;
};

export type CheckStateFactIdempotencyResult =
  | CheckStateFactIdempotencySuccess
  | CheckStateFactIdempotencyFailure;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function trimOrNull(value: unknown): string | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  return value.trim();
}

function buildFailure(
  errorCode: StateFactPersistenceErrorCode,
  safeMessage: string
): CheckStateFactIdempotencyFailure {
  return {
    ok: false,
    decision: null,
    errorCode,
    safeMessage,
    stateFactsCreated: 0,
    writesAttempted: false,
  };
}

function buildSuccess(
  decision: StateFactIdempotencyDecision
): CheckStateFactIdempotencySuccess {
  return {
    ok: true,
    decision,
    errorCode: null,
    safeMessage: null,
  };
}

function buildNewDecision(): StateFactIdempotencyDecision {
  return {
    status: "new",
    existingStateFactId: null,
    stateFactsCreated: 0,
    writesAttempted: false,
  };
}

function buildAlreadyExistsDecision(
  existingStateFactId: UuidString
): StateFactIdempotencyDecision {
  return {
    status: "already_exists",
    existingStateFactId,
    stateFactsCreated: 0,
    writesAttempted: false,
  };
}

function resolveIdempotencyKey(input: CheckStateFactIdempotencyInput): string | null {
  const explicitKey = trimOrNull(input.idempotencyKey);

  if (explicitKey) {
    return explicitKey;
  }

  return trimOrNull(input.insertPayload.metadata_json.idempotency_key);
}

/**
 * Checks whether a future controlled state fact insert would duplicate an existing active fact.
 *
 * This helper is intentionally read-only:
 * - reads value_object_state_facts by user_id, value_object_id, dimension_key, correction_status, and metadata_json.idempotency_key;
 * - does not insert;
 * - does not update;
 * - does not delete;
 * - does not create a state fact.
 */
export async function checkStateFactIdempotency(
  input: CheckStateFactIdempotencyInput
): Promise<CheckStateFactIdempotencyResult> {
  const idempotencyKey = resolveIdempotencyKey(input);

  if (!idempotencyKey) {
    return buildFailure(
      "IDEMPOTENCY_KEY_MISSING",
      "Idempotency key is required before controlled persistence can be considered."
    );
  }

  const { insertPayload } = input;

  const { data: existingFactData, error: existingFactError } = await supabase
    .from("value_object_state_facts")
    .select("id")
    .eq("user_id", insertPayload.user_id)
    .eq("value_object_id", insertPayload.value_object_id)
    .eq("dimension_key", insertPayload.dimension_key)
    .eq("correction_status", "active")
    .contains("metadata_json", { idempotency_key: idempotencyKey })
    .limit(1)
    .maybeSingle();

  if (existingFactError) {
    return buildFailure(
      "UNKNOWN_ERROR",
      "State fact idempotency lookup failed."
    );
  }

  const existingFact = existingFactData as StateFactIdempotencyRow | null;

  if (!existingFact) {
    return buildSuccess(buildNewDecision());
  }

  const existingStateFactId = trimOrNull(existingFact.id);

  if (!existingStateFactId) {
    return buildFailure(
      "UNKNOWN_ERROR",
      "Existing state fact idempotency row has no valid identifier."
    );
  }

  return buildSuccess(
    buildAlreadyExistsDecision(existingStateFactId as UuidString)
  );
}
