import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextResponse } from 'next/server';

import { auth0 } from '../../../../../../lib/auth0';
import { mapServerSideAppUserReadOnly } from '../../../../../../lib/activity/controlledIntake/serverSideAppUserMappingReadOnly';

export const dynamic = 'force-dynamic';

const ROUTE_NAME = 'controlled-activity-intake-server-side-app-user-mapping-read-only-test-v1';
const DIAGNOSTIC_HEADER_NAME = 'x-controlled-intake-server-side-app-user-mapping-read-only-test';
const DIAGNOSTIC_HEADER_VALUE = 'enabled';
const TRUSTED_PROVIDER = 'auth0';

type UnknownRecord = Record<string, unknown>;

type DiagnosticResponse = {
  ok: boolean;
  routeName: typeof ROUTE_NAME;
  diagnosticHeaderAccepted: boolean;
  authSessionReadExecuted: boolean;
  authSessionFound: boolean;
  trustedProvider: string | null;
  trustedAuthSubjectPresent: boolean;
  mappingStatus: string | null;
  mappedUserFound: boolean;
  dbReadExecuted: boolean;
  failClosed: boolean;
  appUserInactiveSupported: false;
  appUserInactiveCheckExecuted: false;
  selectedColumns: string | null;
  tableName: string | null;
  controlledIntakeRouteChanged: false;
  dbWriteExecuted: false;
  sqlExecuted: false;
  aiCallExecuted: false;
  activityEventsInserted: false;
  semanticCandidatesPersisted: false;
  valueObjectsCreated: false;
  stateFactsWritten: false;
  stateDeltasWritten: false;
  stateSnapshotsWritten: false;
  diagnosticErrorCode: string | null;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringProperty(source: unknown, key: string): string | null {
  if (!isRecord(source)) {
    return null;
  }

  const value = source[key];

  if (typeof value !== 'string') {
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

  return readStringProperty(user, 'sub');
}

function buildDiagnosticResponse(
  values: Omit<
    DiagnosticResponse,
    | 'routeName'
    | 'controlledIntakeRouteChanged'
    | 'dbWriteExecuted'
    | 'sqlExecuted'
    | 'aiCallExecuted'
    | 'activityEventsInserted'
    | 'semanticCandidatesPersisted'
    | 'valueObjectsCreated'
    | 'stateFactsWritten'
    | 'stateDeltasWritten'
    | 'stateSnapshotsWritten'
  >,
): DiagnosticResponse {
  return {
    ...values,
    routeName: ROUTE_NAME,
    controlledIntakeRouteChanged: false,
    dbWriteExecuted: false,
    sqlExecuted: false,
    aiCallExecuted: false,
    activityEventsInserted: false,
    semanticCandidatesPersisted: false,
    valueObjectsCreated: false,
    stateFactsWritten: false,
    stateDeltasWritten: false,
    stateSnapshotsWritten: false,
  };
}

function jsonResponse(body: DiagnosticResponse, status: number): NextResponse<DiagnosticResponse> {
  return NextResponse.json(body, { status });
}

export async function GET(request: Request): Promise<NextResponse<DiagnosticResponse>> {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  const diagnosticHeaderAccepted =
    request.headers.get(DIAGNOSTIC_HEADER_NAME) === DIAGNOSTIC_HEADER_VALUE;

  if (!diagnosticHeaderAccepted) {
    return jsonResponse(
      buildDiagnosticResponse({
        ok: false,
        diagnosticHeaderAccepted: false,
        authSessionReadExecuted: false,
        authSessionFound: false,
        trustedProvider: null,
        trustedAuthSubjectPresent: false,
        mappingStatus: null,
        mappedUserFound: false,
        dbReadExecuted: false,
        failClosed: true,
        appUserInactiveSupported: false,
        appUserInactiveCheckExecuted: false,
        selectedColumns: null,
        tableName: null,
        diagnosticErrorCode:
          'CONTROLLED_INTAKE_SERVER_SIDE_APP_USER_MAPPING_READ_ONLY_TEST_HEADER_REQUIRED',
      }),
      403,
    );
  }

  let session: unknown = null;

  try {
    session = await auth0.getSession();
  } catch {
    return jsonResponse(
      buildDiagnosticResponse({
        ok: false,
        diagnosticHeaderAccepted: true,
        authSessionReadExecuted: true,
        authSessionFound: false,
        trustedProvider: null,
        trustedAuthSubjectPresent: false,
        mappingStatus: null,
        mappedUserFound: false,
        dbReadExecuted: false,
        failClosed: true,
        appUserInactiveSupported: false,
        appUserInactiveCheckExecuted: false,
        selectedColumns: null,
        tableName: null,
        diagnosticErrorCode:
          'CONTROLLED_INTAKE_SERVER_SIDE_APP_USER_MAPPING_AUTH_SESSION_READ_FAILED',
      }),
      500,
    );
  }

  const authSubject = readAuthSubjectFromSession(session);
  const authSessionFound = Boolean(session);
  const trustedAuthSubjectPresent = Boolean(authSubject);
  const trustedProvider = trustedAuthSubjectPresent ? TRUSTED_PROVIDER : null;

  if (!authSessionFound) {
    return jsonResponse(
      buildDiagnosticResponse({
        ok: false,
        diagnosticHeaderAccepted: true,
        authSessionReadExecuted: true,
        authSessionFound: false,
        trustedProvider: null,
        trustedAuthSubjectPresent: false,
        mappingStatus: null,
        mappedUserFound: false,
        dbReadExecuted: false,
        failClosed: true,
        appUserInactiveSupported: false,
        appUserInactiveCheckExecuted: false,
        selectedColumns: null,
        tableName: null,
        diagnosticErrorCode:
          'CONTROLLED_INTAKE_SERVER_SIDE_APP_USER_MAPPING_AUTH_SESSION_REQUIRED',
      }),
      401,
    );
  }

  if (!authSubject) {
    return jsonResponse(
      buildDiagnosticResponse({
        ok: false,
        diagnosticHeaderAccepted: true,
        authSessionReadExecuted: true,
        authSessionFound: true,
        trustedProvider: null,
        trustedAuthSubjectPresent: false,
        mappingStatus: 'missing_auth_subject',
        mappedUserFound: false,
        dbReadExecuted: false,
        failClosed: true,
        appUserInactiveSupported: false,
        appUserInactiveCheckExecuted: false,
        selectedColumns: null,
        tableName: null,
        diagnosticErrorCode:
          'CONTROLLED_INTAKE_SERVER_SIDE_APP_USER_MAPPING_AUTH_SUBJECT_REQUIRED',
      }),
      401,
    );
  }

  const mappingResult = await mapServerSideAppUserReadOnly({
    provider: trustedProvider,
    authSubject,
  });

  let status = 200;

  if (mappingResult.mappingStatus === 'app_user_not_found') {
    status = 404;
  }

  if (
    mappingResult.mappingStatus === 'provider_not_supported' ||
    mappingResult.mappingStatus === 'missing_auth_subject'
  ) {
    status = 400;
  }

  if (
    mappingResult.mappingStatus === 'app_user_duplicate' ||
    mappingResult.mappingStatus === 'app_user_lookup_error'
  ) {
    status = 500;
  }

  return jsonResponse(
    buildDiagnosticResponse({
      ok: mappingResult.mappingStatus === 'mapped_user_found',
      diagnosticHeaderAccepted: true,
      authSessionReadExecuted: true,
      authSessionFound: true,
      trustedProvider,
      trustedAuthSubjectPresent: true,
      mappingStatus: mappingResult.mappingStatus,
      mappedUserFound: mappingResult.mappedUserFound,
      dbReadExecuted: mappingResult.dbReadExecuted,
      failClosed: mappingResult.failClosed,
      appUserInactiveSupported: false,
      appUserInactiveCheckExecuted: false,
      selectedColumns: mappingResult.selectedColumns,
      tableName: mappingResult.tableName,
      diagnosticErrorCode: mappingResult.mappedUserFound
        ? null
        : 'CONTROLLED_INTAKE_SERVER_SIDE_APP_USER_MAPPING_READ_ONLY_NOT_MAPPED',
    }),
    status,
  );
}