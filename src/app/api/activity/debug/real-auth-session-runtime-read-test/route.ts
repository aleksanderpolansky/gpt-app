import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FIRST_REAL_AUTH_SESSION_RUNTIME_READ_APPROVED = false as const;

const STAGE = "first_real_auth_session_runtime_read_test" as const;
const LAYER =
  "controlled-activity-intake-first-real-auth-session-runtime-read-test-static-v1" as const;
const REQUEST_SOURCE =
  "controlled-intake-first-real-auth-session-runtime-read-test-static-endpoint" as const;
const DIAGNOSTIC_HEADER = "x-controlled-intake-first-real-session-read-test" as const;

type FirstRealAuthSessionRuntimeReadDiagnosticFailureCode =
  | "CONTROLLED_INTAKE_FIRST_REAL_SESSION_DEBUG_HEADER_REQUIRED"
  | "CONTROLLED_INTAKE_FIRST_REAL_SESSION_READ_NOT_APPROVED";

type FirstRealAuthSessionRuntimeReadDiagnosticGuardrails = {
  readonly debugEndpointOnly: true;
  readonly diagnosticReadOnly: true;
  readonly staticDiagnosticEndpointOnly: true;
  readonly controlledIntakeRouteChanged: false;
  readonly realAuth0SessionReadAllowed: false;
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
  readonly activityEventsInserted: false;
  readonly semanticCandidatesPersisted: false;
  readonly valueObjectsCreated: false;
  readonly stateFactsCreated: false;
  readonly stateDeltasCreated: false;
  readonly stateSnapshotsCreated: false;
};

type FirstRealAuthSessionRuntimeReadDiagnosticFailure = {
  readonly ok: false;
  readonly stage: typeof STAGE;
  readonly layer: typeof LAYER;
  readonly code: FirstRealAuthSessionRuntimeReadDiagnosticFailureCode;
  readonly message: string;
  readonly requestSource: typeof REQUEST_SOURCE;
  readonly sessionPresent: false;
  readonly guardrails: FirstRealAuthSessionRuntimeReadDiagnosticGuardrails;
};

function buildGuardrails(): FirstRealAuthSessionRuntimeReadDiagnosticGuardrails {
  return {
    debugEndpointOnly: true,
    diagnosticReadOnly: true,
    staticDiagnosticEndpointOnly: true,
    controlledIntakeRouteChanged: false,
    realAuth0SessionReadAllowed: FIRST_REAL_AUTH_SESSION_RUNTIME_READ_APPROVED,
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
): FirstRealAuthSessionRuntimeReadDiagnosticFailure {
  return {
    ok: false,
    stage: STAGE,
    layer: LAYER,
    code,
    message,
    requestSource: REQUEST_SOURCE,
    sessionPresent: false,
    guardrails: buildGuardrails(),
  };
}

function hasDiagnosticHeader(request: Request): boolean {
  const value = request.headers.get(DIAGNOSTIC_HEADER);

  return value?.trim().toLowerCase() === "true";
}

export async function GET(request: Request) {
  if (!hasDiagnosticHeader(request)) {
    return NextResponse.json(
      buildFailure(
        "CONTROLLED_INTAKE_FIRST_REAL_SESSION_DEBUG_HEADER_REQUIRED",
        "Controlled intake first real session diagnostic header is required.",
      ),
      { status: 403 },
    );
  }

  if (!FIRST_REAL_AUTH_SESSION_RUNTIME_READ_APPROVED) {
    return NextResponse.json(
      buildFailure(
        "CONTROLLED_INTAKE_FIRST_REAL_SESSION_READ_NOT_APPROVED",
        "Controlled intake first real session runtime read is not approved in this static diagnostic endpoint.",
      ),
      { status: 403 },
    );
  }

  return NextResponse.json(
    buildFailure(
      "CONTROLLED_INTAKE_FIRST_REAL_SESSION_READ_NOT_APPROVED",
      "Controlled intake first real session runtime read remains disabled.",
    ),
    { status: 403 },
  );
}