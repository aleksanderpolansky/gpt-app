import {
  buildControlledActivityIntakeServerSideAuthSessionIdentity,
  isControlledActivityIntakeServerSideAuthSessionFailure,
  type ControlledActivityIntakeServerSideAuthSessionReadModel,
  type ControlledActivityIntakeServerSideAuthSessionResult,
} from "./serverSideAuthSession";

export const CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_RUNTIME_LAYER =
  "controlled-activity-intake-real-auth-session-runtime-adapter-static-v1" as const;

export type ControlledActivityIntakeServerSideAuthSessionRuntimeSource =
  | "project_auth0_server_session_runtime_adapter"
  | "test_injected_runtime_read_model";

export type ControlledActivityIntakeServerSideAuthSessionRuntimeAuthBoundary =
  | "project_auth0_server_session";

export type ControlledActivityIntakeServerSideAuthSessionRuntimeReadModel = {
  readonly provider?: "auth0" | "unknown" | string | null;
  readonly authSubject?: string | null;
  readonly email?: string | null;
  readonly sessionId?: string | null;
  readonly expiresAt?: string | number | null;
  readonly issuedAt?: string | number | null;
  readonly rawSessionAvailable?: boolean | null;
  readonly readSource?: string | null;
  readonly readFailed?: boolean | null;
  readonly readFailureMessage?: string | null;
  readonly expired?: boolean | null;
  readonly malformed?: boolean | null;
};

export type ControlledActivityIntakeServerSideAuthSessionRuntimeInput = {
  readonly source?: ControlledActivityIntakeServerSideAuthSessionRuntimeSource;
  readonly requestSource?: string | null;
  readonly authBoundary?:
    | ControlledActivityIntakeServerSideAuthSessionRuntimeAuthBoundary
    | "unknown"
    | string
    | null;
  readonly allowRuntimeRead?: boolean | null;
  readonly debugMode?: boolean | null;
  readonly injectedRuntimeReadModel?:
    | ControlledActivityIntakeServerSideAuthSessionRuntimeReadModel
    | null;
  readonly injectedRuntimeError?: string | null;
};

export type ControlledActivityIntakeServerSideAuthSessionRuntimeGuardrails = {
  readonly runtimeHelperOnly: true;
  readonly staticRuntimeAdapterOnly: true;
  readonly auth0RuntimeReadExecuted: false;
  readonly serverSideSessionReadOnly: true;
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

export type ControlledActivityIntakeServerSideAuthSessionRuntimeFailureCode =
  | "CONTROLLED_INTAKE_AUTH_RUNTIME_NOT_APPROVED"
  | "CONTROLLED_INTAKE_AUTH_SESSION_RUNTIME_UNAVAILABLE"
  | "CONTROLLED_INTAKE_SERVER_SESSION_REQUIRED"
  | "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED"
  | "CONTROLLED_INTAKE_AUTH_SESSION_INVALID"
  | "CONTROLLED_INTAKE_AUTH_PROVIDER_UNSUPPORTED"
  | "CONTROLLED_INTAKE_AUTH_SESSION_READ_FAILED"
  | "CONTROLLED_INTAKE_AUTH_SESSION_EXPIRED";

export type ControlledActivityIntakeServerSideAuthSessionRuntimeSuccess = {
  readonly ok: true;
  readonly layer: typeof CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_RUNTIME_LAYER;
  readonly source: ControlledActivityIntakeServerSideAuthSessionRuntimeSource;
  readonly sessionReadModel: ControlledActivityIntakeServerSideAuthSessionReadModel;
  readonly staticAuthSessionResult: ControlledActivityIntakeServerSideAuthSessionResult;
  readonly guardrails: ControlledActivityIntakeServerSideAuthSessionRuntimeGuardrails;
};

export type ControlledActivityIntakeServerSideAuthSessionRuntimeFailure = {
  readonly ok: false;
  readonly layer: typeof CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_RUNTIME_LAYER;
  readonly source: ControlledActivityIntakeServerSideAuthSessionRuntimeSource;
  readonly code: ControlledActivityIntakeServerSideAuthSessionRuntimeFailureCode;
  readonly message: string;
  readonly sessionReadModel: ControlledActivityIntakeServerSideAuthSessionReadModel;
  readonly guardrails: ControlledActivityIntakeServerSideAuthSessionRuntimeGuardrails;
};

export type ControlledActivityIntakeServerSideAuthSessionRuntimeResult =
  | ControlledActivityIntakeServerSideAuthSessionRuntimeSuccess
  | ControlledActivityIntakeServerSideAuthSessionRuntimeFailure;

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function buildGuardrails(): ControlledActivityIntakeServerSideAuthSessionRuntimeGuardrails {
  return {
    runtimeHelperOnly: true,
    staticRuntimeAdapterOnly: true,
    auth0RuntimeReadExecuted: false,
    serverSideSessionReadOnly: true,
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

function buildFailureSessionReadModel(
  readFailureMessage: string,
): ControlledActivityIntakeServerSideAuthSessionReadModel {
  return {
    rawSessionAvailable: false,
    readSource: "project_auth0_server_session_runtime_adapter",
    readFailed: true,
    readFailureMessage,
  };
}

function buildFailure(
  source: ControlledActivityIntakeServerSideAuthSessionRuntimeSource,
  code: ControlledActivityIntakeServerSideAuthSessionRuntimeFailureCode,
  message: string,
  sessionReadModel: ControlledActivityIntakeServerSideAuthSessionReadModel =
    buildFailureSessionReadModel(message),
): ControlledActivityIntakeServerSideAuthSessionRuntimeFailure {
  return {
    ok: false,
    layer: CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_RUNTIME_LAYER,
    source,
    code,
    message,
    sessionReadModel,
    guardrails: buildGuardrails(),
  };
}

function normalizeAuthBoundary(
  value: unknown,
): ControlledActivityIntakeServerSideAuthSessionRuntimeAuthBoundary | undefined {
  const normalized = normalizeOptionalString(value);

  return normalized === "project_auth0_server_session"
    ? "project_auth0_server_session"
    : undefined;
}

function buildSanitizedSessionReadModel(
  input: ControlledActivityIntakeServerSideAuthSessionRuntimeReadModel,
): ControlledActivityIntakeServerSideAuthSessionReadModel {
  return {
    provider: normalizeOptionalString(input.provider) ?? input.provider,
    authSubject: normalizeOptionalString(input.authSubject) ?? input.authSubject,
    email: normalizeOptionalString(input.email) ?? input.email,
    sessionId: normalizeOptionalString(input.sessionId) ?? input.sessionId,
    expiresAt: input.expiresAt,
    issuedAt: input.issuedAt,
    rawSessionAvailable: true,
    readSource:
      normalizeOptionalString(input.readSource) ??
      "project_auth0_server_session_runtime_adapter",
    readFailed: false,
    readFailureMessage: undefined,
  };
}

export function isControlledActivityIntakeServerSideAuthSessionRuntimeFailure(
  result: ControlledActivityIntakeServerSideAuthSessionRuntimeResult,
): result is ControlledActivityIntakeServerSideAuthSessionRuntimeFailure {
  return result.ok === false;
}

export function readControlledActivityIntakeServerSideAuthSessionRuntime(
  input: ControlledActivityIntakeServerSideAuthSessionRuntimeInput,
): ControlledActivityIntakeServerSideAuthSessionRuntimeResult {
  const source =
    input.source ?? "test_injected_runtime_read_model";

  if (input.allowRuntimeRead !== true) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_RUNTIME_NOT_APPROVED",
      "Controlled intake auth runtime adapter requires explicit runtime-read approval.",
    );
  }

  if (!normalizeAuthBoundary(input.authBoundary)) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_SESSION_RUNTIME_UNAVAILABLE",
      "Controlled intake auth runtime adapter requires the project Auth0 server-session boundary.",
    );
  }

  const injectedRuntimeError = normalizeOptionalString(input.injectedRuntimeError);

  if (injectedRuntimeError) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_SESSION_READ_FAILED",
      injectedRuntimeError,
    );
  }

  const runtimeReadModel = input.injectedRuntimeReadModel ?? null;

  if (!runtimeReadModel || runtimeReadModel.rawSessionAvailable === false) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_SERVER_SESSION_REQUIRED",
      "Controlled intake auth runtime adapter requires a server-side session read model.",
    );
  }

  if (runtimeReadModel.expired === true) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_SESSION_EXPIRED",
      "Controlled intake auth runtime adapter received an expired session.",
    );
  }

  if (runtimeReadModel.malformed === true) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_SESSION_INVALID",
      "Controlled intake auth runtime adapter received a malformed session payload.",
    );
  }

  const sessionReadModel = buildSanitizedSessionReadModel(runtimeReadModel);
  const staticAuthSessionResult =
    buildControlledActivityIntakeServerSideAuthSessionIdentity({
      source: "auth0_server_session",
      sessionReadModel,
      requestSource:
        normalizeOptionalString(input.requestSource) ??
        "controlled-intake-real-auth-session-runtime-adapter-static",
    });

  if (isControlledActivityIntakeServerSideAuthSessionFailure(staticAuthSessionResult)) {
    return buildFailure(
      source,
      staticAuthSessionResult.code,
      staticAuthSessionResult.message,
      {
        ...sessionReadModel,
        rawSessionAvailable: false,
        readFailed: true,
        readFailureMessage: staticAuthSessionResult.message,
      },
    );
  }

  return {
    ok: true,
    layer: CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_RUNTIME_LAYER,
    source,
    sessionReadModel,
    staticAuthSessionResult,
    guardrails: buildGuardrails(),
  };
}