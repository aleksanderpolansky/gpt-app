import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextRequest, NextResponse } from 'next/server';

import { auth0 } from '../../../../../../lib/auth0';
import { getSupabaseAdminClient } from '../../../../../../lib/supabase/admin';
import { mapServerSideAppUserReadOnly } from '../../../../../../lib/activity/controlledIntake/serverSideAppUserMappingReadOnly';

export const dynamic = 'force-dynamic';

const GATE = 'P4.10.0-C8-I-D4-L-L-O-DJ-R13E' as const;
const MODE = 'ownership_context_column_contract_probe_read_only_diagnostic' as const;
const REQUIRED_HEADER_NAME = 'x-ownership-context-column-contract-probe-read-only-test' as const;
const REQUIRED_HEADER_VALUE = 'enabled' as const;

type ProbeTable =
  | 'spaces'
  | 'actor_space_roles'
  | 'organizations'
  | 'actors'
  | 'app_users';

type SanitizedQueryErrorCategory =
  | 'none'
  | 'column_not_found'
  | 'relation_not_found'
  | 'permission_or_rls'
  | 'schema_cache_miss'
  | 'query_error'
  | 'unknown';

type RowCountCategory =
  | 'not_attempted'
  | 'zero'
  | 'one'
  | 'multiple'
  | 'unknown';

type ColumnProbeResult = {
  table: ProbeTable;
  column: string;
  attempted: boolean;
  dbReadExecuted: boolean;
  selectStatus: 'ok' | 'error';
  rowCountCategory: RowCountCategory;
  sanitizedQueryErrorCategory: SanitizedQueryErrorCategory;
  rawValueReturned: false;
};

type FilterProbeResult = {
  label: string;
  table: ProbeTable;
  filterColumn: string;
  filterValueSource: 'mapped_app_user_id';
  selectShape: string;
  attempted: boolean;
  dbReadExecuted: boolean;
  selectStatus: 'ok' | 'error';
  rowCountCategory: RowCountCategory;
  usableCandidateFound: boolean;
  sanitizedQueryErrorCategory: SanitizedQueryErrorCategory;
  rawRowsReturned: false;
};

type ContractHint = {
  label: string;
  table: ProbeTable;
  filterColumn: string;
  filterValueSource: 'mapped_app_user_id';
  rowCountCategory: RowCountCategory;
  usableCandidateFound: boolean;
};

type DiagnosticGuardrails = {
  routeAuthIntegrated: boolean;
  appUserMappingIntegrated: boolean;
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
  probeExecuted: boolean;
  columnProbeResults: ColumnProbeResult[];
  filterProbeResults: FilterProbeResult[];
  candidateContractHints: ContractHint[];
  columnProbeErrorCategories: SanitizedQueryErrorCategory[];
  filterProbeErrorCategories: SanitizedQueryErrorCategory[];
  responseSanitized: true;
  guardrails: DiagnosticGuardrails;
};

type ColumnProbeSpec = {
  table: ProbeTable;
  column: string;
};

type FilterProbeSpec = {
  label: string;
  table: ProbeTable;
  filterColumn: string;
  selectShape: string;
  requiredCandidateColumns: string[];
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

function categorizeRowCount(rows: unknown[]): RowCountCategory {
  if (rows.length === 0) {
    return 'zero';
  }

  if (rows.length === 1) {
    return 'one';
  }

  return 'multiple';
}

function readLowercaseQueryIssueText(value: unknown): string {
  if (!isRecord(value)) {
    return '';
  }

  const code = readStringProperty(value, 'code') ?? '';
  const message = readStringProperty(value, 'message') ?? '';
  const details = readStringProperty(value, 'details') ?? '';
  const hint = readStringProperty(value, 'hint') ?? '';

  return `${code} ${message} ${details} ${hint}`.toLowerCase();
}

function categorizeQueryIssue(value: unknown): SanitizedQueryErrorCategory {
  const text = readLowercaseQueryIssueText(value);

  if (!text) {
    return 'unknown';
  }

  if (
    text.includes('42703') ||
    (text.includes('column') && text.includes('does not exist')) ||
    (text.includes('could not find') && text.includes('column'))
  ) {
    return 'column_not_found';
  }

  if (
    text.includes('42p01') ||
    (text.includes('relation') && text.includes('does not exist')) ||
    (text.includes('could not find') && text.includes('table'))
  ) {
    return 'relation_not_found';
  }

  if (
    text.includes('42501') ||
    text.includes('permission denied') ||
    text.includes('row-level security') ||
    text.includes('rls')
  ) {
    return 'permission_or_rls';
  }

  if (
    text.includes('schema cache') ||
    (text.includes('pgrst') && text.includes('schema'))
  ) {
    return 'schema_cache_miss';
  }

  return 'query_error';
}

function hasRequiredCandidateColumns(
  row: Record<string, unknown>,
  requiredCandidateColumns: string[],
): boolean {
  return requiredCandidateColumns.every((column) => {
    const value = row[column];

    return typeof value === 'string' && value.trim().length > 0;
  });
}

function collectErrorCategories(
  results: Array<{ sanitizedQueryErrorCategory: SanitizedQueryErrorCategory }>,
): SanitizedQueryErrorCategory[] {
  const categories = new Set<SanitizedQueryErrorCategory>();

  for (const result of results) {
    if (result.sanitizedQueryErrorCategory !== 'none') {
      categories.add(result.sanitizedQueryErrorCategory);
    }
  }

  return Array.from(categories);
}

function buildGuardrails(overrides?: Partial<DiagnosticGuardrails>): DiagnosticGuardrails {
  return {
    routeAuthIntegrated: true,
    appUserMappingIntegrated: true,
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
    probeExecuted: false,
    columnProbeResults: [],
    filterProbeResults: [],
    candidateContractHints: [],
    columnProbeErrorCategories: [],
    filterProbeErrorCategories: [],
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

const columnProbeSpecs: ColumnProbeSpec[] = [
  { table: 'app_users', column: 'id' },
  { table: 'app_users', column: 'auth0_sub' },
  { table: 'app_users', column: 'user_id' },
  { table: 'app_users', column: 'profile_id' },

  { table: 'spaces', column: 'id' },
  { table: 'spaces', column: 'owner_app_user_id' },
  { table: 'spaces', column: 'owner_user_id' },
  { table: 'spaces', column: 'created_by_app_user_id' },
  { table: 'spaces', column: 'created_by_user_id' },
  { table: 'spaces', column: 'created_by' },
  { table: 'spaces', column: 'owner_id' },
  { table: 'spaces', column: 'user_id' },
  { table: 'spaces', column: 'app_user_id' },
  { table: 'spaces', column: 'profile_id' },

  { table: 'actor_space_roles', column: 'id' },
  { table: 'actor_space_roles', column: 'space_id' },
  { table: 'actor_space_roles', column: 'actor_id' },
  { table: 'actor_space_roles', column: 'app_user_id' },
  { table: 'actor_space_roles', column: 'user_id' },
  { table: 'actor_space_roles', column: 'profile_id' },
  { table: 'actor_space_roles', column: 'role_id' },

  { table: 'organizations', column: 'id' },
  { table: 'organizations', column: 'created_by_app_user_id' },
  { table: 'organizations', column: 'created_by_user_id' },
  { table: 'organizations', column: 'created_by' },
  { table: 'organizations', column: 'owner_app_user_id' },
  { table: 'organizations', column: 'owner_user_id' },
  { table: 'organizations', column: 'owner_id' },
  { table: 'organizations', column: 'user_id' },
  { table: 'organizations', column: 'app_user_id' },
  { table: 'organizations', column: 'profile_id' },

  { table: 'actors', column: 'id' },
  { table: 'actors', column: 'organization_id' },
  { table: 'actors', column: 'space_id' },
  { table: 'actors', column: 'app_user_id' },
  { table: 'actors', column: 'user_id' },
  { table: 'actors', column: 'profile_id' },
  { table: 'actors', column: 'owner_user_id' },
  { table: 'actors', column: 'created_by_user_id' },
];

const filterProbeSpecs: FilterProbeSpec[] = [
  {
    label: 'spaces_by_owner_app_user_id',
    table: 'spaces',
    filterColumn: 'owner_app_user_id',
    selectShape: 'id',
    requiredCandidateColumns: ['id'],
  },
  {
    label: 'spaces_by_owner_user_id',
    table: 'spaces',
    filterColumn: 'owner_user_id',
    selectShape: 'id',
    requiredCandidateColumns: ['id'],
  },
  {
    label: 'spaces_by_created_by_user_id',
    table: 'spaces',
    filterColumn: 'created_by_user_id',
    selectShape: 'id',
    requiredCandidateColumns: ['id'],
  },
  {
    label: 'spaces_by_user_id',
    table: 'spaces',
    filterColumn: 'user_id',
    selectShape: 'id',
    requiredCandidateColumns: ['id'],
  },
  {
    label: 'spaces_by_app_user_id',
    table: 'spaces',
    filterColumn: 'app_user_id',
    selectShape: 'id',
    requiredCandidateColumns: ['id'],
  },
  {
    label: 'spaces_by_profile_id',
    table: 'spaces',
    filterColumn: 'profile_id',
    selectShape: 'id',
    requiredCandidateColumns: ['id'],
  },
  {
    label: 'actor_space_roles_by_app_user_id',
    table: 'actor_space_roles',
    filterColumn: 'app_user_id',
    selectShape: 'space_id,actor_id',
    requiredCandidateColumns: ['space_id'],
  },
  {
    label: 'actor_space_roles_by_user_id',
    table: 'actor_space_roles',
    filterColumn: 'user_id',
    selectShape: 'space_id,actor_id',
    requiredCandidateColumns: ['space_id'],
  },
  {
    label: 'actor_space_roles_by_profile_id',
    table: 'actor_space_roles',
    filterColumn: 'profile_id',
    selectShape: 'space_id,actor_id',
    requiredCandidateColumns: ['space_id'],
  },
  {
    label: 'organizations_by_created_by_app_user_id',
    table: 'organizations',
    filterColumn: 'created_by_app_user_id',
    selectShape: 'id',
    requiredCandidateColumns: ['id'],
  },
  {
    label: 'organizations_by_created_by_user_id',
    table: 'organizations',
    filterColumn: 'created_by_user_id',
    selectShape: 'id',
    requiredCandidateColumns: ['id'],
  },
  {
    label: 'organizations_by_owner_user_id',
    table: 'organizations',
    filterColumn: 'owner_user_id',
    selectShape: 'id',
    requiredCandidateColumns: ['id'],
  },
  {
    label: 'organizations_by_user_id',
    table: 'organizations',
    filterColumn: 'user_id',
    selectShape: 'id',
    requiredCandidateColumns: ['id'],
  },
  {
    label: 'organizations_by_app_user_id',
    table: 'organizations',
    filterColumn: 'app_user_id',
    selectShape: 'id',
    requiredCandidateColumns: ['id'],
  },
  {
    label: 'organizations_by_profile_id',
    table: 'organizations',
    filterColumn: 'profile_id',
    selectShape: 'id',
    requiredCandidateColumns: ['id'],
  },
  {
    label: 'actors_by_app_user_id',
    table: 'actors',
    filterColumn: 'app_user_id',
    selectShape: 'id,organization_id,space_id',
    requiredCandidateColumns: ['id'],
  },
  {
    label: 'actors_by_user_id',
    table: 'actors',
    filterColumn: 'user_id',
    selectShape: 'id,organization_id,space_id',
    requiredCandidateColumns: ['id'],
  },
  {
    label: 'actors_by_profile_id',
    table: 'actors',
    filterColumn: 'profile_id',
    selectShape: 'id,organization_id,space_id',
    requiredCandidateColumns: ['id'],
  },
  {
    label: 'actors_by_owner_user_id',
    table: 'actors',
    filterColumn: 'owner_user_id',
    selectShape: 'id,organization_id,space_id',
    requiredCandidateColumns: ['id'],
  },
  {
    label: 'actors_by_created_by_user_id',
    table: 'actors',
    filterColumn: 'created_by_user_id',
    selectShape: 'id,organization_id,space_id',
    requiredCandidateColumns: ['id'],
  },
];

async function probeColumn(spec: ColumnProbeSpec): Promise<ColumnProbeResult> {
  const supabaseAdmin = getSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from(spec.table)
    .select(spec.column)
    .limit(1);

  if (error) {
    return {
      table: spec.table,
      column: spec.column,
      attempted: true,
      dbReadExecuted: true,
      selectStatus: 'error',
      rowCountCategory: 'unknown',
      sanitizedQueryErrorCategory: categorizeQueryIssue(error),
      rawValueReturned: false,
    };
  }

  const rows = Array.isArray(data) ? data : [];

  return {
    table: spec.table,
    column: spec.column,
    attempted: true,
    dbReadExecuted: true,
    selectStatus: 'ok',
    rowCountCategory: categorizeRowCount(rows),
    sanitizedQueryErrorCategory: 'none',
    rawValueReturned: false,
  };
}

async function probeFilter(
  spec: FilterProbeSpec,
  mappedAppUserId: string,
): Promise<FilterProbeResult> {
  const supabaseAdmin = getSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from(spec.table)
    .select(spec.selectShape)
    .eq(spec.filterColumn, mappedAppUserId)
    .limit(2);

  if (error) {
    return {
      label: spec.label,
      table: spec.table,
      filterColumn: spec.filterColumn,
      filterValueSource: 'mapped_app_user_id',
      selectShape: spec.selectShape,
      attempted: true,
      dbReadExecuted: true,
      selectStatus: 'error',
      rowCountCategory: 'unknown',
      usableCandidateFound: false,
      sanitizedQueryErrorCategory: categorizeQueryIssue(error),
      rawRowsReturned: false,
    };
  }

  const rows = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
  const usableCandidateFound = rows.some((row) =>
    hasRequiredCandidateColumns(row, spec.requiredCandidateColumns),
  );

  return {
    label: spec.label,
    table: spec.table,
    filterColumn: spec.filterColumn,
    filterValueSource: 'mapped_app_user_id',
    selectShape: spec.selectShape,
    attempted: true,
    dbReadExecuted: true,
    selectStatus: 'ok',
    rowCountCategory: categorizeRowCount(rows),
    usableCandidateFound,
    sanitizedQueryErrorCategory: 'none',
    rawRowsReturned: false,
  };
}

function buildCandidateContractHints(filterProbeResults: FilterProbeResult[]): ContractHint[] {
  return filterProbeResults
    .filter((result) => result.selectStatus === 'ok' && result.usableCandidateFound)
    .map((result) => ({
      label: result.label,
      table: result.table,
      filterColumn: result.filterColumn,
      filterValueSource: result.filterValueSource,
      rowCountCategory: result.rowCountCategory,
      usableCandidateFound: result.usableCandidateFound,
    }));
}

export async function GET(request: NextRequest): Promise<NextResponse<DiagnosticResponseBody>> {
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
        code: 'OWNERSHIP_CONTEXT_COLUMN_CONTRACT_PROBE_HEADER_REQUIRED',
        guardrails: buildGuardrails({
          routeAuthIntegrated: false,
          appUserMappingIntegrated: false,
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
        code: 'OWNERSHIP_CONTEXT_COLUMN_CONTRACT_PROBE_AUTH_SESSION_READ_FAILED',
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
        code: 'OWNERSHIP_CONTEXT_COLUMN_CONTRACT_PROBE_AUTH_SESSION_REQUIRED',
        headerAccepted: true,
        authSessionReadExecuted: true,
        guardrails: buildGuardrails(),
      }),
      401,
    );
  }

  const appUserMapping = await mapServerSideAppUserReadOnly({
    provider: 'auth0',
    authSubject: trustedAuthSubject,
  });

  const appUserMappingStatus =
    readStringProperty(appUserMapping, 'mappingStatus') ??
    readStringProperty(appUserMapping, 'status') ??
    'app_user_lookup_error';
  const appUserMappingDbReadExecuted = readBooleanProperty(appUserMapping, 'dbReadExecuted');
  const mappedAppUserId = readStringProperty(appUserMapping, 'appUserId');
  const appUserMapped = appUserMappingStatus === 'mapped_user_found' && Boolean(mappedAppUserId);

  if (!appUserMapped || !mappedAppUserId) {
    return jsonResponse(
      buildBody({
        code: 'OWNERSHIP_CONTEXT_COLUMN_CONTRACT_PROBE_APP_USER_MAPPING_REQUIRED',
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

  const columnProbeResults: ColumnProbeResult[] = [];
  const filterProbeResults: FilterProbeResult[] = [];

  for (const spec of columnProbeSpecs) {
    columnProbeResults.push(await probeColumn(spec));
  }

  for (const spec of filterProbeSpecs) {
    filterProbeResults.push(await probeFilter(spec, mappedAppUserId));
  }

  const candidateContractHints = buildCandidateContractHints(filterProbeResults);
  const columnProbeErrorCategories = collectErrorCategories(columnProbeResults);
  const filterProbeErrorCategories = collectErrorCategories(filterProbeResults);

  return jsonResponse(
    buildBody({
      ok: true,
      code: 'OWNERSHIP_CONTEXT_COLUMN_CONTRACT_PROBE_COMPLETED',
      headerAccepted: true,
      authSessionReadExecuted: true,
      appUserMappingExecuted: true,
      appUserMappingStatus,
      appUserMapped: true,
      appUserMappingDbReadExecuted,
      probeExecuted: true,
      columnProbeResults,
      filterProbeResults,
      candidateContractHints,
      columnProbeErrorCategories,
      filterProbeErrorCategories,
      guardrails: buildGuardrails({
        dbReadExecuted: true,
      }),
    }),
    200,
  );
}
