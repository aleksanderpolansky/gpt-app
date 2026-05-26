export const CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_LAYER =
  "controlled-activity-intake-server-side-auth-session-static-helper-v1" as const;

export type ControlledActivityIntakeServerSideAuthProvider = "auth0";

export type ControlledActivityIntakeServerSideAuthSessionSource =
  | "auth0_server_session"
  | "test_injected_session_read_model";

export type ControlledActivityIntakeServerSideAuthSessionReadSource =
  | "auth0_server_session"
  | "test_injected_session_read_model"
  | string;

export type ControlledActivityIntakeServerSideAuthSessionReadModel = {
  readonly provider?:
    | ControlledActivityIntakeServerSideAuthProvider
    | "unknown"
    | string
    | null;
  readonly authSubject?: string | null;
  readonly email?: string | null;
  readonly sessionId?: string | null;
  readonly userId?: string | null;
  readonly expiresAt?: string | number | null;
  readonly issuedAt?: string | number | null;
  readonly rawSessionAvailable?: boolean | null;
  readonly readSource?: ControlledActivityIntakeServerSideAuthSessionReadSource | null;
  readonly readFailed?: boolean | null;
  readonly readFailureMessage?: string | null;
};

export type ControlledActivityIntakeServerSideAuthSessionInput = {
  readonly source?: ControlledActivityIntakeServerSideAuthSessionSource;
  readonly sessionReadModel?:
    | ControlledActivityIntakeServerSideAuthSessionReadModel
    | null;
  readonly requestSource?: string | null;
};

export type ControlledActivityIntakeServerSideAuthSessionIdentity = {
  readonly authSubject: string;
  readonly provider: ControlledActivityIntakeServerSideAuthProvider;
  readonly email?: string;
  readonly sessionId?: string;
  readonly requestSource: string;
};

export type ControlledActivityIntakeServerSideAuthSessionGuardrails = {
  readonly staticHelperOnly: true;
  readonly serverSideSessionReadOnly: true;
  readonly auth0RuntimeReadExecuted: false;
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

export type ControlledActivityIntakeServerSideAuthSessionEvidence = {
  readonly identityEvidence: "server_session";
  readonly providerEvidence: "supported_provider";
  readonly readSource: string;
};

export type ControlledActivityIntakeServerSideAuthSessionFailureCode =
  | "CONTROLLED_INTAKE_SERVER_SESSION_REQUIRED"
  | "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED"
  | "CONTROLLED_INTAKE_AUTH_SESSION_INVALID"
  | "CONTROLLED_INTAKE_AUTH_PROVIDER_UNSUPPORTED"
  | "CONTROLLED_INTAKE_AUTH_SESSION_READ_FAILED";

export type ControlledActivityIntakeServerSideAuthSessionSuccess = {
  readonly ok: true;
  readonly layer: typeof CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_LAYER;
  readonly source: ControlledActivityIntakeServerSideAuthSessionSource;
  readonly identity: ControlledActivityIntakeServerSideAuthSessionIdentity;
  readonly evidence: ControlledActivityIntakeServerSideAuthSessionEvidence;
  readonly guardrails: ControlledActivityIntakeServerSideAuthSessionGuardrails;
};

export type ControlledActivityIntakeServerSideAuthSessionFailure = {
  readonly ok: false;
  readonly layer: typeof CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_LAYER;
  readonly source: ControlledActivityIntakeServerSideAuthSessionSource;
  readonly code: ControlledActivityIntakeServerSideAuthSessionFailureCode;
  readonly message: string;
  readonly guardrails: ControlledActivityIntakeServerSideAuthSessionGuardrails;
};

export type ControlledActivityIntakeServerSideAuthSessionResult =
  | ControlledActivityIntakeServerSideAuthSessionSuccess
  | ControlledActivityIntakeServerSideAuthSessionFailure;

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildGuardrails(): ControlledActivityIntakeServerSideAuthSessionGuardrails {
  return {
    staticHelperOnly: true,
    serverSideSessionReadOnly: true,
    auth0RuntimeReadExecuted: false,
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

function buildFailure(
  source: ControlledActivityIntakeServerSideAuthSessionSource,
  code: ControlledActivityIntakeServerSideAuthSessionFailureCode,
  message: string,
): ControlledActivityIntakeServerSideAuthSessionFailure {
  return {
    ok: false,
    layer: CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_LAYER,
    source,
    code,
    message,
    guardrails: buildGuardrails(),
  };
}

function normalizeProvider(
  value: unknown,
): ControlledActivityIntakeServerSideAuthProvider | undefined {
  const normalized = normalizeOptionalString(value)?.toLowerCase();

  if (normalized === "auth0") {
    return "auth0";
  }

  return undefined;
}

function hasUnsupportedProvider(value: unknown): boolean {
  return normalizeProvider(value) === undefined;
}

function isValidOptionalTimestamp(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return true;
    }

    return Number.isFinite(Date.parse(trimmed));
  }

  return false;
}

function buildReadSource(
  source: ControlledActivityIntakeServerSideAuthSessionSource,
  sessionReadModel: ControlledActivityIntakeServerSideAuthSessionReadModel,
): string {
  return normalizeOptionalString(sessionReadModel.readSource) ?? source;
}

export function isControlledActivityIntakeServerSideAuthSessionFailure(
  result: ControlledActivityIntakeServerSideAuthSessionResult,
): result is ControlledActivityIntakeServerSideAuthSessionFailure {
  return result.ok === false;
}

export function buildControlledActivityIntakeServerSideAuthSessionIdentity(
  input: ControlledActivityIntakeServerSideAuthSessionInput,
): ControlledActivityIntakeServerSideAuthSessionResult {
  const source = input.source ?? "test_injected_session_read_model";
  const sessionReadModel = input.sessionReadModel ?? null;

  if (!sessionReadModel) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_SERVER_SESSION_REQUIRED",
      "Controlled intake requires an injected server-side session read model.",
    );
  }

  if (sessionReadModel.readFailed === true) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_SESSION_READ_FAILED",
      normalizeOptionalString(sessionReadModel.readFailureMessage) ??
        "Controlled intake server-side session read failed.",
    );
  }

  const authSubject = normalizeOptionalString(sessionReadModel.authSubject);

  if (!authSubject) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED",
      "Controlled intake requires non-empty server-side auth subject.",
    );
  }

  if (hasUnsupportedProvider(sessionReadModel.provider)) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_PROVIDER_UNSUPPORTED",
      "Controlled intake supports only explicit auth0 provider in this helper.",
    );
  }

  if (
    !isValidOptionalTimestamp(sessionReadModel.expiresAt) ||
    !isValidOptionalTimestamp(sessionReadModel.issuedAt)
  ) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_SESSION_INVALID",
      "Controlled intake session timestamp metadata is invalid.",
    );
  }

  const provider = normalizeProvider(sessionReadModel.provider);

  if (!provider) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_PROVIDER_UNSUPPORTED",
      "Controlled intake supports only explicit auth0 provider in this helper.",
    );
  }

  const requestSource =
    normalizeOptionalString(input.requestSource) ??
    "controlled-intake-server-side-auth-session-static-helper";

  const email = normalizeOptionalString(sessionReadModel.email);
  const sessionId = normalizeOptionalString(sessionReadModel.sessionId);

  return {
    ok: true,
    layer: CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_LAYER,
    source,
    identity: {
      authSubject,
      provider,
      ...(email ? { email } : {}),
      ...(sessionId ? { sessionId } : {}),
      requestSource,
    },
    evidence: {
      identityEvidence: "server_session",
      providerEvidence: "supported_provider",
      readSource: buildReadSource(source, sessionReadModel),
    },
    guardrails: buildGuardrails(),
  };
}

export function assertControlledActivityIntakeServerSideAuthSessionIdentity(
  result: ControlledActivityIntakeServerSideAuthSessionResult,
): ControlledActivityIntakeServerSideAuthSessionIdentity {
  if (isControlledActivityIntakeServerSideAuthSessionFailure(result)) {
    throw new Error(`${result.code}: ${result.message}`);
  }

  return result.identity;
}