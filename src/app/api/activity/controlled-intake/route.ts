import { NextRequest, NextResponse } from "next/server";

import {
  buildControlledActivityIntakeNoWritePreviewTrustedContext,
  type ControlledActivityIntakeAuthContextFailure,
  type ControlledActivityIntakeAuthContextResult,
} from "../../../../../lib/activity/controlledIntake/authContext";
import { buildControlledActivityIntakeIdempotency } from "../../../../../lib/activity/controlledIntake/idempotency";
import { buildControlledActivityIntakePayload } from "../../../../../lib/activity/controlledIntake/payloadBuilder";
import { buildControlledActivityIntakeActivityEventsStaticRow } from "../../../../../lib/activity/controlledIntake/persist";
import { validateControlledActivityIntake } from "../../../../../lib/activity/controlledIntake/validator";

export const dynamic = "force-dynamic";

const CONTROLLED_ACTIVITY_INTAKE_ROUTE_LAYER =
  "controlled-activity-intake-route-auth-integration-no-write-v1" as const;

const NO_WRITE_PREVIEW_HEADER = "x-controlled-intake-no-write-preview";
const PREVIEW_APP_USER_ID_HEADER =
  "x-controlled-intake-preview-app-user-id";
const PREVIEW_ACTOR_ID_HEADER = "x-controlled-intake-preview-actor-id";
const PREVIEW_ORGANIZATION_ID_HEADER =
  "x-controlled-intake-preview-organization-id";
const PREVIEW_SPACE_ID_HEADER = "x-controlled-intake-preview-space-id";
const PREVIEW_REQUEST_SOURCE_HEADER =
  "x-controlled-intake-preview-request-source";

type ControlledActivityIntakeRouteErrorCode =
  | "CONTROLLED_INTAKE_NO_WRITE_PREVIEW_REQUIRED"
  | "CONTROLLED_INTAKE_INVALID_JSON"
  | "CONTROLLED_INTAKE_VALIDATION_FAILED"
  | "CONTROLLED_INTAKE_TRUSTED_CONTEXT_APP_USER_REQUIRED"
  | "CONTROLLED_INTAKE_AUTH_IDENTITY_REQUIRED"
  | "CONTROLLED_INTAKE_AUTH_SUBJECT_REQUIRED"
  | "CONTROLLED_INTAKE_APP_USER_MAPPING_REQUIRED";

type ControlledActivityIntakeRouteGuardrails = {
  readonly routeAuthIntegrated: true;
  readonly routeScaffoldOnly: true;
  readonly noWritePreview: true;
  readonly dbWriteExecuted: false;
  readonly sqlExecuted: false;
  readonly aiCallExecuted: false;
  readonly semanticCandidatesPersisted: false;
  readonly valueObjectsCreated: false;
  readonly stateFactsCreated: false;
  readonly stateDeltasCreated: false;
  readonly stateSnapshotsCreated: false;
};

type RouteErrorResponse = {
  readonly ok: false;
  readonly routeLayer: typeof CONTROLLED_ACTIVITY_INTAKE_ROUTE_LAYER;
  readonly code: ControlledActivityIntakeRouteErrorCode;
  readonly message: string;
  readonly issues?: unknown;
  readonly guardrails: ControlledActivityIntakeRouteGuardrails;
};

type RouteSuccessResponse = {
  readonly ok: true;
  readonly routeLayer: typeof CONTROLLED_ACTIVITY_INTAKE_ROUTE_LAYER;
  readonly mode: "no_write_preview";
  readonly validation: {
    readonly ok: true;
  };
  readonly payload: unknown;
  readonly idempotency: unknown;
  readonly staticRowPreview: unknown;
  readonly guardrails: ControlledActivityIntakeRouteGuardrails;
};

function isControlledActivityIntakeRouteAuthContextFailure(
  result: ControlledActivityIntakeAuthContextResult,
): result is ControlledActivityIntakeAuthContextFailure {
  return result.ok === false;
}

function buildRouteGuardrails(): ControlledActivityIntakeRouteGuardrails {
  return {
    routeAuthIntegrated: true,
    routeScaffoldOnly: true,
    noWritePreview: true,
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
): NextResponse<RouteErrorResponse> {
  return NextResponse.json(
    {
      ok: false,
      routeLayer: CONTROLLED_ACTIVITY_INTAKE_ROUTE_LAYER,
      code,
      message,
      issues,
      guardrails: buildRouteGuardrails(),
    },
    { status },
  );
}

async function readJsonBody(request: NextRequest): Promise<unknown> {
  return await request.json();
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

  const trustedContext = authContext.trustedContext;

  let body: unknown;

  try {
    body = await readJsonBody(request);
  } catch {
    return buildErrorResponse(
      "CONTROLLED_INTAKE_INVALID_JSON",
      "Request body must be valid JSON.",
      400,
    );
  }

  const validation = validateControlledActivityIntake(body);

  if (!validation.ok) {
    return buildErrorResponse(
      "CONTROLLED_INTAKE_VALIDATION_FAILED",
      "Controlled activity intake validation failed.",
      400,
      validation.issues,
    );
  }

  const payload = buildControlledActivityIntakePayload(validation.value);
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