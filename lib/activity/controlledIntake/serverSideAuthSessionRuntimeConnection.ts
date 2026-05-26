import type { ControlledActivityIntakeServerSideAuthSessionRuntimeReadModel } from "./serverSideAuthSessionRuntime";

export const CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_RUNTIME_CONNECTION_LAYER =
  "controlled-activity-intake-real-auth-session-runtime-connection-static-v1" as const;

export type ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionSource =
  | "project_auth0_server_session_connection"
  | "test_injected_project_auth_session";

export type ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionAuthBoundary =
  | "project_auth0_server_session";

export type ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionInput = {
  readonly source?: ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionSource;
  readonly requestSource?: string | null;
  readonly connectionApproved?: boolean | null;
  readonly authBoundary?:
    | ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionAuthBoundary
    | "unknown"
    | string
    | null;
  readonly debugMode?: boolean | null;
  readonly injectedProjectAuthSession?: unknown;
  readonly injectedProjectAuthError?: string | null;
};

export type ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionReadModel =
  ControlledActivityIntakeServerSideAuthSessionRuntimeReadModel;

export type ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionGuardrails = {
  readonly connectionHelperOnly: true;
  readonly staticConnectionHelperOnly: true;
  readonly realAuth0SessionReadExecuted: false;
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

export type ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionFailureCode =
  | "CONTROLLED_INTAKE_AUTH_CONNECTION_NOT_APPROVED"
  | "CONTROLLED_INTAKE_AUTH_CONNECTION_UNAVAILABLE"
  | "CONTROLLED_INTAKE_AUTH_CONNECTION_READ_FAILED"
  | "CONTROLLED_INTAKE_AUTH_CONNECTION_RETURNED_UNSAFE_PAYLOAD"
  | "CONTROLLED_INTAKE_SERVER_SESSION_REQUIRED"
  | "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED"
  | "CONTROLLED_INTAKE_AUTH_SESSION_EXPIRED"
  | "CONTROLLED_INTAKE_AUTH_SESSION_INVALID"
  | "CONTROLLED_INTAKE_AUTH_PROVIDER_UNSUPPORTED";

export type ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionSuccess = {
  readonly ok: true;
  readonly layer: typeof CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_RUNTIME_CONNECTION_LAYER;
  readonly source: ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionSource;
  readonly sessionReadModel: ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionReadModel;
  readonly guardrails: ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionGuardrails;
};

export type ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionFailure = {
  readonly ok: false;
  readonly layer: typeof CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_RUNTIME_CONNECTION_LAYER;
  readonly source: ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionSource;
  readonly code: ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionFailureCode;
  readonly message: string;
  readonly sessionReadModel: ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionReadModel;
  readonly guardrails: ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionGuardrails;
};

export type ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionResult =
  | ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionSuccess
  | ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionFailure;

type ProjectSessionRecord = Record<string, unknown>;

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function asRecord(value: unknown): ProjectSessionRecord | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as ProjectSessionRecord;
}

function readString(record: ProjectSessionRecord, key: string): string | undefined {
  return normalizeOptionalString(record[key]);
}

function readSafeTimestamp(
  record: ProjectSessionRecord,
  primaryKey: string,
  fallbackKey?: string,
): string | number | undefined {
  const primaryValue = record[primaryKey];
  const fallbackValue = fallbackKey ? record[fallbackKey] : undefined;
  const value = primaryValue ?? fallbackValue;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return normalizeOptionalString(value);
}

function containsUnsafeProviderData(value: unknown, depth = 0): boolean {
  if (depth > 8) {
    return true;
  }

  if (value === null || value === undefined) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsUnsafeProviderData(item, depth + 1));
  }

  if (typeof value !== "object") {
    return false;
  }

  for (const [key, nestedValue] of Object.entries(value as ProjectSessionRecord)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (
      normalizedKey.includes("token") ||
      normalizedKey.includes("cookie") ||
      normalizedKey.includes("rawsession") ||
      normalizedKey.includes("rawprofile") ||
      normalizedKey.includes("providerpayload")
    ) {
      return true;
    }

    if (containsUnsafeProviderData(nestedValue, depth + 1)) {
      return true;
    }
  }

  return false;
}

function buildGuardrails(): ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionGuardrails {
  return {
    connectionHelperOnly: true,
    staticConnectionHelperOnly: true,
    realAuth0SessionReadExecuted: false,
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
): ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionReadModel {
  return {
    provider: "auth0",
    rawSessionAvailable: false,
    readSource: "project_auth0_server_session_connection",
    readFailed: true,
    readFailureMessage,
  };
}

function buildFailure(
  source: ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionSource,
  code: ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionFailureCode,
  message: string,
): ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionFailure {
  return {
    ok: false,
    layer: CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_RUNTIME_CONNECTION_LAYER,
    source,
    code,
    message,
    sessionReadModel: buildFailureSessionReadModel(message),
    guardrails: buildGuardrails(),
  };
}

function normalizeAuthBoundary(
  value: unknown,
): ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionAuthBoundary | undefined {
  const normalized = normalizeOptionalString(value);

  return normalized === "project_auth0_server_session"
    ? "project_auth0_server_session"
    : undefined;
}

function readNestedSessionRecord(session: ProjectSessionRecord): ProjectSessionRecord | undefined {
  return asRecord(session.user) ?? asRecord(session.profile);
}

function hasExpiredSession(session: ProjectSessionRecord): boolean {
  if (session.expired === true) {
    return true;
  }

  const expiresAt = readSafeTimestamp(session, "exp", "expiresAt");

  if (typeof expiresAt === "number") {
    const secondsLike = expiresAt < 10_000_000_000;
    const expirationMs = secondsLike ? expiresAt * 1000 : expiresAt;

    return expirationMs <= Date.now();
  }

  if (typeof expiresAt === "string") {
    const parsedMs = Date.parse(expiresAt);

    return Number.isFinite(parsedMs) && parsedMs <= Date.now();
  }

  return false;
}

function buildSessionReadModelFromProjectSession(
  projectAuthSession: ProjectSessionRecord,
): ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionReadModel {
  const nestedSessionRecord = readNestedSessionRecord(projectAuthSession);

  const providerRaw =
    readString(projectAuthSession, "provider") ??
    readString(nestedSessionRecord ?? {}, "provider") ??
    "auth0";

  const provider = providerRaw.toLowerCase();

  const authSubject =
    readString(projectAuthSession, "sub") ??
    readString(projectAuthSession, "authSubject") ??
    readString(nestedSessionRecord ?? {}, "sub") ??
    readString(nestedSessionRecord ?? {}, "authSubject");

  const email =
    readString(projectAuthSession, "email") ??
    readString(nestedSessionRecord ?? {}, "email");

  const sessionId =
    readString(projectAuthSession, "sid") ??
    readString(projectAuthSession, "sessionId") ??
    readString(nestedSessionRecord ?? {}, "sid") ??
    readString(nestedSessionRecord ?? {}, "sessionId");

  const expiresAt =
    readSafeTimestamp(projectAuthSession, "exp", "expiresAt") ??
    readSafeTimestamp(nestedSessionRecord ?? {}, "exp", "expiresAt");

  const issuedAt =
    readSafeTimestamp(projectAuthSession, "iat", "issuedAt") ??
    readSafeTimestamp(nestedSessionRecord ?? {}, "iat", "issuedAt");

  return {
    provider,
    authSubject,
    email,
    sessionId,
    expiresAt,
    issuedAt,
    rawSessionAvailable: true,
    readSource: "project_auth0_server_session_connection",
    readFailed: false,
    readFailureMessage: undefined,
  };
}

export function isControlledActivityIntakeServerSideAuthSessionRuntimeConnectionFailure(
  result: ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionResult,
): result is ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionFailure {
  return result.ok === false;
}

export function readControlledActivityIntakeServerSideAuthSessionRuntimeConnection(
  input: ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionInput,
): ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionResult {
  const source = input.source ?? "test_injected_project_auth_session";

  if (input.connectionApproved !== true) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_CONNECTION_NOT_APPROVED",
      "Controlled intake auth connection requires explicit approval.",
    );
  }

  if (!normalizeAuthBoundary(input.authBoundary)) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_CONNECTION_UNAVAILABLE",
      "Controlled intake auth connection requires the project Auth0 server-session boundary.",
    );
  }

  const injectedProjectAuthError = normalizeOptionalString(input.injectedProjectAuthError);

  if (injectedProjectAuthError) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_CONNECTION_READ_FAILED",
      injectedProjectAuthError,
    );
  }

  const projectAuthSession = asRecord(input.injectedProjectAuthSession);

  if (!projectAuthSession) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_SERVER_SESSION_REQUIRED",
      "Controlled intake auth connection requires a project auth session object.",
    );
  }

  if (containsUnsafeProviderData(projectAuthSession)) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_CONNECTION_RETURNED_UNSAFE_PAYLOAD",
      "Controlled intake auth connection received an unsafe provider payload.",
    );
  }

  if (projectAuthSession.malformed === true) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_SESSION_INVALID",
      "Controlled intake auth connection received a malformed project auth session.",
    );
  }

  if (hasExpiredSession(projectAuthSession)) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_SESSION_EXPIRED",
      "Controlled intake auth connection received an expired project auth session.",
    );
  }

  const sessionReadModel = buildSessionReadModelFromProjectSession(projectAuthSession);

  if (sessionReadModel.provider !== "auth0") {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_PROVIDER_UNSUPPORTED",
      "Controlled intake auth connection supports only auth0 provider.",
    );
  }

  if (!normalizeOptionalString(sessionReadModel.authSubject)) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED",
      "Controlled intake auth connection requires a stable Auth0 subject.",
    );
  }

  return {
    ok: true,
    layer: CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_RUNTIME_CONNECTION_LAYER,
    source,
    sessionReadModel,
    guardrails: buildGuardrails(),
  };
}