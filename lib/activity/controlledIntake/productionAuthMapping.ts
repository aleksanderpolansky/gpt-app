import type { ControlledActivityIntakeTrustedContext } from "./idempotency";

export const CONTROLLED_ACTIVITY_INTAKE_PRODUCTION_AUTH_MAPPING_LAYER =
  "controlled-activity-intake-production-auth-mapping-static-helper-v1" as const;

export type ControlledActivityIntakeProductionAuthMappingSource =
  | "production_auth_session"
  | "test_static_helper";

export type ControlledActivityIntakeProductionAuthIdentity = {
  readonly sub?: string | null;
  readonly email?: string | null;
  readonly name?: string | null;
  readonly provider?: string | null;
  readonly sessionId?: string | null;
};

export type ControlledActivityIntakeProductionAppUserMapping = {
  readonly appUserId?: string | null;
  readonly userId?: string | null;
  readonly actorId?: string | null;
  readonly organizationId?: string | null;
  readonly spaceId?: string | null;
};

export type ControlledActivityIntakeProductionAuthMappingGuardrails = {
  readonly staticHelperOnly: true;
  readonly productionAuthMappingOnly: true;
  readonly serverSideContextRequired: true;
  readonly clientOwnershipAccepted: false;
  readonly previewHeaderAcceptedForProductionWrite: false;
  readonly dbReadExecuted: false;
  readonly dbWriteExecuted: false;
  readonly sqlExecuted: false;
  readonly aiCallExecuted: false;
  readonly semanticCandidatesPersisted: false;
  readonly valueObjectsCreated: false;
  readonly stateFactsCreated: false;
  readonly stateDeltasCreated: false;
  readonly stateSnapshotsCreated: false;
};

export type ControlledActivityIntakeProductionAuthMappingInput = {
  readonly source?: ControlledActivityIntakeProductionAuthMappingSource | null;
  readonly identity?: ControlledActivityIntakeProductionAuthIdentity | null;
  readonly mapping?: ControlledActivityIntakeProductionAppUserMapping | null;
  readonly requestSource?: string | null;
};

export type ControlledActivityIntakeProductionAuthMappingFailureCode =
  | "CONTROLLED_INTAKE_AUTH_IDENTITY_REQUIRED"
  | "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED"
  | "CONTROLLED_INTAKE_APP_USER_MAPPING_REQUIRED"
  | "CONTROLLED_INTAKE_CONTEXT_NOT_VERIFIED"
  | "CONTROLLED_INTAKE_ACTOR_NOT_ALLOWED"
  | "CONTROLLED_INTAKE_ORGANIZATION_NOT_ALLOWED"
  | "CONTROLLED_INTAKE_SPACE_NOT_ALLOWED";

export type ControlledActivityIntakeProductionAuthMappingSuccess = {
  readonly ok: true;
  readonly layer: typeof CONTROLLED_ACTIVITY_INTAKE_PRODUCTION_AUTH_MAPPING_LAYER;
  readonly source: ControlledActivityIntakeProductionAuthMappingSource;
  readonly authSubject: string;
  readonly trustedContext: ControlledActivityIntakeTrustedContext;
  readonly guardrails: ControlledActivityIntakeProductionAuthMappingGuardrails;
};

export type ControlledActivityIntakeProductionAuthMappingFailure = {
  readonly ok: false;
  readonly layer: typeof CONTROLLED_ACTIVITY_INTAKE_PRODUCTION_AUTH_MAPPING_LAYER;
  readonly source: ControlledActivityIntakeProductionAuthMappingSource;
  readonly code: ControlledActivityIntakeProductionAuthMappingFailureCode;
  readonly message: string;
  readonly guardrails: ControlledActivityIntakeProductionAuthMappingGuardrails;
};

export type ControlledActivityIntakeProductionAuthMappingResult =
  | ControlledActivityIntakeProductionAuthMappingSuccess
  | ControlledActivityIntakeProductionAuthMappingFailure;

function normalizeOptionalString(
  value: string | null | undefined,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeSource(
  value: ControlledActivityIntakeProductionAuthMappingSource | null | undefined,
): ControlledActivityIntakeProductionAuthMappingSource {
  return value ?? "production_auth_session";
}

function buildGuardrails(): ControlledActivityIntakeProductionAuthMappingGuardrails {
  return {
    staticHelperOnly: true,
    productionAuthMappingOnly: true,
    serverSideContextRequired: true,
    clientOwnershipAccepted: false,
    previewHeaderAcceptedForProductionWrite: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    sqlExecuted: false,
    aiCallExecuted: false,
    semanticCandidatesPersisted: false,
    valueObjectsCreated: false,
    stateFactsCreated: false,
    stateDeltasCreated: false,
    stateSnapshotsCreated: false,
  };
}

function failure(
  source: ControlledActivityIntakeProductionAuthMappingSource,
  code: ControlledActivityIntakeProductionAuthMappingFailureCode,
  message: string,
): ControlledActivityIntakeProductionAuthMappingFailure {
  return {
    ok: false,
    layer: CONTROLLED_ACTIVITY_INTAKE_PRODUCTION_AUTH_MAPPING_LAYER,
    source,
    code,
    message,
    guardrails: buildGuardrails(),
  };
}

function buildTrustedContext(input: {
  readonly appUserId: string;
  readonly actorId?: string;
  readonly organizationId?: string;
  readonly spaceId?: string;
  readonly requestSource: string;
}): ControlledActivityIntakeTrustedContext {
  return {
    appUserId: input.appUserId,
    actorId: input.actorId,
    organizationId: input.organizationId,
    spaceId: input.spaceId,
    requestSource: input.requestSource,
  };
}

export function isControlledActivityIntakeProductionAuthMappingFailure(
  result: ControlledActivityIntakeProductionAuthMappingResult,
): result is ControlledActivityIntakeProductionAuthMappingFailure {
  return result.ok === false;
}

export function buildControlledActivityIntakeProductionTrustedContext(
  input: ControlledActivityIntakeProductionAuthMappingInput,
): ControlledActivityIntakeProductionAuthMappingResult {
  const source = normalizeSource(input.source);
  const identity = input.identity ?? null;
  const mapping = input.mapping ?? null;

  if (!identity) {
    return failure(
      source,
      "CONTROLLED_INTAKE_AUTH_IDENTITY_REQUIRED",
      "Controlled activity intake production auth mapping requires authenticated server-side identity.",
    );
  }

  const authSubject = normalizeOptionalString(identity.sub);

  if (!authSubject) {
    return failure(
      source,
      "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED",
      "Controlled activity intake production auth mapping requires authenticated identity subject.",
    );
  }

  const appUserId =
    normalizeOptionalString(mapping?.appUserId) ??
    normalizeOptionalString(mapping?.userId);

  if (!appUserId) {
    return failure(
      source,
      "CONTROLLED_INTAKE_APP_USER_MAPPING_REQUIRED",
      "Controlled activity intake production auth mapping requires server-side app user mapping.",
    );
  }

  return {
    ok: true,
    layer: CONTROLLED_ACTIVITY_INTAKE_PRODUCTION_AUTH_MAPPING_LAYER,
    source,
    authSubject,
    trustedContext: buildTrustedContext({
      appUserId,
      actorId: normalizeOptionalString(mapping?.actorId),
      organizationId: normalizeOptionalString(mapping?.organizationId),
      spaceId: normalizeOptionalString(mapping?.spaceId),
      requestSource:
        normalizeOptionalString(input.requestSource) ??
        "controlled-intake-production-auth-mapping",
    }),
    guardrails: buildGuardrails(),
  };
}

export function assertControlledActivityIntakeProductionTrustedContext(
  result: ControlledActivityIntakeProductionAuthMappingResult,
): ControlledActivityIntakeTrustedContext {
  if (isControlledActivityIntakeProductionAuthMappingFailure(result)) {
    throw new Error(result.message);
  }

  return result.trustedContext;
}