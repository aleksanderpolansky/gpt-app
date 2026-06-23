import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseAdminClient } from '../../../../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';

const GATE = 'G1-C8-I-POST-SQL-API-VERIFY' as const;
const MODE = 'read_only_service_role_c8_i_shape_check' as const;
const ENDPOINT = '/api/activity/debug/c8-i-post-sql-api-verify' as const;
const REQUIRED_HEADER_NAME = 'x-c8-i-post-sql-api-verify' as const;
const REQUIRED_HEADER_VALUE = 'enabled' as const;

type CountCategory = 'zero' | 'non_zero' | 'unknown';

type SanitizedErrorCategory =
  | 'none'
  | 'env_missing'
  | 'client_creation_error'
  | 'table_read_error'
  | 'unknown';

type C8ITableKey =
  | 'stateDimensions'
  | 'stateRelevanceRules'
  | 'valueObjectStateFacts'
  | 'activityStateDeltas'
  | 'valueObjectStateSnapshots'
  | 'semanticSignatures'
  | 'valueObjectSimilarityEdges'
  | 'valueObjectRelevanceEdges'
  | 'resolverRuns'
  | 'resolverCandidateLinks'
  | 'resolverFeedback';

type C8ITableProofSpec = {
  key: C8ITableKey;
  table: string;
  selectedColumns: string;
  requiredMarkerColumn: string;
};

type TableReadProof = {
  key: C8ITableKey;
  table: string;
  ok: boolean;
  selectedColumns: string;
  requiredMarkerColumn: string;
  readAttempted: boolean;
  readSucceeded: boolean;
  countCategory: CountCategory;
  sanitizedErrorCategory: SanitizedErrorCategory;
  sanitizedErrorCode: string | null;
};

type Guardrails = {
  diagnosticEndpointOnly: true;
  productionWriteEnabled: false;
  dbReadExecuted: boolean;
  dbWriteExecuted: false;
  sqlExecuted: false;
  rpcExecuted: false;
  aiCallExecuted: false;
  activityEventsInserted: false;
  semanticCandidatesPersisted: false;
  valueObjectsCreated: false;
  stateFactsCreated: false;
  stateDeltasCreated: false;
  stateSnapshotsCreated: false;
  responseSanitized: true;
};

type ResponseBody = {
  ok: boolean;
  gate: typeof GATE;
  mode: typeof MODE;
  endpoint: typeof ENDPOINT;
  code: string;
  headerAccepted: boolean;
  supabaseUrlConfigured: boolean;
  serviceRoleKeyConfigured: boolean;
  supabaseAdminClientCreated: boolean;
  tableProofsAttempted: boolean;
  expectedTablesCount: number;
  successfulTablesCount: number;
  failedTablesCount: number;
  allExpectedTablesReadable: boolean;
  ruleKeyShapeChecked: boolean;
  semanticSignaturesShapeChecked: boolean;
  sanitizedErrorCategory: SanitizedErrorCategory;
  responseSanitized: true;
  guardrails: Guardrails;
  tables: TableReadProof[];
};

const C8_I_TABLES: C8ITableProofSpec[] = [
  {
    key: 'stateDimensions',
    table: 'state_dimensions',
    selectedColumns: 'dimension_key',
    requiredMarkerColumn: 'dimension_key',
  },
  {
    key: 'stateRelevanceRules',
    table: 'state_relevance_rules',
    selectedColumns: 'rule_key',
    requiredMarkerColumn: 'rule_key',
  },
  {
    key: 'valueObjectStateFacts',
    table: 'value_object_state_facts',
    selectedColumns: 'id',
    requiredMarkerColumn: 'id',
  },
  {
    key: 'activityStateDeltas',
    table: 'activity_state_deltas',
    selectedColumns: 'id',
    requiredMarkerColumn: 'id',
  },
  {
    key: 'valueObjectStateSnapshots',
    table: 'value_object_state_snapshots',
    selectedColumns: 'id',
    requiredMarkerColumn: 'id',
  },
  {
    key: 'semanticSignatures',
    table: 'semantic_signatures',
    selectedColumns: 'id',
    requiredMarkerColumn: 'id',
  },
  {
    key: 'valueObjectSimilarityEdges',
    table: 'value_object_similarity_edges',
    selectedColumns: 'id',
    requiredMarkerColumn: 'id',
  },
  {
    key: 'valueObjectRelevanceEdges',
    table: 'value_object_relevance_edges',
    selectedColumns: 'id',
    requiredMarkerColumn: 'id',
  },
  {
    key: 'resolverRuns',
    table: 'resolver_runs',
    selectedColumns: 'id',
    requiredMarkerColumn: 'id',
  },
  {
    key: 'resolverCandidateLinks',
    table: 'resolver_candidate_links',
    selectedColumns: 'id',
    requiredMarkerColumn: 'id',
  },
  {
    key: 'resolverFeedback',
    table: 'resolver_feedback',
    selectedColumns: 'id',
    requiredMarkerColumn: 'id',
  },
];

function getSupabaseUrlConfigured(): boolean {
  return Boolean(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
  );
}

function getServiceRoleKeyConfigured(): boolean {
  return Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim());
}

function categorizeCount(count: number | null): CountCategory {
  if (count === null) {
    return 'unknown';
  }

  return count > 0 ? 'non_zero' : 'zero';
}

function sanitizeErrorCode(code: unknown): string | null {
  if (typeof code !== 'string') {
    return null;
  }

  const normalized = code.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 32);
}

function buildGuardrails(overrides?: Partial<Guardrails>): Guardrails {
  return {
    diagnosticEndpointOnly: true,
    productionWriteEnabled: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    sqlExecuted: false,
    rpcExecuted: false,
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

function buildBody(overrides?: Partial<ResponseBody>): ResponseBody {
  return {
    ok: false,
    gate: GATE,
    mode: MODE,
    endpoint: ENDPOINT,
    code: 'C8_I_POST_SQL_API_VERIFY_NOT_EXECUTED',
    headerAccepted: false,
    supabaseUrlConfigured: getSupabaseUrlConfigured(),
    serviceRoleKeyConfigured: getServiceRoleKeyConfigured(),
    supabaseAdminClientCreated: false,
    tableProofsAttempted: false,
    expectedTablesCount: C8_I_TABLES.length,
    successfulTablesCount: 0,
    failedTablesCount: 0,
    allExpectedTablesReadable: false,
    ruleKeyShapeChecked: false,
    semanticSignaturesShapeChecked: false,
    sanitizedErrorCategory: 'none',
    responseSanitized: true,
    guardrails: buildGuardrails(),
    tables: [],
    ...overrides,
  };
}

function jsonResponse(body: ResponseBody, status: number): NextResponse<ResponseBody> {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

async function readTableShape(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  spec: C8ITableProofSpec,
): Promise<TableReadProof> {
  try {
    const { count, error } = await supabase
      .from(spec.table)
      .select(spec.selectedColumns, {
        count: 'exact',
        head: true,
      });

    if (error) {
      return {
        key: spec.key,
        table: spec.table,
        ok: false,
        selectedColumns: spec.selectedColumns,
        requiredMarkerColumn: spec.requiredMarkerColumn,
        readAttempted: true,
        readSucceeded: false,
        countCategory: 'unknown',
        sanitizedErrorCategory: 'table_read_error',
        sanitizedErrorCode: sanitizeErrorCode(error.code),
      };
    }

    return {
      key: spec.key,
      table: spec.table,
      ok: true,
      selectedColumns: spec.selectedColumns,
      requiredMarkerColumn: spec.requiredMarkerColumn,
      readAttempted: true,
      readSucceeded: true,
      countCategory: categorizeCount(count),
      sanitizedErrorCategory: 'none',
      sanitizedErrorCode: null,
    };
  } catch {
    return {
      key: spec.key,
      table: spec.table,
      ok: false,
      selectedColumns: spec.selectedColumns,
      requiredMarkerColumn: spec.requiredMarkerColumn,
      readAttempted: true,
      readSucceeded: false,
      countCategory: 'unknown',
      sanitizedErrorCategory: 'unknown',
      sanitizedErrorCode: null,
    };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<ResponseBody>> {
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
        code: 'C8_I_POST_SQL_API_VERIFY_HEADER_REQUIRED',
        sanitizedErrorCategory: 'none',
      }),
      403,
    );
  }

  const supabaseUrlConfigured = getSupabaseUrlConfigured();
  const serviceRoleKeyConfigured = getServiceRoleKeyConfigured();

  if (!supabaseUrlConfigured || !serviceRoleKeyConfigured) {
    return jsonResponse(
      buildBody({
        code: 'C8_I_POST_SQL_API_VERIFY_ENV_MISSING',
        headerAccepted: true,
        supabaseUrlConfigured,
        serviceRoleKeyConfigured,
        sanitizedErrorCategory: 'env_missing',
      }),
      500,
    );
  }

  let supabase: ReturnType<typeof getSupabaseAdminClient>;

  try {
    supabase = getSupabaseAdminClient();
  } catch {
    return jsonResponse(
      buildBody({
        code: 'C8_I_POST_SQL_API_VERIFY_CLIENT_CREATION_ERROR',
        headerAccepted: true,
        supabaseUrlConfigured,
        serviceRoleKeyConfigured,
        supabaseAdminClientCreated: false,
        sanitizedErrorCategory: 'client_creation_error',
      }),
      500,
    );
  }

  const tables = await Promise.all(
    C8_I_TABLES.map((spec) => readTableShape(supabase, spec)),
  );

  const successfulTablesCount = tables.filter((table) => table.ok).length;
  const failedTablesCount = tables.length - successfulTablesCount;
  const allExpectedTablesReadable = failedTablesCount === 0;
  const ruleKeyShapeChecked = tables.some(
    (table) =>
      table.table === 'state_relevance_rules' &&
      table.requiredMarkerColumn === 'rule_key' &&
      table.ok,
  );
  const semanticSignaturesShapeChecked = tables.some(
    (table) =>
      table.table === 'semantic_signatures' &&
      table.requiredMarkerColumn === 'id' &&
      table.ok,
  );

  const ok =
    allExpectedTablesReadable &&
    ruleKeyShapeChecked &&
    semanticSignaturesShapeChecked;

  return jsonResponse(
    buildBody({
      ok,
      code: ok
        ? 'C8_I_POST_SQL_API_VERIFY_PASS'
        : 'C8_I_POST_SQL_API_VERIFY_FAIL',
      headerAccepted: true,
      supabaseUrlConfigured,
      serviceRoleKeyConfigured,
      supabaseAdminClientCreated: true,
      tableProofsAttempted: true,
      successfulTablesCount,
      failedTablesCount,
      allExpectedTablesReadable,
      ruleKeyShapeChecked,
      semanticSignaturesShapeChecked,
      sanitizedErrorCategory: ok ? 'none' : 'table_read_error',
      guardrails: buildGuardrails({
        dbReadExecuted: true,
      }),
      tables,
    }),
    ok ? 200 : 500,
  );
}
