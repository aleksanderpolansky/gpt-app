import type { ControlledActivityIntakeTrustedContext } from "./idempotency";

export const CONTROLLED_ACTIVITY_INTAKE_AUTH_CONTEXT_LAYER =
  "controlled-activity-intake-auth-context-static-helper-v1" as const;

export type ControlledActivityIntakeAuthContextSource =
  | "auth_session"
  | "no_write_preview"
  | "test_static_helper";

export type ControlledActivityIntakeAuthIdentity = {
  readonly sub?: string | null;
  readonly email?: string | null;
  readonly name?: string | null;
  readonly provider?: string | null;
  readonly sessionId?: string | null;
};

export type ControlledActivityIntakeAppUserMapping = {
  readonly appUserId?: string | null;
  readonly userId?: string | null;
  readonly actorId?: string | null;
  readonly organizationId?: string | null;
  readonly spaceId?: string | null;
};

export type ControlledActivityIntakeAuthContextGuardrails = {
  readonly staticHelperOnly: true;
  readonly serverSideContextRequired: true;
  readonly clientOwnershipAccepted: false;
  readonly previewHeaderAcceptedForProductionWrite: false;
  readonly dbWriteExecuted: false;
  readonly sqlExecuted: false;
  readonly aiCallExecuted: false;
  readonly semanticCandidatesPersisted: false;
  readonly valueObjectsCreated: false;
  readonly stateFactsCreated: false;
  readonly stateDeltasCreated: false;
  readonly stateSnapshotsCreated: false;
};

export type ControlledActivityIntakeAuthContextInput = {
  readonly source: ControlledActivityIntakeAuthContextSource;
  readonly identity?: ControlledActivityIntakeAuthIdentity | null;
  readonly mapping?: ControlledActivityIntakeAppUserMapping | null;
  readonly requestSource?: string | null;
};

export type ControlledActivityIntakeNoWritePreviewContextInput = {
  readonly appUserId?: string | null;
  readonly actorId?: string | null;
  readonly organizationId?: string | null;
  readonly spaceId?: string | null;
  readonly requestSource?: string | null;
};

export type ControlledActivityIntakeAuthContextSuccess = {
  readonly ok: true;
  readonly layer: typeof CONTROLLED_ACTIVITY_INTAKE_AUTH_CONTEXT_LAYER;
  readonly source: ControlledActivityIntakeAuthContextSource;
  readonly authSubject?: string;
  readonly trustedContext: ControlledActivityIntakeTrustedContext;
  readonly guardrails: ControlledActivityIntakeAuthContextGuardrails;
};

export type ControlledActivityIntakeAuthContextFailure = {
  readonly ok: false;
  readonly layer: typeof CONTROLLED_ACTIVITY_INTAKE_AUTH_CONTEXT_LAYER;
  readonly source: ControlledActivityIntakeAuthContextSource;
  readonly code:
    | "CONTROLLED_INTAKE_AUTH_IDENTITY_REQUIRED"
    | "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED"
    | "CONTROLLED_INTAKE_APP_USER_MAPPING_REQUIRED"
    | "CONTROLLED_INTAKE_TRUSTED_CONTEXT_APP_USER_REQUIRED";
  readonly message: string;
  readonly guardrails: ControlledActivityIntakeAuthContextGuardrails;
};

export type ControlledActivityIntakeAuthContextResult =
  | ControlledActivityIntakeAuthContextSuccess
  | ControlledActivityIntakeAuthContextFailure;

function normalizeOptionalString(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildGuardrails(): ControlledActivityIntakeAuthContextGuardrails {
  return {
    staticHelperOnly: true,
    serverSideContextRequired: true,
    clientOwnershipAccepted: false,
    previewHeaderAcceptedForProductionWrite: false,
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
  source: ControlledActivityIntakeAuthContextSource,
  code: ControlledActivityIntakeAuthContextFailure["code"],
  message: string,
): ControlledActivityIntakeAuthContextFailure {
  return {
    ok: false,
    layer: CONTROLLED_ACTIVITY_INTAKE_AUTH_CONTEXT_LAYER,
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

export function buildControlledActivityIntakeTrustedContextFromAuth(
  input: ControlledActivityIntakeAuthContextInput,
): ControlledActivityIntakeAuthContextResult {
  const source = input.source;
  const identity = input.identity ?? null;
  const mapping = input.mapping ?? null;

  if (!identity) {
    return failure(
      source,
      "CONTROLLED_INTAKE_AUTH_IDENTITY_REQUIRED",
      "Controlled activity intake auth context requires authenticated identity.",
    );
  }

  const authSubject = normalizeOptionalString(identity.sub);

  if (!authSubject) {
    return failure(
      source,
      "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED",
      "Controlled activity intake auth context requires authenticated identity subject.",
    );
  }

  const appUserId =
    normalizeOptionalString(mapping?.appUserId) ??
    normalizeOptionalString(mapping?.userId);

  if (!appUserId) {
    return failure(
      source,
      "CONTROLLED_INTAKE_APP_USER_MAPPING_REQUIRED",
      "Controlled activity intake auth context requires server-side app user mapping.",
    );
  }

  return {
    ok: true,
    layer: CONTROLLED_ACTIVITY_INTAKE_AUTH_CONTEXT_LAYER,
    source,
    authSubject,
    trustedContext: buildTrustedContext({
      appUserId,
      actorId: normalizeOptionalString(mapping?.actorId),
      organizationId: normalizeOptionalString(mapping?.organizationId),
      spaceId: normalizeOptionalString(mapping?.spaceId),
      requestSource:
        normalizeOptionalString(input.requestSource) ??
        "controlled-intake-auth-context",
    }),
    guardrails: buildGuardrails(),
  };
}

export function buildControlledActivityIntakeNoWritePreviewTrustedContext(
  input: ControlledActivityIntakeNoWritePreviewContextInput,
): ControlledActivityIntakeAuthContextResult {
  const appUserId = normalizeOptionalString(input.appUserId);

  if (!appUserId) {
    return failure(
      "no_write_preview",
      "CONTROLLED_INTAKE_TRUSTED_CONTEXT_APP_USER_REQUIRED",
      "Controlled activity intake no-write preview context requires app user id.",
    );
  }

  return {
    ok: true,
    layer: CONTROLLED_ACTIVITY_INTAKE_AUTH_CONTEXT_LAYER,
    source: "no_write_preview",
    trustedContext: buildTrustedContext({
      appUserId,
      actorId: normalizeOptionalString(input.actorId),
      organizationId: normalizeOptionalString(input.organizationId),
      spaceId: normalizeOptionalString(input.spaceId),
      requestSource:
        normalizeOptionalString(input.requestSource) ??
        "controlled-intake-no-write-preview",
    }),
    guardrails: buildGuardrails(),
  };
}

export function assertControlledActivityIntakeTrustedContext(
  result: ControlledActivityIntakeAuthContextResult,
): ControlledActivityIntakeTrustedContext {
  if (!result.ok) {
    throw new Error(result.message);
  }

  return result.trustedContext;
}