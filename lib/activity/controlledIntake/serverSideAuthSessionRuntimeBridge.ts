import {
  readControlledActivityIntakeServerSideAuthSessionRuntimeConnection,
  isControlledActivityIntakeServerSideAuthSessionRuntimeConnectionFailure,
  type ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionFailure,
  type ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionFailureCode,
  type ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionResult,
  type ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionSuccess,
} from "./serverSideAuthSessionRuntimeConnection";
import {
  readControlledActivityIntakeServerSideAuthSessionRuntime,
  isControlledActivityIntakeServerSideAuthSessionRuntimeFailure,
  type ControlledActivityIntakeServerSideAuthSessionRuntimeFailure,
  type ControlledActivityIntakeServerSideAuthSessionRuntimeFailureCode,
  type ControlledActivityIntakeServerSideAuthSessionRuntimeResult,
  type ControlledActivityIntakeServerSideAuthSessionRuntimeSuccess,
} from "./serverSideAuthSessionRuntime";

export const CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_RUNTIME_BRIDGE_LAYER =
  "controlled-activity-intake-real-auth-session-connection-to-runtime-bridge-static-v1" as const;

export type ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeSource =
  | "test_injected_project_auth_session_bridge";

export type ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeInput = {
  readonly source?: ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeSource;
  readonly requestSource?: string | null;
  readonly connectionApproved?: boolean | null;
  readonly runtimeReadApproved?: boolean | null;
  readonly authBoundary?: "project_auth0_server_session" | "unknown" | string | null;
  readonly debugMode?: boolean | null;
  readonly injectedProjectAuthSession?: unknown;
  readonly injectedProjectAuthError?: string | null;
};

export type ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeGuardrails = {
  readonly bridgeHelperOnly: true;
  readonly staticBridgeOnly: true;
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

export type ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeFailureCode =
  | "CONTROLLED_INTAKE_AUTH_BRIDGE_CONNECTION_FAILED"
  | "CONTROLLED_INTAKE_AUTH_BRIDGE_RUNTIME_FAILED"
  | "CONTROLLED_INTAKE_AUTH_BRIDGE_IDENTITY_FAILED"
  | "CONTROLLED_INTAKE_AUTH_BRIDGE_UNSAFE_RESULT"
  | ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionFailureCode
  | ControlledActivityIntakeServerSideAuthSessionRuntimeFailureCode;

export type ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeIdentity =
  Readonly<Record<string, unknown>>;

export type ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeSuccess = {
  readonly ok: true;
  readonly layer: typeof CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_RUNTIME_BRIDGE_LAYER;
  readonly source: ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeSource;
  readonly identity: ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeIdentity;
  readonly connectionResult: ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionSuccess;
  readonly runtimeResult: ControlledActivityIntakeServerSideAuthSessionRuntimeSuccess;
  readonly guardrails: ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeGuardrails;
};

export type ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeFailure = {
  readonly ok: false;
  readonly layer: typeof CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_RUNTIME_BRIDGE_LAYER;
  readonly source: ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeSource;
  readonly code: ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeFailureCode;
  readonly message: string;
  readonly connectionResult?: ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionResult;
  readonly runtimeResult?: ControlledActivityIntakeServerSideAuthSessionRuntimeResult;
  readonly guardrails: ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeGuardrails;
};

export type ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeResult =
  | ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeSuccess
  | ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeFailure;

function buildGuardrails(): ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeGuardrails {
  return {
    bridgeHelperOnly: true,
    staticBridgeOnly: true,
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

function buildFailure(
  source: ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeSource,
  code: ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeFailureCode,
  message: string,
  connectionResult?: ControlledActivityIntakeServerSideAuthSessionRuntimeConnectionResult,
  runtimeResult?: ControlledActivityIntakeServerSideAuthSessionRuntimeResult,
): ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeFailure {
  return {
    ok: false,
    layer: CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_RUNTIME_BRIDGE_LAYER,
    source,
    code,
    message,
    connectionResult,
    runtimeResult,
    guardrails: buildGuardrails(),
  };
}

function hasUnsafeBridgeData(value: unknown, depth = 0): boolean {
  if (depth > 8) {
    return true;
  }

  if (value === null || value === undefined) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasUnsafeBridgeData(item, depth + 1));
  }

  if (typeof value !== "object") {
    return false;
  }

  const forbiddenKeys = new Set([
    "accesstoken",
    "refreshtoken",
    "idtoken",
    "rawcookie",
    "rawsession",
    "rawprofile",
    "fullauth0userobject",
    "fullproviderpayload",
  ]);

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (forbiddenKeys.has(normalizedKey)) {
      return true;
    }

    if (hasUnsafeBridgeData(nestedValue, depth + 1)) {
      return true;
    }
  }

  return false;
}

function buildIdentityFromRuntimeSuccess(
  runtimeResult: ControlledActivityIntakeServerSideAuthSessionRuntimeSuccess,
): ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeIdentity {
  if (!runtimeResult.staticAuthSessionResult.ok) {
    return {};
  }

  return {
    ...runtimeResult.staticAuthSessionResult.identity,
  } as ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeIdentity;
}

export function isControlledActivityIntakeServerSideAuthSessionRuntimeBridgeFailure(
  result: ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeResult,
): result is ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeFailure {
  return result.ok === false;
}

export function buildControlledActivityIntakeServerSideAuthSessionRuntimeBridge(
  input: ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeInput,
): ControlledActivityIntakeServerSideAuthSessionRuntimeBridgeResult {
  const source = input.source ?? "test_injected_project_auth_session_bridge";

  const connectionResult =
    readControlledActivityIntakeServerSideAuthSessionRuntimeConnection({
      source: "test_injected_project_auth_session",
      requestSource: input.requestSource,
      connectionApproved: input.connectionApproved,
      authBoundary: input.authBoundary,
      debugMode: input.debugMode,
      injectedProjectAuthSession: input.injectedProjectAuthSession,
      injectedProjectAuthError: input.injectedProjectAuthError,
    });

  if (isControlledActivityIntakeServerSideAuthSessionRuntimeConnectionFailure(connectionResult)) {
    return buildFailure(
      source,
      connectionResult.code,
      connectionResult.message,
      connectionResult,
    );
  }

  if (hasUnsafeBridgeData(connectionResult.sessionReadModel)) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_BRIDGE_UNSAFE_RESULT",
      "Controlled intake auth bridge received an unsafe connection result.",
      connectionResult,
    );
  }

  const runtimeResult =
    readControlledActivityIntakeServerSideAuthSessionRuntime({
      source: "test_injected_runtime_read_model",
      requestSource: input.requestSource,
      allowRuntimeRead: input.runtimeReadApproved,
      authBoundary: input.authBoundary,
      debugMode: input.debugMode,
      injectedRuntimeReadModel: connectionResult.sessionReadModel,
    });

  if (isControlledActivityIntakeServerSideAuthSessionRuntimeFailure(runtimeResult)) {
    return buildFailure(
      source,
      runtimeResult.code,
      runtimeResult.message,
      connectionResult,
      runtimeResult,
    );
  }

  if (!runtimeResult.staticAuthSessionResult.ok) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_BRIDGE_IDENTITY_FAILED",
      "Controlled intake auth bridge did not receive a valid static identity.",
      connectionResult,
      runtimeResult,
    );
  }

  if (hasUnsafeBridgeData(runtimeResult.sessionReadModel)) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_BRIDGE_UNSAFE_RESULT",
      "Controlled intake auth bridge received an unsafe runtime result.",
      connectionResult,
      runtimeResult,
    );
  }

  const identity = buildIdentityFromRuntimeSuccess(runtimeResult);

  if (hasUnsafeBridgeData(identity)) {
    return buildFailure(
      source,
      "CONTROLLED_INTAKE_AUTH_BRIDGE_UNSAFE_RESULT",
      "Controlled intake auth bridge received an unsafe identity result.",
      connectionResult,
      runtimeResult,
    );
  }

  return {
    ok: true,
    layer: CONTROLLED_ACTIVITY_INTAKE_SERVER_SIDE_AUTH_SESSION_RUNTIME_BRIDGE_LAYER,
    source,
    identity,
    connectionResult,
    runtimeResult,
    guardrails: buildGuardrails(),
  };
}