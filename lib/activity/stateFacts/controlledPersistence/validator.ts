/**
 * GPT-APP / AI-NAVIGATOR
 * P4.10.0-C8-I-D4-F-B-D-E
 *
 * Controlled state fact persistence - state fact candidate validator helper.
 *
 * Status:
 * - STATE FACT CANDIDATE VALIDATOR ONLY
 * - NO ROUTE
 * - NO DATABASE READ
 * - NO STATE FACT WRITE
 * - NO STATE FACT STORAGE TABLE ACCESS
 * - NO STATE FACT CREATED
 *
 * Core rules preserved:
 * - A shadow candidate is not a state fact.
 * - An insertDraft is not a state fact.
 * - AI-only direct persistence remains blocked.
 * - Candidate validation must be re-run server-side.
 * - This helper does not build insert payloads.
 * - This helper does not persist state facts.
 */

import type {
  JsonObject,
  JsonValue,
  StateFactCandidateInput,
  StateFactClaimPolicy,
  StateFactPersistenceErrorCode,
  StateFactPrivacyLevel,
  StateFactResolvedContext,
  StateFactSourceType,
  StateFactUserConfirmationInput,
  StateFactValidationResult,
} from "./types";

export type ValidateStateFactCandidateAgainstContractInput = {
  candidateTraceId: string;
  resolvedContext: StateFactResolvedContext;
  candidate: StateFactCandidateInput;
  userConfirmation: StateFactUserConfirmationInput;
};

const ALLOWED_SOURCE_TYPES = new Set<StateFactSourceType>([
  "manual",
  "user_confirmed",
  "rule",
  "system",
  "import",
  "correction",
]);

const ALLOWED_PRIVACY_LEVELS = new Set<StateFactPrivacyLevel>([
  "private",
  "shared_with_org",
  "public_masked",
  "public",
]);

const FORBIDDEN_OVERCLAIM_PATTERN =
  /\b(cortisol|testosterone|hormone|hormonal|diagnosis|diagnosed|medical condition|disease|fat loss|weight loss|client acquired|deal closed|income generated|creditworthiness|financial risk|financial instability|child development|parenting quality|psychological diagnosis)\b/i;

const UNSAFE_CERTAINTY_PATTERN =
  /\b(definitely|proves|proved|guaranteed|diagnoses|confirms|certainly|objectively measured)\b/i;

function buildAccepted(): StateFactValidationResult {
  return {
    ok: true,
    decision: "accepted",
    rejectionCode: null,
    safeMessage: null,
  };
}

function buildRejected(
  rejectionCode: StateFactPersistenceErrorCode,
  safeMessage: string
): StateFactValidationResult {
  return {
    ok: false,
    decision: "rejected",
    rejectionCode,
    safeMessage,
  };
}

function buildShadowOnly(
  rejectionCode: StateFactPersistenceErrorCode,
  safeMessage: string
): StateFactValidationResult {
  return {
    ok: false,
    decision: "shadow_only",
    rejectionCode,
    safeMessage,
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasObjectKeys(value: JsonObject): boolean {
  return Object.keys(value).length > 0;
}

function stringifyJson(value: JsonValue): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function readStringProperty(source: JsonObject, key: string): string | null {
  const value = source[key];

  if (!isNonEmptyString(value)) {
    return null;
  }

  return value.trim().toLowerCase();
}

function readBooleanProperty(source: JsonObject, key: string): boolean | null {
  const value = source[key];

  if (typeof value !== "boolean") {
    return null;
  }

  return value;
}

function isAllowedSourceType(sourceType: StateFactSourceType): boolean {
  return ALLOWED_SOURCE_TYPES.has(sourceType);
}

function isAllowedPrivacyLevel(privacyLevel: StateFactPrivacyLevel): boolean {
  return ALLOWED_PRIVACY_LEVELS.has(privacyLevel);
}

function requiresSourceId(sourceType: StateFactSourceType): boolean {
  return sourceType === "rule" ||
    sourceType === "system" ||
    sourceType === "import" ||
    sourceType === "correction";
}

function isSourceCompatibleWithClaimPolicy(
  claimPolicy: StateFactClaimPolicy,
  sourceType: StateFactSourceType
): boolean {
  if (sourceType === "correction") {
    return true;
  }

  if (claimPolicy === "manual") {
    return sourceType === "manual";
  }

  if (claimPolicy === "user_confirmed") {
    return sourceType === "user_confirmed" || sourceType === "manual";
  }

  if (claimPolicy === "rule") {
    return sourceType === "rule";
  }

  if (claimPolicy === "system_estimate") {
    return sourceType === "system" ||
      sourceType === "rule" ||
      sourceType === "import";
  }

  if (claimPolicy === "proxy_only") {
    return sourceType === "system" ||
      sourceType === "rule" ||
      sourceType === "import" ||
      sourceType === "user_confirmed";
  }

  return false;
}

function privacyRank(privacyLevel: StateFactPrivacyLevel): number {
  if (privacyLevel === "private") {
    return 0;
  }

  if (privacyLevel === "shared_with_org") {
    return 1;
  }

  if (privacyLevel === "public_masked") {
    return 2;
  }

  return 3;
}

function isPrivacyCompatibleWithDimension(
  candidatePrivacyLevel: StateFactPrivacyLevel,
  dimensionDefaultPrivacyLevel: StateFactPrivacyLevel,
  isSensitive: boolean
): boolean {
  if (isSensitive && candidatePrivacyLevel !== "private") {
    return false;
  }

  return privacyRank(candidatePrivacyLevel) <= privacyRank(dimensionDefaultPrivacyLevel);
}

function containsForbiddenOverclaim(candidate: StateFactCandidateInput): boolean {
  const proposedValueText = stringifyJson(candidate.proposedValue);
  const evidenceText = stringifyJson(candidate.evidenceJson);
  const metadataText = stringifyJson(candidate.metadataJson);
  const joined = [
    candidate.safeWording,
    proposedValueText,
    evidenceText,
    metadataText,
  ].join(" ");

  return FORBIDDEN_OVERCLAIM_PATTERN.test(joined);
}

function containsUnsafeWording(candidate: StateFactCandidateInput): boolean {
  return UNSAFE_CERTAINTY_PATTERN.test(candidate.safeWording);
}

function isAiOnlyDirectCandidate(candidate: StateFactCandidateInput): boolean {
  const metadataAiOnly = readBooleanProperty(candidate.metadataJson, "ai_only_direct") === true;
  const metadataCreatedByAi = readBooleanProperty(candidate.metadataJson, "created_by_ai_directly") === true;
  const metadataSourceKind = readStringProperty(candidate.metadataJson, "source_kind");
  const evidenceSourceKind = readStringProperty(candidate.evidenceJson, "source_kind");

  return metadataAiOnly ||
    metadataCreatedByAi ||
    metadataSourceKind === "ai" ||
    metadataSourceKind === "llm" ||
    evidenceSourceKind === "ai" ||
    evidenceSourceKind === "llm";
}

function hasRollbackTrace(candidate: StateFactCandidateInput): boolean {
  const rollbackable = readBooleanProperty(candidate.metadataJson, "rollbackable") === true;
  const rollbackTraceId = readStringProperty(candidate.metadataJson, "rollback_trace_id");
  const idempotencyKey = readStringProperty(candidate.metadataJson, "idempotency_key");

  return rollbackable || Boolean(rollbackTraceId) || Boolean(idempotencyKey);
}

function hasValidWindow(candidate: StateFactCandidateInput): boolean {
  const validFromTime = Date.parse(candidate.validityWindow.validFrom);

  if (!Number.isFinite(validFromTime)) {
    return false;
  }

  if (candidate.validityWindow.validTo === null) {
    return true;
  }

  const validToTime = Date.parse(candidate.validityWindow.validTo);

  if (!Number.isFinite(validToTime)) {
    return false;
  }

  return validToTime > validFromTime;
}

function isConfidenceValid(candidate: StateFactCandidateInput): boolean {
  return Number.isFinite(candidate.confidence) &&
    candidate.confidence >= 0 &&
    candidate.confidence <= 1;
}

function isClaimStrengthValid(candidate: StateFactCandidateInput): boolean {
  return Number.isInteger(candidate.claimStrength) &&
    candidate.claimStrength >= 0 &&
    candidate.claimStrength <= 5;
}

/**
 * Validates a candidate against the D4-C / D4-F controlled persistence contract.
 *
 * This helper is intentionally pure:
 * - no database reads;
 * - no database writes;
 * - no route parsing;
 * - no insertDraft creation;
 * - no persistence attempt.
 */
export function validateStateFactCandidateAgainstContract(
  input: ValidateStateFactCandidateAgainstContractInput
): StateFactValidationResult {
  const { candidate, resolvedContext, userConfirmation } = input;
  const { dimension } = resolvedContext;

  if (!isNonEmptyString(input.candidateTraceId)) {
    return buildRejected(
      "SOURCE_EVIDENCE_MISSING",
      "Candidate trace id is required for controlled validation."
    );
  }

  if (dimension.isActive !== true) {
    return buildRejected(
      "DIMENSION_INACTIVE",
      "Inactive dimensions cannot be used for controlled persistence."
    );
  }

  if (!isAllowedSourceType(candidate.sourceType)) {
    return buildRejected(
      "SOURCE_TYPE_NOT_ALLOWED",
      "Candidate source type is not allowed for controlled persistence."
    );
  }

  if (isAiOnlyDirectCandidate(candidate)) {
    return buildShadowOnly(
      "AI_ONLY_DIRECT_PERSIST_BLOCKED",
      "AI-only direct persistence remains blocked. Candidate may stay shadow-only until a non-AI source, rule, or explicit confirmation is available."
    );
  }

  if (!isJsonObject(candidate.proposedValue) || !hasObjectKeys(candidate.proposedValue)) {
    return buildRejected(
      "SOURCE_EVIDENCE_MISSING",
      "Candidate proposed value must be a non-empty object."
    );
  }

  if (!isJsonObject(candidate.evidenceJson) || !hasObjectKeys(candidate.evidenceJson)) {
    return buildRejected(
      "SOURCE_EVIDENCE_MISSING",
      "Candidate evidence must be a non-empty object."
    );
  }

  if (requiresSourceId(candidate.sourceType) && !isNonEmptyString(candidate.sourceId)) {
    return buildRejected(
      "SOURCE_EVIDENCE_MISSING",
      "Rule, system, import, and correction candidates require a source id."
    );
  }

  if (!isNonEmptyString(candidate.safeWording)) {
    return buildRejected(
      "UNSAFE_WORDING",
      "Candidate safe wording is required."
    );
  }

  if (containsForbiddenOverclaim(candidate)) {
    return buildRejected(
      "FORBIDDEN_OVERCLAIM",
      "Candidate contains a forbidden overclaim and cannot be persisted."
    );
  }

  if (containsUnsafeWording(candidate)) {
    return buildRejected(
      "UNSAFE_WORDING",
      "Candidate wording uses unsafe certainty language."
    );
  }

  if (!isConfidenceValid(candidate)) {
    return buildRejected(
      "CONFIDENCE_OUT_OF_RANGE",
      "Candidate confidence must be between 0 and 1."
    );
  }

  if (!isClaimStrengthValid(candidate)) {
    return buildRejected(
      "CLAIM_STRENGTH_TOO_HIGH",
      "Candidate claim strength must be an integer between 0 and 5."
    );
  }

  if (!isAllowedPrivacyLevel(candidate.privacyLevel)) {
    return buildRejected(
      "PRIVACY_POLICY_VIOLATION",
      "Candidate privacy level is not allowed."
    );
  }

  if (!isPrivacyCompatibleWithDimension(
    candidate.privacyLevel,
    dimension.defaultPrivacyLevel,
    dimension.isSensitive
  )) {
    return buildRejected(
      "PRIVACY_POLICY_VIOLATION",
      "Candidate privacy level is broader than the dimension allows."
    );
  }

  if (!isSourceCompatibleWithClaimPolicy(dimension.claimPolicy, candidate.sourceType)) {
    return buildRejected(
      "SOURCE_TYPE_NOT_ALLOWED",
      "Candidate source type is not compatible with the dimension claim policy."
    );
  }

  if (dimension.claimPolicy === "user_confirmed" && !userConfirmation.isExplicitlyConfirmed) {
    return buildShadowOnly(
      "USER_CONFIRMATION_REQUIRED",
      "This dimension requires explicit user confirmation before persistence."
    );
  }

  if (dimension.claimPolicy === "proxy_only" && candidate.claimStrength > 2) {
    return buildRejected(
      "CLAIM_STRENGTH_TOO_HIGH",
      "Proxy-only dimensions cannot carry high-strength claims."
    );
  }

  if (dimension.isSensitive &&
    candidate.sourceType === "system" &&
    !userConfirmation.isExplicitlyConfirmed) {
    return buildShadowOnly(
      "SENSITIVE_INFERENCE_BLOCKED",
      "Sensitive system-only inference requires confirmation or a narrower controlled rule before persistence."
    );
  }

  if (!hasValidWindow(candidate)) {
    return buildRejected(
      "VALID_WINDOW_INVALID",
      "Candidate validity window is missing or invalid."
    );
  }

  if (!hasRollbackTrace(candidate)) {
    return buildRejected(
      "ROLLBACK_NOT_TRACEABLE",
      "Candidate must include rollback or idempotency trace metadata before persistence."
    );
  }

  return buildAccepted();
}
