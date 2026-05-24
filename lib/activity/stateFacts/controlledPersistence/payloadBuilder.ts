/**
 * GPT-APP / AI-NAVIGATOR
 * P4.10.0-C8-I-D4-F-B-D-F
 *
 * Controlled state fact persistence - state fact insert payload builder helper.
 *
 * Status:
 * - STATE FACT INSERT PAYLOAD BUILDER ONLY
 * - NO ROUTE
 * - NO DATABASE READ
 * - NO DATABASE WRITE
 * - NO STATE FACT STORAGE TABLE ACCESS
 * - NO STATE FACT CREATED
 *
 * Core rules preserved:
 * - A shadow candidate is not a state fact.
 * - An insertDraft is not a state fact.
 * - This helper builds a candidate-derived insert payload only after validation accepted.
 * - This helper does not perform idempotency checks.
 * - This helper does not persist state facts.
 */

import type {
  JsonObject,
  StateFactCandidateInput,
  StateFactPersistenceErrorCode,
  StateFactResolvedContext,
  StateFactValidationResult,
  ValueObjectStateFactInsertPayload,
} from "./types";

export type BuildValueObjectStateFactInsertPayloadInput = {
  candidateTraceId: string;
  sourceRoute: string;
  idempotencyKey: string;
  resolvedContext: StateFactResolvedContext;
  candidate: StateFactCandidateInput;
  validationResult: StateFactValidationResult;
  contractVersion?: string;
  helperVersion?: string;
  d4GateVersion?: string;
};

export type BuildValueObjectStateFactInsertPayloadSuccess = {
  ok: true;
  insertPayload: ValueObjectStateFactInsertPayload;
  errorCode: null;
  safeMessage: null;
};

export type BuildValueObjectStateFactInsertPayloadFailure = {
  ok: false;
  insertPayload: null;
  errorCode: StateFactPersistenceErrorCode;
  safeMessage: string;
};

export type BuildValueObjectStateFactInsertPayloadResult =
  | BuildValueObjectStateFactInsertPayloadSuccess
  | BuildValueObjectStateFactInsertPayloadFailure;

const DEFAULT_CONTRACT_VERSION = "D4-C-D4-F-A-controlled-state-fact-contract";
const DEFAULT_HELPER_VERSION = "P4.10.0-C8-I-D4-F-B-D-F-v1";
const DEFAULT_D4_GATE_VERSION = "D4-F-controlled-persistence-gate";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function trimOrNull(value: unknown): string | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  return value.trim();
}

function isJsonObjectWithKeys(value: JsonObject): boolean {
  return Object.keys(value).length > 0;
}

function readStringProperty(source: JsonObject, key: string): string | null {
  const value = source[key];

  if (!isNonEmptyString(value)) {
    return null;
  }

  return value.trim();
}

function buildFailure(
  errorCode: StateFactPersistenceErrorCode,
  safeMessage: string
): BuildValueObjectStateFactInsertPayloadFailure {
  return {
    ok: false,
    insertPayload: null,
    errorCode,
    safeMessage,
  };
}

function buildSuccess(
  insertPayload: ValueObjectStateFactInsertPayload
): BuildValueObjectStateFactInsertPayloadSuccess {
  return {
    ok: true,
    insertPayload,
    errorCode: null,
    safeMessage: null,
  };
}

function resolveIdempotencyKey(
  inputIdempotencyKey: string,
  metadataJson: JsonObject
): string | null {
  const normalizedInputKey = trimOrNull(inputIdempotencyKey);

  if (normalizedInputKey) {
    return normalizedInputKey;
  }

  return readStringProperty(metadataJson, "idempotency_key");
}

function resolveContractVersion(input: BuildValueObjectStateFactInsertPayloadInput): string {
  return trimOrNull(input.contractVersion) ?? DEFAULT_CONTRACT_VERSION;
}

function resolveHelperVersion(input: BuildValueObjectStateFactInsertPayloadInput): string {
  return trimOrNull(input.helperVersion) ?? DEFAULT_HELPER_VERSION;
}

function resolveD4GateVersion(input: BuildValueObjectStateFactInsertPayloadInput): string {
  return trimOrNull(input.d4GateVersion) ?? DEFAULT_D4_GATE_VERSION;
}

/**
 * Builds a ValueObjectStateFactInsertPayload after server-side validation has accepted a candidate.
 *
 * This helper is intentionally pure:
 * - no database reads;
 * - no database writes;
 * - no route parsing;
 * - no idempotency lookup;
 * - no persistence attempt.
 */
export function buildValueObjectStateFactInsertPayload(
  input: BuildValueObjectStateFactInsertPayloadInput
): BuildValueObjectStateFactInsertPayloadResult {
  const candidateTraceId = trimOrNull(input.candidateTraceId);
  const sourceRoute = trimOrNull(input.sourceRoute);

  if (!candidateTraceId) {
    return buildFailure(
      "SOURCE_EVIDENCE_MISSING",
      "Candidate trace id is required before an insert payload can be built."
    );
  }

  if (!sourceRoute) {
    return buildFailure(
      "SOURCE_EVIDENCE_MISSING",
      "Source route is required before an insert payload can be built."
    );
  }

  if (!input.validationResult.ok) {
    if (input.validationResult.decision === "shadow_only") {
      return buildFailure(
        "SHADOW_ONLY_NOT_PERSISTABLE",
        "Shadow-only candidates cannot be converted into insert payloads."
      );
    }

    return buildFailure(
      input.validationResult.rejectionCode,
      "Rejected candidates cannot be converted into insert payloads."
    );
  }

  const idempotencyKey = resolveIdempotencyKey(
    input.idempotencyKey,
    input.candidate.metadataJson
  );

  if (!idempotencyKey) {
    return buildFailure(
      "IDEMPOTENCY_KEY_MISSING",
      "Idempotency key is required before an insert payload can be built."
    );
  }

  if (!isJsonObjectWithKeys(input.candidate.proposedValue)) {
    return buildFailure(
      "SOURCE_EVIDENCE_MISSING",
      "Candidate proposed value must be a non-empty object before payload building."
    );
  }

  if (!isJsonObjectWithKeys(input.candidate.evidenceJson)) {
    return buildFailure(
      "SOURCE_EVIDENCE_MISSING",
      "Candidate evidence must be a non-empty object before payload building."
    );
  }

  const { authenticatedActor, targetValueObject, dimension } = input.resolvedContext;

  const insertPayload: ValueObjectStateFactInsertPayload = {
    user_id: authenticatedActor.appUserId,
    value_object_id: targetValueObject.valueObjectId,
    dimension_id: dimension.dimensionId,
    dimension_key: dimension.dimensionKey,
    value_json: input.candidate.proposedValue,
    source_type: input.candidate.sourceType,
    source_id: input.candidate.sourceId,
    confidence: input.candidate.confidence,
    evidence_json: input.candidate.evidenceJson,
    claim_strength: input.candidate.claimStrength,
    privacy_level: input.candidate.privacyLevel,
    valid_from: input.candidate.validityWindow.validFrom,
    valid_to: input.candidate.validityWindow.validTo,
    correction_status: "active",
    metadata_json: {
      ...input.candidate.metadataJson,
      rollbackable: true,
      idempotency_key: idempotencyKey,
      contract_version: resolveContractVersion(input),
      helper_version: resolveHelperVersion(input),
      source_route: sourceRoute,
      candidate_trace_id: candidateTraceId,
      created_from_candidate: true,
      not_created_by_ai_directly: true,
      d4_gate_version: resolveD4GateVersion(input),
    },
  };

  return buildSuccess(insertPayload);
}
