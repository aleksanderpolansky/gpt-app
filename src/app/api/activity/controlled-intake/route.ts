import { NextRequest, NextResponse } from "next/server";

import { auth0 } from "../../../../../lib/auth0";
import {
  buildControlledActivityIntakeNoWritePreviewTrustedContext,
  type ControlledActivityIntakeAuthContextFailure,
  type ControlledActivityIntakeAuthContextResult,
} from "../../../../../lib/activity/controlledIntake/authContext";
import { buildControlledActivityIntakeIdempotency } from "../../../../../lib/activity/controlledIntake/idempotency";
import { buildControlledActivityIntakePayload } from "../../../../../lib/activity/controlledIntake/payloadBuilder";
import { buildControlledActivityIntakeActivityEventsStaticRow } from "../../../../../lib/activity/controlledIntake/persist";
import {
  buildControlledActivityIntakeProductionTrustedContext,
  isControlledActivityIntakeProductionAuthMappingFailure,
} from "../../../../../lib/activity/controlledIntake/productionAuthMapping";
import {
  buildControlledActivityIntakeServerSideAppUserMapping,
  isControlledActivityIntakeServerSideAppUserMappingFailure,
} from "../../../../../lib/activity/controlledIntake/serverSideAppUserMapping";
import {
  mapServerSideAppUserReadOnly,
  type ServerSideAppUserMappingReadOnlyResult,
  type ServerSideAppUserMappingReadOnlyStatus,
} from "../../../../../lib/activity/controlledIntake/serverSideAppUserMappingReadOnly";
import { validateControlledActivityIntake } from "../../../../../lib/activity/controlledIntake/validator";

export const dynamic = "force-dynamic";

const CONTROLLED_ACTIVITY_INTAKE_ROUTE_LAYER =
  "controlled-activity-intake-route-auth-integration-no-write-v1" as const;

const NO_WRITE_PREVIEW_HEADER = "x-controlled-intake-no-write-preview";
const AUTH_MAPPING_MODE_HEADER = "x-controlled-intake-auth-mapping-mode";

const PREVIEW_APP_USER_ID_HEADER =
  "x-controlled-intake-preview-app-user-id";
const PREVIEW_ACTOR_ID_HEADER = "x-controlled-intake-preview-actor-id";
const PREVIEW_ORGANIZATION_ID_HEADER =
  "x-controlled-intake-preview-organization-id";
const PREVIEW_SPACE_ID_HEADER = "x-controlled-intake-preview-space-id";
const PREVIEW_REQUEST_SOURCE_HEADER =
  "x-controlled-intake-preview-request-source";

const PREVIEW_AUTH_SUBJECT_HEADER =
  "x-controlled-intake-preview-auth-subject";
const PREVIEW_MAPPED_APP_USER_ID_HEADER =
  "x-controlled-intake-preview-mapped-app-user-id";
const PREVIEW_MAPPED_USER_ID_HEADER =
  "x-controlled-intake-preview-mapped-user-id";
const PREVIEW_MAPPED_ACTOR_ID_HEADER =
  "x-controlled-intake-preview-mapped-actor-id";
const PREVIEW_MAPPED_ORGANIZATION_ID_HEADER =
  "x-controlled-intake-preview-mapped-organization-id";
const PREVIEW_MAPPED_SPACE_ID_HEADER =
  "x-controlled-intake-preview-mapped-space-id";

const PREVIEW_SERVER_AUTH_SUBJECT_HEADER =
  "x-controlled-intake-preview-server-auth-subject";
const PREVIEW_SERVER_PROVIDER_HEADER =
  "x-controlled-intake-preview-server-provider";
const PREVIEW_SERVER_EMAIL_HEADER =
  "x-controlled-intake-preview-server-email";
const PREVIEW_SERVER_SESSION_ID_HEADER =
  "x-controlled-intake-preview-server-session-id";

const PREVIEW_APP_USER_READ_MODEL_APP_USER_ID_HEADER =
  "x-controlled-intake-preview-app-user-read-model-app-user-id";
const PREVIEW_APP_USER_READ_MODEL_INTERNAL_USER_ID_HEADER =
  "x-controlled-intake-preview-app-user-read-model-internal-user-id";
const PREVIEW_APP_USER_READ_MODEL_AUTH_SUBJECT_HEADER =
  "x-controlled-intake-preview-app-user-read-model-auth-subject";
const PREVIEW_APP_USER_READ_MODEL_SOURCE_HEADER =
  "x-controlled-intake-preview-app-user-read-model-source";
const PREVIEW_APP_USER_READ_MODEL_STATUS_HEADER =
  "x-controlled-intake-preview-app-user-read-model-status";
const PREVIEW_APP_USER_READ_MODEL_EMAIL_HEADER =
  "x-controlled-intake-preview-app-user-read-model-email";

const PREVIEW_REQUESTED_ACTOR_ID_HEADER =
  "x-controlled-intake-preview-requested-actor-id";
const PREVIEW_REQUESTED_ORGANIZATION_ID_HEADER =
  "x-controlled-intake-preview-requested-organization-id";
const PREVIEW_REQUESTED_SPACE_ID_HEADER =
  "x-controlled-intake-preview-requested-space-id";

const PREVIEW_MEMBERSHIP_ACTOR_ID_HEADER =
  "x-controlled-intake-preview-membership-actor-id";
const PREVIEW_MEMBERSHIP_ORGANIZATION_ID_HEADER =
  "x-controlled-intake-preview-membership-organization-id";
const PREVIEW_MEMBERSHIP_SPACE_ID_HEADER =
  "x-controlled-intake-preview-membership-space-id";
const PREVIEW_MEMBERSHIP_ACTOR_STATUS_HEADER =
  "x-controlled-intake-preview-membership-actor-status";
const PREVIEW_MEMBERSHIP_ORGANIZATION_STATUS_HEADER =
  "x-controlled-intake-preview-membership-organization-status";
const PREVIEW_MEMBERSHIP_SPACE_STATUS_HEADER =
  "x-controlled-intake-preview-membership-space-status";
const PREVIEW_MEMBERSHIP_ROLE_HEADER =
  "x-controlled-intake-preview-membership-role";
const PREVIEW_MEMBERSHIP_SOURCE_HEADER =
  "x-controlled-intake-preview-membership-source";

const TRUSTED_SERVER_PROVIDER = "auth0" as const;

type UnknownRecord = Record<string, unknown>;

type ControlledActivityIntakeRouteMode =
  | "no_write_preview"
  | "production_static_preview"
  | "server_side_static_preview"
  | "server_side_read_only_mapping_preview";

type ControlledActivityIntakeRouteErrorCode =
  | "CONTROLLED_INTAKE_NO_WRITE_PREVIEW_REQUIRED"
  | "CONTROLLED_INTAKE_INVALID_JSON"
  | "CONTROLLED_INTAKE_VALIDATION_FAILED"
  | "CONTROLLED_INTAKE_TRUSTED_CONTEXT_APP_USER_REQUIRED"
  | "CONTROLLED_INTAKE_AUTH_IDENTITY_REQUIRED"
  | "CONTROLLED_INTAKE_SERVER_SESSION_REQUIRED"
  | "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED"
  | "CONTROLLED_INTAKE_APP_USER_MAPPING_REQUIRED"
  | "CONTROLLED_INTAKE_APP_USER_MAPPING_AMBIGUOUS"
  | "CONTROLLED_INTAKE_APP_USER_MAPPING_BLOCKED"
  | "CONTROLLED_INTAKE_APP_USER_MAPPING_LOOKUP_FAILED"
  | "CONTROLLED_INTAKE_AUTH_SUBJECT_MISMATCH"
  | "CONTROLLED_INTAKE_CONTEXT_NOT_VERIFIED"
  | "CONTROLLED_INTAKE_ACTOR_NOT_ALLOWED"
  | "CONTROLLED_INTAKE_ORGANIZATION_NOT_ALLOWED"
  | "CONTROLLED_INTAKE_SPACE_NOT_ALLOWED";

type ControlledActivityIntakeRouteGuardrails = {
  readonly routeAuthIntegrated: true;
  readonly routeProductionAuthMappingIntegrated: true;
  readonly routeServerSideAppUserMappingIntegrated: true;
  readonly routeScaffoldOnly: true;
  readonly noWritePreview: true;
  readonly productionWriteEnabled: false;
  readonly previewHeaderAcceptedForProductionWrite: false;
  readonly dbReadExecuted: boolean;
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

type ControlledActivityIntakeRouteServerSideAppUserMappingProof = {
  readonly serverSideAppUserMappingExecuted: boolean;
  readonly serverSideAppUserMappingStatus:
    | ServerSideAppUserMappingReadOnlyStatus
    | null;
  readonly serverSideAppUserMapped: boolean;
  readonly serverSideAppUserMappingDbReadExecuted: boolean;
  readonly serverSideAppUserMappingFailClosed: boolean;
  readonly serverSideAppUserMappingSelectedColumns: "id,auth0_sub" | null;
  readonly serverSideAppUserMappingTableName: "public.app_users" | null;
  readonly appUserInactiveSupported: false;
  readonly appUserInactiveCheckExecuted: false;
};

type RouteErrorResponse = {
  readonly ok: false;
  readonly routeLayer: typeof CONTROLLED_ACTIVITY_INTAKE_ROUTE_LAYER;
  readonly code: ControlledActivityIntakeRouteErrorCode;
  readonly message: string;
  readonly issues?: unknown;
  readonly serverSideAppUserMapping?: ControlledActivityIntakeRouteServerSideAppUserMappingProof;
  readonly guardrails: ControlledActivityIntakeRouteGuardrails;
};

type RouteSuccessResponse = {
  readonly ok: true;
  readonly routeLayer: typeof CONTROLLED_ACTIVITY_INTAKE_ROUTE_LAYER;
  readonly mode: ControlledActivityIntakeRouteMode;
  readonly validation?: {
    readonly ok: true;
  };
  readonly payload?: unknown;
  readonly idempotency?: unknown;
  readonly staticRowPreview?: unknown;
  readonly productionAuthMapping?: unknown;
  readonly serverSideAppUserMapping?: unknown;
  readonly trustedContextPreview?: unknown;
  readonly guardrails: ControlledActivityIntakeRouteGuardrails;
};

type ControlledActivityIntakeValidatedPayloadSuccess = {
  readonly ok: true;
  readonly payload: ReturnType<typeof buildControlledActivityIntakePayload>;
};

type ControlledActivityIntakeValidatedPayloadFailure = {
  readonly ok: false;
  readonly response: NextResponse<RouteErrorResponse>;
};

type ControlledActivityIntakeValidatedPayloadResult =
  | ControlledActivityIntakeValidatedPayloadSuccess
  | ControlledActivityIntakeValidatedPayloadFailure;

function isControlledActivityIntakeRouteAuthContextFailure(
  result: ControlledActivityIntakeAuthContextResult,
): result is ControlledActivityIntakeAuthContextFailure {
  return result.ok === false;
}

function isControlledActivityIntakeValidatedPayloadFailure(
  result: ControlledActivityIntakeValidatedPayloadResult,
): result is ControlledActivityIntakeValidatedPayloadFailure {
  return result.ok === false;
}

function buildRouteGuardrails(input?: {
  readonly dbReadExecuted?: boolean;
}): ControlledActivityIntakeRouteGuardrails {
  return {
    routeAuthIntegrated: true,
    routeProductionAuthMappingIntegrated: true,
    routeServerSideAppUserMappingIntegrated: true,
    routeScaffoldOnly: true,
    noWritePreview: true,
    productionWriteEnabled: false,
    previewHeaderAcceptedForProductionWrite: false,
    dbReadExecuted: input?.dbReadExecuted ?? false,
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

function readHeaderString(
  request: NextRequest,
  headerName: string,
): string | undefined {
  const rawValue = request.headers.get(headerName);

  if (typeof rawValue !== "string") {
    return undefined;
  }

  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildErrorResponse(
  code: ControlledActivityIntakeRouteErrorCode,
  message: string,
  status: number,
  issues?: unknown,
  serverSideAppUserMapping?: ControlledActivityIntakeRouteServerSideAppUserMappingProof,
): NextResponse<RouteErrorResponse> {
  return NextResponse.json(
    {
      ok: false,
      routeLayer: CONTROLLED_ACTIVITY_INTAKE_ROUTE_LAYER,
      code,
      message,
      ...(typeof issues !== "undefined" ? { issues } : {}),
      ...(serverSideAppUserMapping ? { serverSideAppUserMapping } : {}),
      guardrails: buildRouteGuardrails({
        dbReadExecuted:
          serverSideAppUserMapping?.serverSideAppUserMappingDbReadExecuted ??
          false,
      }),
    },
    { status },
  );
}

function buildServerSideMappingFailureStatus(
  code: ControlledActivityIntakeRouteErrorCode,
): number {
  if (
    code === "CONTROLLED_INTAKE_SERVER_SESSION_REQUIRED" ||
    code === "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED" ||
    code === "CONTROLLED_INTAKE_APP_USER_MAPPING_REQUIRED"
  ) {
    return 401;
  }

  if (
    code === "CONTROLLED_INTAKE_APP_USER_MAPPING_AMBIGUOUS" ||
    code === "CONTROLLED_INTAKE_AUTH_SUBJECT_MISMATCH"
  ) {
    return 409;
  }

  if (code === "CONTROLLED_INTAKE_APP_USER_MAPPING_LOOKUP_FAILED") {
    return 500;
  }

  if (
    code === "CONTROLLED_INTAKE_APP_USER_MAPPING_BLOCKED" ||
    code === "CONTROLLED_INTAKE_CONTEXT_NOT_VERIFIED" ||
    code === "CONTROLLED_INTAKE_ACTOR_NOT_ALLOWED" ||
    code === "CONTROLLED_INTAKE_ORGANIZATION_NOT_ALLOWED" ||
    code === "CONTROLLED_INTAKE_SPACE_NOT_ALLOWED"
  ) {
    return 403;
  }

  return 400;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringProperty(source: unknown, key: string): string | null {
  if (!isRecord(source)) {
    return null;
  }

  const value = source[key];

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function readAuthSubjectFromSession(session: unknown): string | null {
  if (!isRecord(session)) {
    return null;
  }

  const user = session.user;

  if (!isRecord(user)) {
    return null;
  }

  return readStringProperty(user, "sub");
}

function buildNotExecutedServerSideAppUserMappingProof(): ControlledActivityIntakeRouteServerSideAppUserMappingProof {
  return {
    serverSideAppUserMappingExecuted: false,
    serverSideAppUserMappingStatus: null,
    serverSideAppUserMapped: false,
    serverSideAppUserMappingDbReadExecuted: false,
    serverSideAppUserMappingFailClosed: true,
    serverSideAppUserMappingSelectedColumns: null,
    serverSideAppUserMappingTableName: null,
    appUserInactiveSupported: false,
    appUserInactiveCheckExecuted: false,
  };
}

function buildSanitizedServerSideAppUserMappingProof(
  result: ServerSideAppUserMappingReadOnlyResult,
): ControlledActivityIntakeRouteServerSideAppUserMappingProof {
  return {
    serverSideAppUserMappingExecuted: true,
    serverSideAppUserMappingStatus: result.mappingStatus,
    serverSideAppUserMapped: result.mappedUserFound,
    serverSideAppUserMappingDbReadExecuted: result.dbReadExecuted,
    serverSideAppUserMappingFailClosed: result.failClosed,
    serverSideAppUserMappingSelectedColumns: result.selectedColumns,
    serverSideAppUserMappingTableName: result.tableName,
    appUserInactiveSupported: false,
    appUserInactiveCheckExecuted: false,
  };
}

function buildReadOnlyMappingFailureRouteErrorCode(
  mappingStatus: ServerSideAppUserMappingReadOnlyStatus,
): ControlledActivityIntakeRouteErrorCode {
  if (mappingStatus === "provider_not_supported") {
    return "CONTROLLED_INTAKE_AUTH_IDENTITY_REQUIRED";
  }

  if (mappingStatus === "missing_auth_subject") {
    return "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED";
  }

  if (mappingStatus === "app_user_duplicate") {
    return "CONTROLLED_INTAKE_APP_USER_MAPPING_AMBIGUOUS";
  }

  if (mappingStatus === "app_user_lookup_error") {
    return "CONTROLLED_INTAKE_APP_USER_MAPPING_LOOKUP_FAILED";
  }

  return "CONTROLLED_INTAKE_APP_USER_MAPPING_REQUIRED";
}

function buildReadOnlyMappingFailureMessage(
  mappingStatus: ServerSideAppUserMappingReadOnlyStatus,
): string {
  if (mappingStatus === "provider_not_supported") {
    return "Controlled intake requires supported trusted server-side auth provider.";
  }

  if (mappingStatus === "missing_auth_subject") {
    return "Controlled intake requires trusted server-side auth subject.";
  }

  if (mappingStatus === "app_user_duplicate") {
    return "Controlled intake app user mapping returned duplicate rows and failed closed.";
  }

  if (mappingStatus === "app_user_lookup_error") {
    return "Controlled intake app user mapping lookup failed and failed closed.";
  }

  return "Controlled intake requires mapped internal app user.";
}

async function readJsonBody(request: NextRequest): Promise<unknown> {
  return await request.json();
}

async function buildValidatedPayloadFromRequest(
  request: NextRequest,
): Promise<ControlledActivityIntakeValidatedPayloadResult> {
  let body: unknown;

  try {
    body = await readJsonBody(request);
  } catch {
    return {
      ok: false,
      response: buildErrorResponse(
        "CONTROLLED_INTAKE_INVALID_JSON",
        "Request body must be valid JSON.",
        400,
      ),
    };
  }

  const validation = validateControlledActivityIntake(body);

  if (!validation.ok) {
    return {
      ok: false,
      response: buildErrorResponse(
        "CONTROLLED_INTAKE_VALIDATION_FAILED",
        "Controlled activity intake validation failed.",
        400,
        validation.issues,
      ),
    };
  }

  return {
    ok: true,
    payload: buildControlledActivityIntakePayload(validation.value),
  };
}

async function handleLegacyNoWritePreview(
  request: NextRequest,
): Promise<NextResponse<RouteErrorResponse | RouteSuccessResponse>> {
  const authContext = buildControlledActivityIntakeNoWritePreviewTrustedContext({
    appUserId: readHeaderString(request, PREVIEW_APP_USER_ID_HEADER),
    actorId: readHeaderString(request, PREVIEW_ACTOR_ID_HEADER),
    organizationId: readHeaderString(request, PREVIEW_ORGANIZATION_ID_HEADER),
    spaceId: readHeaderString(request, PREVIEW_SPACE_ID_HEADER),
    requestSource: readHeaderString(request, PREVIEW_REQUEST_SOURCE_HEADER),
  });

  if (isControlledActivityIntakeRouteAuthContextFailure(authContext)) {
    return buildErrorResponse(
      authContext.code,
      authContext.message,
      401,
      {
        source: authContext.source,
      },
    );
  }

  const payloadResult = await buildValidatedPayloadFromRequest(request);

  if (isControlledActivityIntakeValidatedPayloadFailure(payloadResult)) {
    return payloadResult.response;
  }

  const trustedContext = authContext.trustedContext;
  const payload = payloadResult.payload;
  const idempotency = buildControlledActivityIntakeIdempotency(
    payload,
    trustedContext,
  );
  const staticRowPreview = buildControlledActivityIntakeActivityEventsStaticRow({
    payload,
    idempotency,
    trustedContext,
  });

  return NextResponse.json(
    {
      ok: true,
      routeLayer: CONTROLLED_ACTIVITY_INTAKE_ROUTE_LAYER,
      mode: "no_write_preview",
      validation: {
        ok: true,
      },
      payload,
      idempotency,
      staticRowPreview,
      guardrails: buildRouteGuardrails(),
    },
    { status: 200 },
  );
}

async function handleProductionStaticPreview(
  request: NextRequest,
): Promise<NextResponse<RouteErrorResponse | RouteSuccessResponse>> {
  const productionAuthMapping =
    buildControlledActivityIntakeProductionTrustedContext({
      source: "production_auth_session",
      identity: {
        sub: readHeaderString(request, PREVIEW_AUTH_SUBJECT_HEADER),
        provider: "controlled-intake-production-static-preview",
      },
      mapping: {
        appUserId: readHeaderString(
          request,
          PREVIEW_MAPPED_APP_USER_ID_HEADER,
        ),
        userId: readHeaderString(request, PREVIEW_MAPPED_USER_ID_HEADER),
        actorId: readHeaderString(request, PREVIEW_MAPPED_ACTOR_ID_HEADER),
        organizationId: readHeaderString(
          request,
          PREVIEW_MAPPED_ORGANIZATION_ID_HEADER,
        ),
        spaceId: readHeaderString(request, PREVIEW_MAPPED_SPACE_ID_HEADER),
      },
      requestSource:
        readHeaderString(request, PREVIEW_REQUEST_SOURCE_HEADER) ??
        "controlled-intake-route-production-static-preview",
    });

  if (
    isControlledActivityIntakeProductionAuthMappingFailure(
      productionAuthMapping,
    )
  ) {
    return buildErrorResponse(
      productionAuthMapping.code,
      productionAuthMapping.message,
      401,
      {
        source: productionAuthMapping.source,
      },
    );
  }

  const payloadResult = await buildValidatedPayloadFromRequest(request);

  if (isControlledActivityIntakeValidatedPayloadFailure(payloadResult)) {
    return payloadResult.response;
  }

  const trustedContext = productionAuthMapping.trustedContext;
  const payload = payloadResult.payload;
  const idempotency = buildControlledActivityIntakeIdempotency(
    payload,
    trustedContext,
  );
  const staticRowPreview = buildControlledActivityIntakeActivityEventsStaticRow({
    payload,
    idempotency,
    trustedContext,
  });

  return NextResponse.json(
    {
      ok: true,
      routeLayer: CONTROLLED_ACTIVITY_INTAKE_ROUTE_LAYER,
      mode: "production_static_preview",
      validation: {
        ok: true,
      },
      productionAuthMapping,
      trustedContextPreview: trustedContext,
      payload,
      idempotency,
      staticRowPreview,
      guardrails: buildRouteGuardrails(),
    },
    { status: 200 },
  );
}

async function handleServerSideStaticPreview(
  request: NextRequest,
): Promise<NextResponse<RouteErrorResponse | RouteSuccessResponse>> {
  const serverSideAppUserMapping =
    buildControlledActivityIntakeServerSideAppUserMapping({
      source: "test_static_helper",
      identity: {
        authSubject: readHeaderString(
          request,
          PREVIEW_SERVER_AUTH_SUBJECT_HEADER,
        ),
        provider: readHeaderString(request, PREVIEW_SERVER_PROVIDER_HEADER),
        email: readHeaderString(request, PREVIEW_SERVER_EMAIL_HEADER),
        sessionId: readHeaderString(request, PREVIEW_SERVER_SESSION_ID_HEADER),
        requestSource: readHeaderString(request, PREVIEW_REQUEST_SOURCE_HEADER),
      },
      appUserReadModel: {
        appUserId: readHeaderString(
          request,
          PREVIEW_APP_USER_READ_MODEL_APP_USER_ID_HEADER,
        ),
        internalUserId: readHeaderString(
          request,
          PREVIEW_APP_USER_READ_MODEL_INTERNAL_USER_ID_HEADER,
        ),
        authSubject: readHeaderString(
          request,
          PREVIEW_APP_USER_READ_MODEL_AUTH_SUBJECT_HEADER,
        ),
        mappingSource:
          readHeaderString(
            request,
            PREVIEW_APP_USER_READ_MODEL_SOURCE_HEADER,
          ) ?? "test_injected_read_model",
        mappingStatus:
          readHeaderString(
            request,
            PREVIEW_APP_USER_READ_MODEL_STATUS_HEADER,
          ) ?? "missing",
        email: readHeaderString(
          request,
          PREVIEW_APP_USER_READ_MODEL_EMAIL_HEADER,
        ),
      },
      requestedContext: {
        actorId: readHeaderString(request, PREVIEW_REQUESTED_ACTOR_ID_HEADER),
        organizationId: readHeaderString(
          request,
          PREVIEW_REQUESTED_ORGANIZATION_ID_HEADER,
        ),
        spaceId: readHeaderString(request, PREVIEW_REQUESTED_SPACE_ID_HEADER),
      },
      membershipReadModel: {
        actorId: readHeaderString(request, PREVIEW_MEMBERSHIP_ACTOR_ID_HEADER),
        organizationId: readHeaderString(
          request,
          PREVIEW_MEMBERSHIP_ORGANIZATION_ID_HEADER,
        ),
        spaceId: readHeaderString(request, PREVIEW_MEMBERSHIP_SPACE_ID_HEADER),
        actorStatus: readHeaderString(
          request,
          PREVIEW_MEMBERSHIP_ACTOR_STATUS_HEADER,
        ),
        organizationMembershipStatus: readHeaderString(
          request,
          PREVIEW_MEMBERSHIP_ORGANIZATION_STATUS_HEADER,
        ),
        spaceMembershipStatus: readHeaderString(
          request,
          PREVIEW_MEMBERSHIP_SPACE_STATUS_HEADER,
        ),
        role: readHeaderString(request, PREVIEW_MEMBERSHIP_ROLE_HEADER),
        membershipSource:
          readHeaderString(request, PREVIEW_MEMBERSHIP_SOURCE_HEADER) ??
          "test_injected_read_model",
      },
      requestSource:
        readHeaderString(request, PREVIEW_REQUEST_SOURCE_HEADER) ??
        "controlled-intake-route-server-side-static-preview",
    });

  if (
    isControlledActivityIntakeServerSideAppUserMappingFailure(
      serverSideAppUserMapping,
    )
  ) {
    return buildErrorResponse(
      serverSideAppUserMapping.code,
      serverSideAppUserMapping.message,
      buildServerSideMappingFailureStatus(serverSideAppUserMapping.code),
      {
        source: serverSideAppUserMapping.source,
        layer: serverSideAppUserMapping.layer,
      },
    );
  }

  const payloadResult = await buildValidatedPayloadFromRequest(request);

  if (isControlledActivityIntakeValidatedPayloadFailure(payloadResult)) {
    return payloadResult.response;
  }

  const trustedContext = serverSideAppUserMapping.trustedContext;
  const payload = payloadResult.payload;
  const idempotency = buildControlledActivityIntakeIdempotency(
    payload,
    trustedContext,
  );
  const staticRowPreview = buildControlledActivityIntakeActivityEventsStaticRow({
    payload,
    idempotency,
    trustedContext,
  });

  return NextResponse.json(
    {
      ok: true,
      routeLayer: CONTROLLED_ACTIVITY_INTAKE_ROUTE_LAYER,
      mode: "server_side_static_preview",
      validation: {
        ok: true,
      },
      serverSideAppUserMapping,
      trustedContextPreview: trustedContext,
      payload,
      idempotency,
      staticRowPreview,
      guardrails: buildRouteGuardrails(),
    },
    { status: 200 },
  );
}

async function handleServerSideReadOnlyMappingPreview(
  request: NextRequest,
): Promise<NextResponse<RouteErrorResponse | RouteSuccessResponse>> {
  let session: unknown = null;

  try {
    session = await auth0.getSession();
  } catch {
    return buildErrorResponse(
      "CONTROLLED_INTAKE_SERVER_SESSION_REQUIRED",
      "Controlled intake could not read trusted server-side auth session.",
      401,
      undefined,
      buildNotExecutedServerSideAppUserMappingProof(),
    );
  }

  if (!session) {
    return buildErrorResponse(
      "CONTROLLED_INTAKE_SERVER_SESSION_REQUIRED",
      "Controlled intake requires trusted server-side auth session.",
      401,
      undefined,
      buildNotExecutedServerSideAppUserMappingProof(),
    );
  }

  const authSubject = readAuthSubjectFromSession(session);

  if (!authSubject) {
    return buildErrorResponse(
      "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED",
      "Controlled intake requires trusted server-side auth subject.",
      401,
      undefined,
      buildNotExecutedServerSideAppUserMappingProof(),
    );
  }

  const payloadResult = await buildValidatedPayloadFromRequest(request);

  if (isControlledActivityIntakeValidatedPayloadFailure(payloadResult)) {
    return payloadResult.response;
  }

  const serverSideAppUserMapping = await mapServerSideAppUserReadOnly({
    provider: TRUSTED_SERVER_PROVIDER,
    authSubject,
  });
  const serverSideAppUserMappingProof =
    buildSanitizedServerSideAppUserMappingProof(serverSideAppUserMapping);

  if (
    serverSideAppUserMapping.mappingStatus !== "mapped_user_found" ||
    !serverSideAppUserMapping.mappedUserFound ||
    !serverSideAppUserMapping.appUserId
  ) {
    const code = buildReadOnlyMappingFailureRouteErrorCode(
      serverSideAppUserMapping.mappingStatus,
    );

    return buildErrorResponse(
      code,
      buildReadOnlyMappingFailureMessage(
        serverSideAppUserMapping.mappingStatus,
      ),
      buildServerSideMappingFailureStatus(code),
      undefined,
      serverSideAppUserMappingProof,
    );
  }

  return NextResponse.json(
    {
      ok: true,
      routeLayer: CONTROLLED_ACTIVITY_INTAKE_ROUTE_LAYER,
      mode: "server_side_read_only_mapping_preview",
      validation: {
        ok: true,
      },
      payload: payloadResult.payload,
      serverSideAppUserMapping: serverSideAppUserMappingProof,
      guardrails: buildRouteGuardrails({
        dbReadExecuted:
          serverSideAppUserMappingProof.serverSideAppUserMappingDbReadExecuted,
      }),
    },
    { status: 200 },
  );
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<RouteErrorResponse | RouteSuccessResponse>> {
  const noWritePreview = readHeaderString(request, NO_WRITE_PREVIEW_HEADER);

  if (noWritePreview !== "true") {
    return buildErrorResponse(
      "CONTROLLED_INTAKE_NO_WRITE_PREVIEW_REQUIRED",
      "Controlled intake route requires explicit no-write preview header.",
      403,
    );
  }

  const authMappingMode = readHeaderString(request, AUTH_MAPPING_MODE_HEADER);

  if (authMappingMode === "server_side_read_only_mapping_preview") {
    return await handleServerSideReadOnlyMappingPreview(request);
  }

  if (authMappingMode === "server_side_static_preview") {
    return await handleServerSideStaticPreview(request);
  }

  if (authMappingMode === "production_static_preview") {
    return await handleProductionStaticPreview(request);
  }

  return await handleLegacyNoWritePreview(request);
}