import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextRequest, NextResponse } from 'next/server';

import { auth0 } from '../../../../../../lib/auth0';
import { getSupabaseAdminClient } from '../../../../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';

const GATE = 'P4.10.0-C8-I-D4-L-L-O-DJ-R3' as const;
const MODE = 'app_user_mapping_lookup_error_focused_diagnostic' as const;
const REQUIRED_HEADER_NAME = 'x-app-user-mapping-lookup-error-focused-test' as const;
const REQUIRED_HEADER_VALUE = 'enabled' as const;
const APP_USER_SELECTED_COLUMNS = 'id, auth0_sub' as const;

type AuthSubjectShapeCategory =
  | 'missing'
  | 'provider_pipe_subject'
  | 'long_non_empty'
  | 'short_non_empty';

type AppUsersRowCountCategory = 'zero' | 'one' | 'multiple' | 'unknown';

type MappingOutcomeCategory =
  | 'mapped'
  | 'not_found'
  | 'duplicate'
  | 'query_error'
  | 'client_creation_error'
  | 'unauthenticated';

type SanitizedErrorCategory =
  | 'none'
  | 'env_missing'
  | 'client_creation_error'
  | 'query_error'
  | 'unknown';

type FocusedDiagnosticGuardrails = {
  diagnosticEndpointOnly: true;
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

type FocusedDiagnosticResponseBody = {
  ok: boolean;
  gate: typeof GATE;
  mode: typeof MODE;
  code: string;
  headerAccepted: boolean;
  authSessionReadExecuted: boolean;
  trustedAuthSubjectPresent: boolean;
  trustedAuthSubjectShapeCategory: AuthSubjectShapeCategory;
  supabaseAdminClientCreated: boolean;
  supabaseUrlConfigured: boolean;
  serviceRoleKeyConfigured: boolean;
  appUsersQueryAttempted: boolean;
  appUsersQuerySucceeded: boolean;
  appUsersRowCountCategory: AppUsersRowCountCategory;
  mappingOutcomeCategory: MappingOutcomeCategory;
  sanitizedErrorCategory: SanitizedErrorCategory;
  responseSanitized: true;
  guardrails: FocusedDiagnosticGuardrails;
};

type AppUserDiagnosticRow = {
  id: string | null;
  auth0_sub: string | null;
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

function categorizeAuthSubjectShape(value: string | null): AuthSubjectShapeCategory {
  if (!value) {
    return 'missing';
  }

  if (value.includes('|')) {
    return 'provider_pipe_subject';
  }

  return value.length >= 16 ? 'long_non_empty' : 'short_non_empty';
}

function getSupabaseUrlConfigured(): boolean {
  return Boolean(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
  );
}

function getServiceRoleKeyConfigured(): boolean {
  return Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim());
}

function categorizeRowCount(rowCount: number | null): AppUsersRowCountCategory {
  if (rowCount === null) {
    return 'unknown';
  }

  if (rowCount === 0) {
    return 'zero';
  }

  if (rowCount === 1) {
    return 'one';
  }

  return 'multiple';
}

function buildGuardrails(
  overrides?: Partial<FocusedDiagnosticGuardrails>,
): FocusedDiagnosticGuardrails {
  return {
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

function buildBody(
  overrides?: Partial<FocusedDiagnosticResponseBody>,
): FocusedDiagnosticResponseBody {
  return {
    ok: false,
    gate: GATE,
    mode: MODE,
    code: 'APP_USER_MAPPING_FOCUSED_DIAGNOSTIC_NOT_EXECUTED',
    headerAccepted: false,
    authSessionReadExecuted: false,
    trustedAuthSubjectPresent: false,
    trustedAuthSubjectShapeCategory: 'missing',
    supabaseAdminClientCreated: false,
    supabaseUrlConfigured: getSupabaseUrlConfigured(),
    serviceRoleKeyConfigured: getServiceRoleKeyConfigured(),
    appUsersQueryAttempted: false,
    appUsersQuerySucceeded: false,
    appUsersRowCountCategory: 'unknown',
    mappingOutcomeCategory: 'unauthenticated',
    sanitizedErrorCategory: 'none',
    responseSanitized: true,
    guardrails: buildGuardrails(),
    ...overrides,
  };
}

function jsonResponse(
  body: FocusedDiagnosticResponseBody,
  status: number,
): NextResponse<FocusedDiagnosticResponseBody> {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<FocusedDiagnosticResponseBody>> {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  const headerValue = request.headers.get(REQUIRED_HEADER_NAME);

  if (headerValue !== REQUIRED_HEADER_VALUE) {
    return jsonResponse(
      buildBody({
        code: 'APP_USER_MAPPING_FOCUSED_DIAGNOSTIC_HEADER_REQUIRED',
        mappingOutcomeCategory: 'unauthenticated',
        sanitizedErrorCategory: 'none',
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
        code: 'APP_USER_MAPPING_FOCUSED_DIAGNOSTIC_AUTH_SESSION_READ_FAILED',
        headerAccepted: true,
        authSessionReadExecuted: true,
        mappingOutcomeCategory: 'unauthenticated',
        sanitizedErrorCategory: 'unknown',
      }),
      401,
    );
  }

  const trustedAuthSubject = readAuthSubjectFromSession(session);
  const trustedAuthSubjectPresent = Boolean(trustedAuthSubject);
  const trustedAuthSubjectShapeCategory = categorizeAuthSubjectShape(trustedAuthSubject);

  if (!trustedAuthSubject) {
    return jsonResponse(
      buildBody({
        code: 'APP_USER_MAPPING_FOCUSED_DIAGNOSTIC_AUTH_SESSION_REQUIRED',
        headerAccepted: true,
        authSessionReadExecuted: true,
        trustedAuthSubjectPresent,
        trustedAuthSubjectShapeCategory,
        mappingOutcomeCategory: 'unauthenticated',
        sanitizedErrorCategory: 'none',
      }),
      401,
    );
  }

  const supabaseUrlConfigured = getSupabaseUrlConfigured();
  const serviceRoleKeyConfigured = getServiceRoleKeyConfigured();

  if (!supabaseUrlConfigured || !serviceRoleKeyConfigured) {
    return jsonResponse(
      buildBody({
        code: 'APP_USER_MAPPING_FOCUSED_DIAGNOSTIC_ENV_MISSING',
        headerAccepted: true,
        authSessionReadExecuted: true,
        trustedAuthSubjectPresent,
        trustedAuthSubjectShapeCategory,
        supabaseUrlConfigured,
        serviceRoleKeyConfigured,
        mappingOutcomeCategory: 'client_creation_error',
        sanitizedErrorCategory: 'env_missing',
      }),
      500,
    );
  }

  let supabaseAdminClientCreated = false;
  let supabase: ReturnType<typeof getSupabaseAdminClient>;

  try {
    supabase = getSupabaseAdminClient();
    supabaseAdminClientCreated = true;
  } catch {
    return jsonResponse(
      buildBody({
        code: 'APP_USER_MAPPING_FOCUSED_DIAGNOSTIC_CLIENT_CREATION_ERROR',
        headerAccepted: true,
        authSessionReadExecuted: true,
        trustedAuthSubjectPresent,
        trustedAuthSubjectShapeCategory,
        supabaseUrlConfigured,
        serviceRoleKeyConfigured,
        supabaseAdminClientCreated: false,
        mappingOutcomeCategory: 'client_creation_error',
        sanitizedErrorCategory: 'client_creation_error',
      }),
      500,
    );
  }

  try {
    const { data, error } = await supabase
      .from('app_users')
      .select(APP_USER_SELECTED_COLUMNS)
      .eq('auth0_sub', trustedAuthSubject)
      .limit(2);

    if (error) {
      return jsonResponse(
        buildBody({
          code: 'APP_USER_MAPPING_FOCUSED_DIAGNOSTIC_QUERY_ERROR',
          headerAccepted: true,
          authSessionReadExecuted: true,
          trustedAuthSubjectPresent,
          trustedAuthSubjectShapeCategory,
          supabaseUrlConfigured,
          serviceRoleKeyConfigured,
          supabaseAdminClientCreated,
          appUsersQueryAttempted: true,
          appUsersQuerySucceeded: false,
          appUsersRowCountCategory: 'unknown',
          mappingOutcomeCategory: 'query_error',
          sanitizedErrorCategory: 'query_error',
          guardrails: buildGuardrails({
            dbReadExecuted: true,
          }),
        }),
        500,
      );
    }

    const rows = Array.isArray(data) ? (data as AppUserDiagnosticRow[]) : [];
    const rowCountCategory = categorizeRowCount(rows.length);

    if (rows.length === 0) {
      return jsonResponse(
        buildBody({
          code: 'APP_USER_MAPPING_FOCUSED_DIAGNOSTIC_NOT_FOUND',
          headerAccepted: true,
          authSessionReadExecuted: true,
          trustedAuthSubjectPresent,
          trustedAuthSubjectShapeCategory,
          supabaseUrlConfigured,
          serviceRoleKeyConfigured,
          supabaseAdminClientCreated,
          appUsersQueryAttempted: true,
          appUsersQuerySucceeded: true,
          appUsersRowCountCategory: rowCountCategory,
          mappingOutcomeCategory: 'not_found',
          sanitizedErrorCategory: 'none',
          guardrails: buildGuardrails({
            dbReadExecuted: true,
          }),
        }),
        200,
      );
    }

    if (rows.length > 1) {
      return jsonResponse(
        buildBody({
          code: 'APP_USER_MAPPING_FOCUSED_DIAGNOSTIC_DUPLICATE',
          headerAccepted: true,
          authSessionReadExecuted: true,
          trustedAuthSubjectPresent,
          trustedAuthSubjectShapeCategory,
          supabaseUrlConfigured,
          serviceRoleKeyConfigured,
          supabaseAdminClientCreated,
          appUsersQueryAttempted: true,
          appUsersQuerySucceeded: true,
          appUsersRowCountCategory: rowCountCategory,
          mappingOutcomeCategory: 'duplicate',
          sanitizedErrorCategory: 'none',
          guardrails: buildGuardrails({
            dbReadExecuted: true,
          }),
        }),
        409,
      );
    }

    return jsonResponse(
      buildBody({
        ok: true,
        code: 'APP_USER_MAPPING_FOCUSED_DIAGNOSTIC_MAPPED',
        headerAccepted: true,
        authSessionReadExecuted: true,
        trustedAuthSubjectPresent,
        trustedAuthSubjectShapeCategory,
        supabaseUrlConfigured,
        serviceRoleKeyConfigured,
        supabaseAdminClientCreated,
        appUsersQueryAttempted: true,
        appUsersQuerySucceeded: true,
        appUsersRowCountCategory: rowCountCategory,
        mappingOutcomeCategory: 'mapped',
        sanitizedErrorCategory: 'none',
        guardrails: buildGuardrails({
          dbReadExecuted: true,
        }),
      }),
      200,
    );
  } catch {
    return jsonResponse(
      buildBody({
        code: 'APP_USER_MAPPING_FOCUSED_DIAGNOSTIC_UNKNOWN_QUERY_ERROR',
        headerAccepted: true,
        authSessionReadExecuted: true,
        trustedAuthSubjectPresent,
        trustedAuthSubjectShapeCategory,
        supabaseUrlConfigured,
        serviceRoleKeyConfigured,
        supabaseAdminClientCreated,
        appUsersQueryAttempted: true,
        appUsersQuerySucceeded: false,
        appUsersRowCountCategory: 'unknown',
        mappingOutcomeCategory: 'query_error',
        sanitizedErrorCategory: 'unknown',
        guardrails: buildGuardrails({
          dbReadExecuted: true,
        }),
      }),
      500,
    );
  }
}