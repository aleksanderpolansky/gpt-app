/**
 * GPT-APP / AI-NAVIGATOR
 * P4.10.0-C8-I-D4-F-B-D-A
 *
 * Controlled state fact persistence — types-only foundation.
 *
 * Status:
 * - TYPES ONLY
 * - NO ROUTE
 * - NO HELPER IMPLEMENTATION
 * - NO DATABASE WRITE
 * - NO STATE FACT CREATED
 *
 * Core rules preserved:
 * - A shadow candidate is not a state fact.
 * - An insertDraft is not a state fact.
 * - AI-only direct persistence remains blocked.
 * - valueObjectId alone is not enough for persistence permission.
 * - The future write path must be separate from the shadow candidate route.
 */

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonObject
  | JsonValue[];

export type JsonObject = {
  [key: string]: JsonValue;
};

export type IsoDateTimeString = string;
export type UuidString = string;

export type StateFactAccessMode =
  | "personal_owner"
  | "organization_actor"
  | "denied";

export type StateFactSourceType =
  | "manual"
  | "user_confirmed"
  | "rule"
  | "system"
  | "import"
  | "correction";

export type StateFactClaimPolicy =
  | "manual"
  | "user_confirmed"
  | "rule"
  | "system_estimate"
  | "proxy_only";

export type StateFactPrivacyLevel =
  | "private"
  | "shared_with_org"
  | "public_masked"
  | "public";

export type StateFactCorrectionStatus =
  | "active"
  | "corrected"
  | "revoked"
  | "superseded";

export type StateFactPersistenceDecision =
  | "persisted"
  | "rejected"
  | "shadow_only_not_persisted"
  | "already_exists";

export type StateFactPersistenceErrorCode =
  | "NOT_AUTHENTICATED"
  | "APP_USER_NOT_FOUND"
  | "PLACEHOLDER_USER_BLOCKED"
  | "AMBIGUOUS_IDENTITY"
  | "TARGET_VALUE_OBJECT_MISSING"
  | "TARGET_VALUE_OBJECT_NOT_FOUND"
  | "TARGET_VALUE_OBJECT_ACCESS_DENIED"
  | "PUBLIC_VISIBILITY_IS_NOT_WRITE_PERMISSION"
  | "DIMENSION_NOT_FOUND"
  | "DIMENSION_INACTIVE"
  | "CLAIM_POLICY_VIOLATION"
  | "SOURCE_TYPE_NOT_ALLOWED"
  | "SOURCE_EVIDENCE_MISSING"
  | "FORBIDDEN_OVERCLAIM"
  | "UNSAFE_WORDING"
  | "CONFIDENCE_OUT_OF_RANGE"
  | "CLAIM_STRENGTH_TOO_HIGH"
  | "PRIVACY_POLICY_VIOLATION"
  | "VALID_WINDOW_INVALID"
  | "ROLLBACK_NOT_TRACEABLE"
  | "AI_ONLY_DIRECT_PERSIST_BLOCKED"
  | "USER_CONFIRMATION_REQUIRED"
  | "SENSITIVE_INFERENCE_BLOCKED"
  | "SHADOW_ONLY_NOT_PERSISTABLE"
  | "IDEMPOTENCY_KEY_MISSING"
  | "DUPLICATE_STATE_FACT_PREVENTED"
  | "UNKNOWN_ERROR";

export type StateFactValidityWindowInput = {
  validFrom: IsoDateTimeString;
  validTo: IsoDateTimeString | null;
};

export type StateFactUserConfirmationInput = {
  isExplicitlyConfirmed: boolean;
  confirmedAt: IsoDateTimeString | null;
  confirmationText: string | null;
};

export type StateFactCandidateInput = {
  sourceType: StateFactSourceType;
  sourceId: string | null;
  proposedValue: JsonObject;
  safeWording: string;
  evidenceJson: JsonObject;
  confidence: number;
  claimStrength: number;
  privacyLevel: StateFactPrivacyLevel;
  validityWindow: StateFactValidityWindowInput;
  metadataJson: JsonObject;
};

export type StateFactPersistenceRequest = {
  candidateTraceId: string;
  valueObjectId: UuidString;
  dimensionKey: string;
  candidate: StateFactCandidateInput;
  userConfirmation: StateFactUserConfirmationInput;
  idempotencyKey: string;

  /**
   * Optional tracing-only field.
   * This value must never become the persisted user_id.
   */
  untrustedClientUserId?: string | null;
};

export type AuthenticatedStateFactActor = {
  appUserId: UuidString;
  actorId: UuidString | null;
  personId: UuidString | null;
  authSubject: string;
  email: string | null;
};

export type StateFactTargetValueObject = {
  valueObjectId: UuidString;
  ownerActorId: UuidString | null;
  organizationId: UuidString | null;
  accessMode: StateFactAccessMode;
  title: string | null;
};

export type StateFactDimensionContext = {
  dimensionId: UuidString;
  dimensionKey: string;
  claimPolicy: StateFactClaimPolicy;
  isSensitive: boolean;
  defaultPrivacyLevel: StateFactPrivacyLevel;
  isActive: boolean;
};

export type StateFactResolvedContext = {
  authenticatedActor: AuthenticatedStateFactActor;
  targetValueObject: StateFactTargetValueObject;
  dimension: StateFactDimensionContext;
};

export type StateFactContractDecision = {
  decision: "accept_for_controlled_persistence" | "reject" | "shadow_only";
  rejectionCode: StateFactPersistenceErrorCode | null;
  safeMessage: string | null;
  stateFactsCreated: 0;
  writesAttempted: false;
};

export type StateFactValidationResult =
  | {
      ok: true;
      decision: "accepted";
      rejectionCode: null;
      safeMessage: null;
    }
  | {
      ok: false;
      decision: "rejected" | "shadow_only";
      rejectionCode: StateFactPersistenceErrorCode;
      safeMessage: string;
    };

export type StateFactIdempotencyDecision =
  | {
      status: "new";
      existingStateFactId: null;
      stateFactsCreated: 0;
      writesAttempted: false;
    }
  | {
      status: "already_exists";
      existingStateFactId: UuidString;
      stateFactsCreated: 0;
      writesAttempted: false;
    };

export type ValueObjectStateFactInsertPayload = {
  user_id: UuidString;
  value_object_id: UuidString;
  dimension_id: UuidString;
  dimension_key: string;
  value_json: JsonObject;
  source_type: StateFactSourceType;
  source_id: string | null;
  confidence: number;
  evidence_json: JsonObject;
  claim_strength: number;
  privacy_level: StateFactPrivacyLevel;
  valid_from: IsoDateTimeString;
  valid_to: IsoDateTimeString | null;
  correction_status: StateFactCorrectionStatus;
  metadata_json: {
    rollbackable: true;
    idempotency_key: string;
    contract_version: string;
    helper_version: string;
    source_route: string;
    candidate_trace_id: string;
    created_from_candidate: true;
    not_created_by_ai_directly: true;
    d4_gate_version: string;
    [key: string]: JsonValue;
  };
};

export type StateFactPersistenceResult =
  | {
      ok: true;
      decision: "persisted";
      stateFactId: UuidString;
      idempotencyStatus: "created";
      stateFactsCreated: 1;
      writesAttempted: true;
      contractVersion: string;
      sourceRoute: string;
    }
  | {
      ok: false;
      decision: "rejected";
      rejectionCode: StateFactPersistenceErrorCode;
      stateFactsCreated: 0;
      writesAttempted: false;
      safeMessage: string;
    }
  | {
      ok: true;
      decision: "already_exists";
      stateFactId: UuidString;
      idempotencyStatus: "duplicate_prevented";
      stateFactsCreated: 0;
      writesAttempted: false;
    }
  | {
      ok: false;
      decision: "shadow_only_not_persisted";
      rejectionCode: "SHADOW_ONLY_NOT_PERSISTABLE";
      stateFactsCreated: 0;
      writesAttempted: false;
    };

// P4.10.0-C8-I-D4-L-L-A rollback types extension - BEGIN

export type RollbackStateFactControlledStatus =
  | "rolled_back"
  | "already_rolled_back"
  | "already_processed"
  | "rejected_not_authenticated"
  | "rejected_invalid_input"
  | "rejected_not_owner"
  | "rejected_fact_not_found"
  | "rejected_value_object_mismatch"
  | "rejected_already_superseded"
  | "rejected_invalid_state"
  | "rejected_idempotency_conflict"
  | "error";

export type RollbackStateFactControlledInput = {
  requestTraceId: string;
  idempotencyKey: string;

  stateFactId: string;
  valueObjectId: string;

  reason: string;

  requestedBy?: {
    auth0UserId?: string | null;
    appUserId?: string | null;
    actorId?: string | null;
  };

  sourceRoute: string;
  helperVersion: string;
  contractVersion: string;
  d4GateVersion: string;

  rollbackAt?: string | null;
};

export type RollbackStateFactControlledResult = {
  ok: boolean;
  status: RollbackStateFactControlledStatus;

  stateFactId?: string;
  valueObjectId?: string;
  auditEventId?: string;

  writesAttempted: boolean;
  stateFactsUpdated: number;
  auditEventsCreated: number;

  reason?: string;
  error?: string;
};

export type RollbackTargetStateFact = {
  id: string;
  userId: string;
  valueObjectId: string;
  dimensionId: string | null;
  dimensionKey: string;
  correctionStatus: string | null;
  validFrom: string | null;
  validTo: string | null;
  metadataJson: Record<string, unknown>;
  evidenceJson: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
};

export type RollbackStateFactUpdatePayload = {
  correction_status: "rolled_back";
  valid_to: string;
  metadata_json: Record<string, unknown>;
  updated_at: string;
};

export type RollbackAuditEventPayload = {
  user_id: string;
  actor_id: string | null;
  value_object_id: string;
  state_fact_id: string;
  related_state_fact_id: string | null;
  dimension_key: string;
  action_type: "rolled_back" | "rejected_rollback";
  previous_correction_status: string | null;
  new_correction_status: string | null;
  reason: string;
  request_trace_id: string;
  idempotency_key: string;
  source_route: string;
  helper_version: string;
  contract_version: string;
  d4_gate_version: string;
  previous_valid_to: string | null;
  new_valid_to: string | null;
  evidence_json: Record<string, unknown>;
  metadata_json: Record<string, unknown>;
};

export type RollbackIdempotencyLookupInput = {
  userId: string;
  stateFactId: string;
  actionType: "rolled_back";
  idempotencyKey: string;
};

export type RollbackIdempotencyLookupResult = {
  found: boolean;
  auditEventId?: string;
  status: "not_found" | "found" | "error";
  error?: string;
};

export type RollbackTargetLookupInput = {
  stateFactId: string;
  valueObjectId: string;
};

export type RollbackTargetLookupResult =
  | {
      ok: true;
      stateFact: RollbackTargetStateFact;
    }
  | {
      ok: false;
      status:
        | "rejected_fact_not_found"
        | "rejected_value_object_mismatch"
        | "error";
      reason: string;
    };

// P4.10.0-C8-I-D4-L-L-A rollback types extension - END

