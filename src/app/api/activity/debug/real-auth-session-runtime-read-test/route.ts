import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextResponse } from "next/server";
import { auth0 } from "../../../../../../lib/auth0";
import { buildControlledActivityIntakeServerSideAuthSessionRuntimeBridge } from "../../../../../../lib/activity/controlledIntake/serverSideAuthSessionRuntimeBridge";

export const dynamic = "force-dynamic";

const FIRST_REAL_AUTH_SESSION_RUNTIME_READ_APPROVED = true as const;

const STAGE = "first_real_auth_session_runtime_read_test" as const;
const LAYER =
  "controlled-activity-intake-first-real-auth-session-runtime-read-test-v1" as const;
const REQUEST_SOURCE =
  "controlled-intake-first-real-auth-session-runtime-read-test-real-read-endpoint" as const;
const DIAGNOSTIC_HEADER = "x-controlled-intake-first-real-session-read-test" as const;
const AUTH_BOUNDARY = "project_auth0_server_session" as const;

type FirstRealAuthSessionRuntimeReadDiagnosticFailureCode =
  | "CONTROLLED_INTAKE_FIRST_REAL_SESSION_DEBUG_HEADER_REQUIRED"
  | "CONTROLLED_INTAKE_FIRST_REAL_SESSION_READ_NOT_APPROVED"
  | "CONTROLLED_INTAKE_FIRST_REAL_SESSION_BOUNDARY_UNAVAILABLE"
  | "CONTROLLED_INTAKE_FIRST_REAL_SESSION_READ_FAILED"
  | "CONTROLLED_INTAKE_FIRST_REAL_SESSION_UNSAFE_PAYLOAD"
  | "CONTROLLED_INTAKE_SERVER_SESSION_REQUIRED"
  | "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED"
  | "CONTROLLED_INTAKE_AUTH_SESSION_EXPIRED"
  | "CONTROLLED_INTAKE_AUTH_SESSION_INVALID"
  | "CONTROLLED_INTAKE_AUTH_PROVIDER_UNSUPPORTED"
  | "CONTROLLED_INTAKE_AUTH_BRIDGE_RUNTIME_FAILED"
  | "CONTROLLED_INTAKE_AUTH_BRIDGE_IDENTITY_FAILED"
  | "CONTROLLED_INTAKE_AUTH_BRIDGE_UNSAFE_RESULT";

type FirstRealAuthSessionRuntimeReadDiagnosticGuardrails = {
  readonly debugEndpointOnly: true;
  readonly diagnosticReadOnly: true;
  readonly controlledIntakeRouteChanged: false;
  readonly realAuth0SessionReadAllowed: boolean;
  readonly realAuth0SessionReadExecuted: boolean;
  readonly auth0RuntimeReadExecuted: boolean;
  readonly serverSideSessionReadOnly: true;
  readonly serverSideContextRequired: true;
  readonly clientOwnershipAccepted: false;
  readonly previewHeaderAcceptedForProductionWrite: false;
  readonly dbReadExecuted: false;
  readonly dbWriteExecuted: false;
  readonly sqlExecuted: false;
  readonly aiCallExecuted: false;
  readonly activityEventsInserted: false;
  readonly semanticCandidatesPersisted: false;
  readonly valueObjectsCreated: false;
  readonly stateFactsCreated: false;
  readonly stateDeltasCreated: false;
  readonly stateSnapshotsCreated: false;
};

type SanitizedAuth0Identity = {
  readonly provider: "auth0";
  readonly authSubject: string;
  readonly email?: string;
  readonly sessionId?: string;
};

type SanitizedProjectAuthSession = {
  readonly provider: "auth0";
  readonly sub: string;
  readonly authSubject: string;
  readonly email?: string;
  readonly sessionId?: string;
  readonly user: {
    readonly sub: string;
    readonly authSubject: string;
    readonly email?: string;
    readonly sid?: string;
  };
};

type SessionExtractionResult =
  | {
      readonly ok: true;
      readonly sanitizedSession: SanitizedProjectAuthSession;
      readonly identity: SanitizedAuth0Identity;
    }
  | {
      readonly ok: false;
      readonly code: FirstRealAuthSessionRuntimeReadDiagnosticFailureCode;
      readonly message: string;
      readonly status: number;
    };

type BridgeStatus = {
  readonly connectionOk: boolean;
  readonly runtimeOk: boolean;
  readonly staticIdentityOk: boolean;
};

type FirstRealAuthSessionRuntimeReadDiagnosticSuccess = {
  readonly ok: true;
  readonly stage: typeof STAGE;
  readonly layer: typeof LAYER;
  readonly requestSource: typeof REQUEST_SOURCE;
  readonly sessionPresent: true;
  readonly provider: "auth0";
  readonly authSubject: string;
  readonly email?: string;
  readonly identity: SanitizedAuth0Identity;
  readonly connectionBridgeStatus: BridgeStatus;
  readonly guardrails: FirstRealAuthSessionRuntimeReadDiagnosticGuardrails;
};

type FirstRealAuthSessionRuntimeReadDiagnosticFailure = {
  readonly ok: false;
  readonly stage: typeof STAGE;
  readonly layer: typeof LAYER;
  readonly code: FirstRealAuthSessionRuntimeReadDiagnosticFailureCode;
  readonly message: string;
  readonly requestSource: typeof REQUEST_SOURCE;
  readonly sessionPresent: boolean;
  readonly provider?: "auth0";
  readonly connectionBridgeStatus?: BridgeStatus;
  readonly guardrails: FirstRealAuthSessionRuntimeReadDiagnosticGuardrails;
};

function buildGuardrails(
  realReadExecuted: boolean,
): FirstRealAuthSessionRuntimeReadDiagnosticGuardrails {
  return {
    debugEndpointOnly: true,
    diagnosticReadOnly: true,
    controlledIntakeRouteChanged: false,
    realAuth0SessionReadAllowed: FIRST_REAL_AUTH_SESSION_RUNTIME_READ_APPROVED,
    realAuth0SessionReadExecuted: realReadExecuted,
    auth0RuntimeReadExecuted: realReadExecuted,
    serverSideSessionReadOnly: true,
    serverSideContextRequired: true,
    clientOwnershipAccepted: false,
    previewHeaderAcceptedForProductionWrite: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    sqlExecuted: false,
    aiCallExecuted: false,
    activityEventsInserted: false,
    semanticCandidatesPersisted: false,
    valueObjectsCreated: false,
    stateFactsCreated: false,
    stateDeltasCreated: false,
    stateSnapshotsCreated: false,
  };
}

function buildFailure(
  code: FirstRealAuthSessionRuntimeReadDiagnosticFailureCode,
  message: string,
  sessionPresent: boolean,
  realReadExecuted: boolean,
  connectionBridgeStatus?: BridgeStatus,
): FirstRealAuthSessionRuntimeReadDiagnosticFailure {
  return {
    ok: false,
    stage: STAGE,
    layer: LAYER,
    code,
    message,
    requestSource: REQUEST_SOURCE,
    sessionPresent,
    ...(sessionPresent ? { provider: "auth0" as const } : {}),
    ...(connectionBridgeStatus ? { connectionBridgeStatus } : {}),
    guardrails: buildGuardrails(realReadExecuted),
  };
}

function buildSuccess(
  identity: SanitizedAuth0Identity,
): FirstRealAuthSessionRuntimeReadDiagnosticSuccess {
  return {
    ok: true,
    stage: STAGE,
    layer: LAYER,
    requestSource: REQUEST_SOURCE,
    sessionPresent: true,
    provider: "auth0",
    authSubject: identity.authSubject,
    ...(identity.email ? { email: identity.email } : {}),
    identity,
    connectionBridgeStatus: {
      connectionOk: true,
      runtimeOk: true,
      staticIdentityOk: true,
    },
    guardrails: buildGuardrails(true),
  };
}

function hasDiagnosticHeader(request: Request): boolean {
  const value = request.headers.get(DIAGNOSTIC_HEADER);

  return value?.trim().toLowerCase() === "true";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const value = record[key];

  return isRecord(value) ? value : undefined;
}

function getString(
  record: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = record?.[key];

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    return undefined;
  }

  return normalized;
}

function getNumber(
  record: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  const value = record?.[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function sanitizeIdentifier(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();

  if (normalized.length === 0 || normalized.length > 512) {
    return undefined;
  }

  if (/[\u0000-\u001F\u007F]/u.test(normalized)) {
    return undefined;
  }

  return normalized;
}

function sanitizeEmail(value: string | undefined): string | undefined {
  const normalized = sanitizeIdentifier(value);

  if (!normalized || normalized.length > 320 || !normalized.includes("@")) {
    return undefined;
  }

  return normalized.toLowerCase();
}

function getProvider(
  sessionRecord: Record<string, unknown>,
  userRecord: Record<string, unknown> | undefined,
): string {
  const provider =
    getString(sessionRecord, "provider") ??
    getString(userRecord, "provider") ??
    getString(sessionRecord, "connection") ??
    "auth0";

  return provider.trim().toLowerCase();
}

function getSubject(
  sessionRecord: Record<string, unknown>,
  userRecord: Record<string, unknown> | undefined,
): string | undefined {
  return sanitizeIdentifier(
    getString(userRecord, "sub") ??
      getString(sessionRecord, "sub") ??
      getString(userRecord, "authSubject") ??
      getString(sessionRecord, "authSubject"),
  );
}

function getSafeEmail(
  sessionRecord: Record<string, unknown>,
  userRecord: Record<string, unknown> | undefined,
): string | undefined {
  return sanitizeEmail(getString(userRecord, "email") ?? getString(sessionRecord, "email"));
}

function getSafeSessionId(
  sessionRecord: Record<string, unknown>,
  userRecord: Record<string, unknown> | undefined,
): string | undefined {
  return sanitizeIdentifier(
    getString(sessionRecord, "sid") ??
      getString(userRecord, "sid") ??
      getString(sessionRecord, "sessionId") ??
      getString(userRecord, "sessionId"),
  );
}

function isExpired(
  sessionRecord: Record<string, unknown>,
  userRecord: Record<string, unknown> | undefined,
): boolean {
  const expiresAt =
    getNumber(sessionRecord, "expiresAt") ??
    getNumber(userRecord, "expiresAt") ??
    getNumber(sessionRecord, "exp") ??
    getNumber(userRecord, "exp");

  if (expiresAt === undefined) {
    return false;
  }

  const expiresAtMs = expiresAt < 10_000_000_000 ? expiresAt * 1000 : expiresAt;

  return expiresAtMs <= Date.now();
}

function extractSanitizedSession(sessionValue: unknown): SessionExtractionResult {
  if (!isRecord(sessionValue)) {
    return {
      ok: false,
      code: "CONTROLLED_INTAKE_SERVER_SESSION_REQUIRED",
      message: "Authenticated server session is required.",
      status: 401,
    };
  }

  const userRecord = getRecord(sessionValue, "user");
  const provider = getProvider(sessionValue, userRecord);

  if (provider !== "auth0") {
    return {
      ok: false,
      code: "CONTROLLED_INTAKE_AUTH_PROVIDER_UNSUPPORTED",
      message: "Authenticated server session provider is unsupported.",
      status: 401,
    };
  }

  if (isExpired(sessionValue, userRecord)) {
    return {
      ok: false,
      code: "CONTROLLED_INTAKE_AUTH_SESSION_EXPIRED",
      message: "Authenticated server session is expired.",
      status: 401,
    };
  }

  const authSubject = getSubject(sessionValue, userRecord);

  if (!authSubject) {
    return {
      ok: false,
      code: "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED",
      message: "Authenticated server session subject is required.",
      status: 401,
    };
  }

  const email = getSafeEmail(sessionValue, userRecord);
  const sessionId = getSafeSessionId(sessionValue, userRecord);

  const user: SanitizedProjectAuthSession["user"] = {
    sub: authSubject,
    authSubject,
    ...(email ? { email } : {}),
    ...(sessionId ? { sid: sessionId } : {}),
  };

  const sanitizedSession: SanitizedProjectAuthSession = {
    provider: "auth0",
    sub: authSubject,
    authSubject,
    ...(email ? { email } : {}),
    ...(sessionId ? { sessionId } : {}),
    user,
  };

  const identity: SanitizedAuth0Identity = {
    provider: "auth0",
    authSubject,
    ...(email ? { email } : {}),
    ...(sessionId ? { sessionId } : {}),
  };

  return {
    ok: true,
    sanitizedSession,
    identity,
  };
}

function getBridgeFailureCode(
  bridgeResult: unknown,
): FirstRealAuthSessionRuntimeReadDiagnosticFailureCode {
  if (!isRecord(bridgeResult)) {
    return "CONTROLLED_INTAKE_AUTH_BRIDGE_RUNTIME_FAILED";
  }

  const rawCode = getString(bridgeResult, "code");

  switch (rawCode) {
    case "CONTROLLED_INTAKE_FIRST_REAL_SESSION_UNSAFE_PAYLOAD":
    case "CONTROLLED_INTAKE_SERVER_SESSION_REQUIRED":
    case "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED":
    case "CONTROLLED_INTAKE_AUTH_SESSION_EXPIRED":
    case "CONTROLLED_INTAKE_AUTH_SESSION_INVALID":
    case "CONTROLLED_INTAKE_AUTH_PROVIDER_UNSUPPORTED":
    case "CONTROLLED_INTAKE_AUTH_BRIDGE_RUNTIME_FAILED":
    case "CONTROLLED_INTAKE_AUTH_BRIDGE_IDENTITY_FAILED":
    case "CONTROLLED_INTAKE_AUTH_BRIDGE_UNSAFE_RESULT":
      return rawCode;

    default:
      return "CONTROLLED_INTAKE_AUTH_BRIDGE_RUNTIME_FAILED";
  }
}

function statusForFailure(code: FirstRealAuthSessionRuntimeReadDiagnosticFailureCode): number {
  switch (code) {
    case "CONTROLLED_INTAKE_FIRST_REAL_SESSION_DEBUG_HEADER_REQUIRED":
    case "CONTROLLED_INTAKE_FIRST_REAL_SESSION_READ_NOT_APPROVED":
      return 403;

    case "CONTROLLED_INTAKE_SERVER_SESSION_REQUIRED":
    case "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED":
    case "CONTROLLED_INTAKE_AUTH_SESSION_EXPIRED":
    case "CONTROLLED_INTAKE_AUTH_SESSION_INVALID":
    case "CONTROLLED_INTAKE_AUTH_PROVIDER_UNSUPPORTED":
      return 401;

    default:
      return 500;
  }
}

export async function GET(request: Request) {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  if (!hasDiagnosticHeader(request)) {
    const failure = buildFailure(
      "CONTROLLED_INTAKE_FIRST_REAL_SESSION_DEBUG_HEADER_REQUIRED",
      "Controlled intake first real session diagnostic header is required.",
      false,
      false,
    );

    return NextResponse.json(failure, { status: 403 });
  }

  if (!FIRST_REAL_AUTH_SESSION_RUNTIME_READ_APPROVED) {
    const failure = buildFailure(
      "CONTROLLED_INTAKE_FIRST_REAL_SESSION_READ_NOT_APPROVED",
      "Controlled intake first real session runtime read is not approved.",
      false,
      false,
    );

    return NextResponse.json(failure, { status: 403 });
  }

  if (typeof auth0.getSession !== "function") {
    const failure = buildFailure(
      "CONTROLLED_INTAKE_FIRST_REAL_SESSION_BOUNDARY_UNAVAILABLE",
      "Project Auth0 server session boundary is unavailable.",
      false,
      false,
    );

    return NextResponse.json(failure, { status: 500 });
  }

  let sessionValue: unknown;

  try {
    sessionValue = await auth0.getSession();
  } catch {
    const failure = buildFailure(
      "CONTROLLED_INTAKE_FIRST_REAL_SESSION_READ_FAILED",
      "Project Auth0 server session read failed.",
      false,
      true,
    );

    return NextResponse.json(failure, { status: 500 });
  }

  const extraction = extractSanitizedSession(sessionValue);

  if (!extraction.ok) {
    const failure = buildFailure(
      extraction.code,
      extraction.message,
      false,
      true,
    );

    return NextResponse.json(failure, { status: extraction.status });
  }

  const bridgeResult = await buildControlledActivityIntakeServerSideAuthSessionRuntimeBridge({
    connectionApproved: true,
    runtimeReadApproved: true,
    authBoundary: AUTH_BOUNDARY,
    requestSource: REQUEST_SOURCE,
    injectedProjectAuthSession: extraction.sanitizedSession,
  });

  if (!isRecord(bridgeResult) || bridgeResult["ok"] !== true) {
    const code = getBridgeFailureCode(bridgeResult);
    const failure = buildFailure(
      code,
      "Controlled intake first real session bridge failed.",
      true,
      true,
      {
        connectionOk: false,
        runtimeOk: false,
        staticIdentityOk: false,
      },
    );

    return NextResponse.json(failure, { status: statusForFailure(code) });
  }

  return NextResponse.json(buildSuccess(extraction.identity), { status: 200 });
}