/**
 * GPT-APP / AI-NAVIGATOR
 * P4.10.0-C8-I-D4-F-B-D-H
 *
 * Controlled state fact persistence - controlled persist helper.
 *
 * Status:
 * - CONTROLLED PERSIST HELPER ONLY
 * - NO ROUTE
 * - DATABASE WRITE BEHIND STRICT GATES ONLY
 * - ONE CONTROLLED INSERT ONLY
 * - NO STATE FACT ROUTE CREATED
 *
 * Core rules preserved:
 * - A shadow candidate is not a state fact.
 * - An insertDraft is not a state fact.
 * - AI-only direct persistence remains blocked.
 * - client-provided user_id must never become persisted user_id.
 * - valueObjectId alone is not enough for persistence permission.
 * - Duplicate prevention must happen before any future insert.
 * - This helper does not create an API route.
 */

import { supabase } from "../../../supabase";

import { resolveAuthenticatedStateFactActor } from "./auth";
import { resolveStateFactDimension } from "./dimension";
import { checkStateFactIdempotency } from "./idempotency";
import { buildValueObjectStateFactInsertPayload } from "./payloadBuilder";
import { resolveStateFactTargetValueObject } from "./targetValueObject";
import { validateStateFactCandidateAgainstContract } from "./validator";

import type {
  StateFactPersistenceErrorCode,
  StateFactPersistenceRequest,
  StateFactPersistenceResult,
  StateFactResolvedContext,
  UuidString,
} from "./types";

export type PersistStateFactControlledInput = {
  request: StateFactPersistenceRequest;
  sourceRoute: string;
  contractVersion?: string;
  helperVersion?: string;
  d4GateVersion?: string;
};

type InsertedStateFactRow = {
  id?: unknown;
  [key: string]: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function trimOrNull(value: unknown): string | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  return value.trim();
}

function buildRejected(
  rejectionCode: StateFactPersistenceErrorCode,
  safeMessage: string
): StateFactPersistenceResult {
  return {
    ok: false,
    decision: "rejected",
    rejectionCode,
    stateFactsCreated: 0,
    writesAttempted: false,
    safeMessage,
  };
}

function buildShadowOnlyNotPersisted(): StateFactPersistenceResult {
  return {
    ok: false,
    decision: "shadow_only_not_persisted",
    rejectionCode: "SHADOW_ONLY_NOT_PERSISTABLE",
    stateFactsCreated: 0,
    writesAttempted: false,
  };
}

function buildAlreadyExists(stateFactId: UuidString): StateFactPersistenceResult {
  return {
    ok: true,
    decision: "already_exists",
    stateFactId,
    idempotencyStatus: "duplicate_prevented",
    stateFactsCreated: 0,
    writesAttempted: false,
  };
}

function buildPersisted(
  stateFactId: UuidString,
  contractVersion: string,
  sourceRoute: string
): StateFactPersistenceResult {
  return {
    ok: true,
    decision: "persisted",
    stateFactId,
    idempotencyStatus: "created",
    stateFactsCreated: 1,
    writesAttempted: true,
    contractVersion,
    sourceRoute,
  };
}

function resolveInsertedStateFactId(value: unknown): UuidString | null {
  const insertedRow = value as InsertedStateFactRow | null;
  const stateFactId = trimOrNull(insertedRow?.id);

  if (!stateFactId) {
    return null;
  }

  return stateFactId as UuidString;
}

/**
 * Executes the controlled persistence gate sequence for one state fact candidate.
 *
 * Gate order:
 * 1. authenticated actor;
 * 2. target Value Object access;
 * 3. state dimension resolution;
 * 4. candidate validation;
 * 5. insert payload building;
 * 6. idempotency lookup;
 * 7. one guarded insert into value_object_state_facts.
 *
 * This helper intentionally has no route export.
 */
export async function persistStateFactControlled(
  input: PersistStateFactControlledInput
): Promise<StateFactPersistenceResult> {
  const sourceRoute = trimOrNull(input.sourceRoute);

  if (!sourceRoute) {
    return buildRejected(
      "SOURCE_EVIDENCE_MISSING",
      "Source route is required before controlled persistence can run."
    );
  }

  const authenticatedActorResult = await resolveAuthenticatedStateFactActor();

  if (!authenticatedActorResult.ok) {
    return buildRejected(
      authenticatedActorResult.errorCode,
      authenticatedActorResult.safeMessage
    );
  }

  const clientUserId = trimOrNull(input.request.untrustedClientUserId);

  if (clientUserId && clientUserId !== authenticatedActorResult.actor.appUserId) {
    return buildRejected(
      "AMBIGUOUS_IDENTITY",
      "Client-provided user identity does not match the authenticated actor."
    );
  }

  const targetValueObjectResult = await resolveStateFactTargetValueObject({
    valueObjectId: input.request.valueObjectId,
    authenticatedActor: authenticatedActorResult.actor,
  });

  if (!targetValueObjectResult.ok) {
    return buildRejected(
      targetValueObjectResult.errorCode,
      targetValueObjectResult.safeMessage
    );
  }

  const dimensionResult = await resolveStateFactDimension({
    dimensionKey: input.request.dimensionKey,
  });

  if (!dimensionResult.ok) {
    return buildRejected(
      dimensionResult.errorCode,
      dimensionResult.safeMessage
    );
  }

  const resolvedContext: StateFactResolvedContext = {
    authenticatedActor: authenticatedActorResult.actor,
    targetValueObject: targetValueObjectResult.targetValueObject,
    dimension: dimensionResult.dimension,
  };

  const validationResult = validateStateFactCandidateAgainstContract({
    candidateTraceId: input.request.candidateTraceId,
    resolvedContext,
    candidate: input.request.candidate,
    userConfirmation: input.request.userConfirmation,
  });

  if (!validationResult.ok) {
    if (validationResult.decision === "shadow_only") {
      return buildShadowOnlyNotPersisted();
    }

    return buildRejected(
      validationResult.rejectionCode,
      validationResult.safeMessage
    );
  }

  const payloadResult = buildValueObjectStateFactInsertPayload({
    candidateTraceId: input.request.candidateTraceId,
    sourceRoute,
    idempotencyKey: input.request.idempotencyKey,
    resolvedContext,
    candidate: input.request.candidate,
    validationResult,
    contractVersion: input.contractVersion,
    helperVersion: input.helperVersion,
    d4GateVersion: input.d4GateVersion,
  });

  if (!payloadResult.ok) {
    if (payloadResult.errorCode === "SHADOW_ONLY_NOT_PERSISTABLE") {
      return buildShadowOnlyNotPersisted();
    }

    return buildRejected(
      payloadResult.errorCode,
      payloadResult.safeMessage
    );
  }

  const idempotencyResult = await checkStateFactIdempotency({
    insertPayload: payloadResult.insertPayload,
    idempotencyKey: input.request.idempotencyKey,
  });

  if (!idempotencyResult.ok) {
    return buildRejected(
      idempotencyResult.errorCode,
      idempotencyResult.safeMessage
    );
  }

  if (idempotencyResult.decision.status === "already_exists") {
    return buildAlreadyExists(idempotencyResult.decision.existingStateFactId);
  }

  const { data: insertedStateFactData, error: insertError } = await supabase
    .from("value_object_state_facts")
    .insert(payloadResult.insertPayload)
    .select("id")
    .single();

  if (insertError) {
    return buildRejected(
      "UNKNOWN_ERROR",
      "Controlled state fact insert failed."
    );
  }

  const stateFactId = resolveInsertedStateFactId(insertedStateFactData);

  if (!stateFactId) {
    return buildRejected(
      "UNKNOWN_ERROR",
      "Controlled state fact insert returned no valid identifier."
    );
  }

  return buildPersisted(
    stateFactId,
    payloadResult.insertPayload.metadata_json.contract_version,
    sourceRoute
  );
}
