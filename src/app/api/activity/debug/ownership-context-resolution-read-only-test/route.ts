import { NextRequest, NextResponse } from 'next/server';

import { auth0 } from '../../../../../../lib/auth0';
import { mapServerSideAppUserReadOnly } from '../../../../../../lib/activity/controlledIntake/serverSideAppUserMappingReadOnly';
import { resolveControlledActivityIntakeOwnershipContextReadOnly } from '../../../../../../lib/activity/controlledIntake/ownershipContextResolutionReadOnly';

export const dynamic = 'force-dynamic';

const GATE = 'P4.10.0-C8-I-D4-L-L-O-DG' as const;
const MODE = 'ownership_context_resolution_read_only_diagnostic' as const;
const REQUIRED_HEADER_NAME = 'x-controlled-intake-ownership-context-resolution-read-only-test' as const;
const REQUIRED_HEADER_VALUE = 'enabled' as const;

type DiagnosticGuardrails = {
  routeAuthIntegrated: boolean;
  appUserMappingIntegrated: boolean;
  ownershipContextResolverIntegrated: boolean;
  diagnosticEndpointOnly: boolean;
  productionWriteEnabled: false;
  dbReadExecuted: boolean;
  dbWriteExecuted: false;
  sqlExecuted: false;
  aiCallExecuted: false;
  activityEventsInserted: false;
  semanticCandidatesPersisted: false;
  valueObjectsCreated: false;
  stateFactsCreated: false;
  stateDeltasCreated: false;
  stateSnapshotsCreated: false;
  responseSanitized: true;
};

type DiagnosticResponseBody = {
  ok: boolean;
  gate: typeof GATE;
  mode: typeof MODE;
  code?: string;
  headerAccepted: boolean;
  authSessionReadExecuted: boolean;
  appUserMappingExecuted: boolean;
  appUserMappingStatus: string;
  appUserMapped: boolean;
  appUserMappingDbReadExecuted: boolean;
  ownershipContextResolutionExecuted: boolean;
  ownershipContextResolutionStatus: string;
  ownershipContextResolved: boolean;
  ownershipContextDbReadExecuted: boolean;
  ownershipContextFailClosed: boolean;
  selectedContextScope: string;
  requestedContextAcceptedAsHintOnly: boolean;
  mappedAppUserRequired: boolean;
  ownedSpaceResolved: boolean;
  actorSpaceRoleResolved: boolean;
  creatorOrganizationResolved: boolean;
  organizationActorResolved: boolean;
  responseSanitized: true;
  guardrails: DiagnosticGuardrails;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStringProperty(value: unknown, key: string): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const propertyValue = value[key];

  return typeof propertyValue === 'string' ? propertyValue : null;
}

function readBooleanProperty(value: unknown, key: string): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return value[key] === true;
}

function readAuthSubjectFromSession(session: unknown): string | null {
  if (!isRecord(session)) {
    return null;
  }

  const user = session.user;

  if (!isRecord(user)) {
    return null;
  }

  return readStringProperty(user, 'sub');
}

function buildGuardrails(overrides?: Partial<DiagnosticGuardrails>): DiagnosticGuardrails {
  return {
    routeAuthIntegrated: true,
    appUserMappingIntegrated: true,
    ownershipContextResolverIntegrated: true,
    diagnosticEndpointOnly: true,
    productionWriteEnabled: false,
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
    responseSanitized: true,
    ...overrides,
  };
}

function buildBody(overrides?: Partial<DiagnosticResponseBody>): DiagnosticResponseBody {
  return {
    ok: false,
    gate: GATE,
    mode: MODE,
    headerAccepted: false,
    authSessionReadExecuted: false,
    appUserMappingExecuted: false,
    appUserMappingStatus: 'not_executed',
    appUserMapped: false,
    appUserMappingDbReadExecuted: false,
    ownershipContextResolutionExecuted: false,
    ownershipContextResolutionStatus: 'not_executed',
    ownershipContextResolved: false,
    ownershipContextDbReadExecuted: false,
    ownershipContextFailClosed: true,
    selectedContextScope: 'none',
    requestedContextAcceptedAsHintOnly: true,
    mappedAppUserRequired: true,
    ownedSpaceResolved: false,
    actorSpaceRoleResolved: false,
    creatorOrganizationResolved: false,
    organizationActorResolved: false,
    responseSanitized: true,
    guardrails: buildGuardrails(),
    ...overrides,
  };
}

function jsonResponse(body: DiagnosticResponseBody, status: number): NextResponse<DiagnosticResponseBody> {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(request: NextRequest): Promise<NextResponse<DiagnosticResponseBody>> {
  const headerValue = request.headers.get(REQUIRED_HEADER_NAME);

  if (headerValue !== REQUIRED_HEADER_VALUE) {
    return jsonResponse(
      buildBody({
        code: 'OWNERSHIP_CONTEXT_RESOLUTION_READ_ONLY_TEST_HEADER_REQUIRED',
        guardrails: buildGuardrails({
          routeAuthIntegrated: false,
          appUserMappingIntegrated: false,
          ownershipContextResolverIntegrated: false,
        }),
      }),
      403,
    );
  }

  let session: unknown = null;

  try {
    session = await auth0.getSession();
  } catch {
    return jsonResponse(
      buildBody({
        code: 'OWNERSHIP_CONTEXT_RESOLUTION_AUTH_SESSION_READ_FAILED',
        headerAccepted: true,
        authSessionReadExecuted: true,
        guardrails: buildGuardrails(),
      }),
      401,
    );
  }

  const trustedAuthSubject = readAuthSubjectFromSession(session);

  if (!trustedAuthSubject) {
    return jsonResponse(
      buildBody({
        code: 'OWNERSHIP_CONTEXT_RESOLUTION_AUTH_SESSION_REQUIRED',
        headerAccepted: true,
        authSessionReadExecuted: true,
        guardrails: buildGuardrails(),
      }),
      401,
    );
  }

  let appUserMapping: unknown = null;

  try {
    appUserMapping = await mapServerSideAppUserReadOnly({
      provider: 'auth0',
      authSubject: trustedAuthSubject,
    });
  } catch {
    return jsonResponse(
      buildBody({
        code: 'OWNERSHIP_CONTEXT_RESOLUTION_APP_USER_MAPPING_FAILED',
        headerAccepted: true,
        authSessionReadExecuted: true,
        appUserMappingExecuted: true,
        appUserMappingStatus: 'app_user_lookup_error',
        appUserMappingDbReadExecuted: true,
        guardrails: buildGuardrails({
          dbReadExecuted: true,
        }),
      }),
      500,
    );
  }

  const appUserMappingStatus =
    readStringProperty(appUserMapping, 'mappingStatus') ??
    readStringProperty(appUserMapping, 'status') ??
    'app_user_lookup_error';
  const appUserMappingDbReadExecuted = readBooleanProperty(appUserMapping, 'dbReadExecuted');
  const mappedAppUserId = readStringProperty(appUserMapping, 'appUserId');
  const appUserMapped = appUserMappingStatus === 'mapped_user_found' && Boolean(mappedAppUserId);

  if (!appUserMapped) {
    return jsonResponse(
      buildBody({
        code: 'OWNERSHIP_CONTEXT_RESOLUTION_APP_USER_MAPPING_REQUIRED',
        headerAccepted: true,
        authSessionReadExecuted: true,
        appUserMappingExecuted: true,
        appUserMappingStatus,
        appUserMapped: false,
        appUserMappingDbReadExecuted,
        guardrails: buildGuardrails({
          dbReadExecuted: appUserMappingDbReadExecuted,
        }),
      }),
      403,
    );
  }

  const requestedActorId = request.nextUrl.searchParams.get('actorId');
  const requestedSpaceId = request.nextUrl.searchParams.get('spaceId');
  const requestedOrganizationId = request.nextUrl.searchParams.get('organizationId');
  const requestedContextSource = request.nextUrl.searchParams.get('contextSource');

  const ownershipContextResolution =
    await resolveControlledActivityIntakeOwnershipContextReadOnly({
      mappedAppUserId,
      requestedActorId,
      requestedSpaceId,
      requestedOrganizationId,
      requestedContextSource,
    });

  const dbReadExecuted =
    appUserMappingDbReadExecuted || ownershipContextResolution.dbReadExecuted;

  return jsonResponse(
    buildBody({
      ok: ownershipContextResolution.resolved,
      code: ownershipContextResolution.resolved
        ? 'OWNERSHIP_CONTEXT_RESOLUTION_READ_ONLY_RESOLVED'
        : 'OWNERSHIP_CONTEXT_RESOLUTION_READ_ONLY_FAIL_CLOSED',
      headerAccepted: true,
      authSessionReadExecuted: true,
      appUserMappingExecuted: true,
      appUserMappingStatus,
      appUserMapped: true,
      appUserMappingDbReadExecuted,
      ownershipContextResolutionExecuted: ownershipContextResolution.executed,
      ownershipContextResolutionStatus: ownershipContextResolution.status,
      ownershipContextResolved: ownershipContextResolution.resolved,
      ownershipContextDbReadExecuted: ownershipContextResolution.dbReadExecuted,
      ownershipContextFailClosed: ownershipContextResolution.failClosed,
      selectedContextScope: ownershipContextResolution.selectedContextScope,
      requestedContextAcceptedAsHintOnly:
        ownershipContextResolution.requestedContextAcceptedAsHintOnly,
      mappedAppUserRequired: ownershipContextResolution.mappedAppUserRequired,
      ownedSpaceResolved: ownershipContextResolution.ownedSpaceResolved,
      actorSpaceRoleResolved: ownershipContextResolution.actorSpaceRoleResolved,
      creatorOrganizationResolved: ownershipContextResolution.creatorOrganizationResolved,
      organizationActorResolved: ownershipContextResolution.organizationActorResolved,
      responseSanitized: ownershipContextResolution.responseSanitized,
      guardrails: buildGuardrails({
        dbReadExecuted,
      }),
    }),
    200,
  );
}
