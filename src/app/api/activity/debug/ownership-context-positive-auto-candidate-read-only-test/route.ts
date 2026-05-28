import { NextRequest, NextResponse } from 'next/server';

import { auth0 } from '../../../../../../lib/auth0';
import { getSupabaseAdminClient } from '../../../../../../lib/supabase/admin';
import { mapServerSideAppUserReadOnly } from '../../../../../../lib/activity/controlledIntake/serverSideAppUserMappingReadOnly';
import { resolveControlledActivityIntakeOwnershipContextReadOnly } from '../../../../../../lib/activity/controlledIntake/ownershipContextResolutionReadOnly';

export const dynamic = 'force-dynamic';

const GATE = 'P4.10.0-C8-I-D4-L-L-O-DJ-R13C' as const;
const MODE = 'ownership_context_positive_auto_candidate_read_only_diagnostic' as const;
const REQUIRED_HEADER_NAME = 'x-ownership-context-positive-auto-candidate-read-only-test' as const;
const REQUIRED_HEADER_VALUE = 'enabled' as const;

type CandidateKind =
  | 'owned_space'
  | 'actor_space_role_space'
  | 'creator_organization'
  | 'organization_actor'
  | 'none';

type SanitizedQueryErrorCategory =
  | 'none'
  | 'column_not_found'
  | 'relation_not_found'
  | 'permission_or_rls'
  | 'schema_cache_miss'
  | 'query_error'
  | 'unknown';

type CandidateSearchStep = {
  kind: CandidateKind;
  attempted: boolean;
  dbReadExecuted: boolean;
  rowCountCategory: 'not_attempted' | 'zero' | 'one' | 'multiple' | 'unknown';
  usableCandidateFound: boolean;
  sanitizedQueryErrorCategory: SanitizedQueryErrorCategory;
};

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
  candidateSearchExecuted: boolean;
  candidateKind: CandidateKind;
  candidateFound: boolean;
  candidateSearchSteps: CandidateSearchStep[];
  candidateSearchErrorCategories: SanitizedQueryErrorCategory[];
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

type SpaceRow = {
  id: string | null;
};

type ActorSpaceRoleRow = {
  space_id: string | null;
};

type OrganizationRow = {
  id: string | null;
};

type ActorRow = {
  id: string | null;
  organization_id: string | null;
};

type Candidate = {
  kind: Exclude<CandidateKind, 'none'>;
  requestedSpaceId: string | null;
  requestedActorId: string | null;
  requestedOrganizationId: string | null;
  requestedContextSource: string;
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

function categorizeRowCount(rows: unknown[]): CandidateSearchStep['rowCountCategory'] {
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
    text.includes('column') && text.includes('does not exist') ||
    text.includes('could not find') && text.includes('column')
  ) {
    return 'column_not_found';
  }

  if (
    text.includes('42p01') ||
    text.includes('relation') && text.includes('does not exist') ||
    text.includes('could not find') && text.includes('table')
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
    text.includes('pgrst') && text.includes('schema')
  ) {
    return 'schema_cache_miss';
  }

  return 'query_error';
}

function sanitizeCandidateSearchStep(values: CandidateSearchStep): CandidateSearchStep {
  return {
    kind: values.kind,
    attempted: values.attempted,
    dbReadExecuted: values.dbReadExecuted,
    rowCountCategory: values.rowCountCategory,
    usableCandidateFound: values.usableCandidateFound,
    sanitizedQueryErrorCategory: values.sanitizedQueryErrorCategory,
  };
}

function collectCandidateSearchErrorCategories(
  steps: CandidateSearchStep[],
): SanitizedQueryErrorCategory[] {
  const categories = new Set<SanitizedQueryErrorCategory>();

  for (const step of steps) {
    if (step.sanitizedQueryErrorCategory !== 'none') {
      categories.add(step.sanitizedQueryErrorCategory);
    }
  }

  return Array.from(categories);
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
    candidateSearchExecuted: false,
    candidateKind: 'none',
    candidateFound: false,
    candidateSearchSteps: [],
    candidateSearchErrorCategories: [],
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

async function findOwnedSpaceCandidate(
  mappedAppUserId: string,
  steps: CandidateSearchStep[],
): Promise<Candidate | null> {
  const supabaseAdmin = getSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from('spaces')
    .select('id')
    .eq('owner_app_user_id', mappedAppUserId)
    .limit(2);

  if (error) {
    steps.push(
      sanitizeCandidateSearchStep({
        kind: 'owned_space',
        attempted: true,
        dbReadExecuted: true,
        rowCountCategory: 'unknown',
        usableCandidateFound: false,
        sanitizedQueryErrorCategory: categorizeQueryIssue(error),
      }),
    );

    return null;
  }

  const rows = Array.isArray(data) ? (data as SpaceRow[]) : [];
  const usableRow = rows.find((row) => typeof row.id === 'string' && row.id.trim().length > 0);

  steps.push(
    sanitizeCandidateSearchStep({
      kind: 'owned_space',
      attempted: true,
      dbReadExecuted: true,
      rowCountCategory: categorizeRowCount(rows),
      usableCandidateFound: Boolean(usableRow),
      sanitizedQueryErrorCategory: 'none',
    }),
  );

  if (!usableRow?.id) {
    return null;
  }

  return {
    kind: 'owned_space',
    requestedSpaceId: usableRow.id,
    requestedActorId: null,
    requestedOrganizationId: null,
    requestedContextSource: 'auto_owned_space',
  };
}

async function findActorSpaceRoleCandidate(
  mappedAppUserId: string,
  steps: CandidateSearchStep[],
): Promise<Candidate | null> {
  const supabaseAdmin = getSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from('actor_space_roles')
    .select('space_id')
    .eq('app_user_id', mappedAppUserId)
    .limit(2);

  if (error) {
    steps.push(
      sanitizeCandidateSearchStep({
        kind: 'actor_space_role_space',
        attempted: true,
        dbReadExecuted: true,
        rowCountCategory: 'unknown',
        usableCandidateFound: false,
        sanitizedQueryErrorCategory: categorizeQueryIssue(error),
      }),
    );

    return null;
  }

  const rows = Array.isArray(data) ? (data as ActorSpaceRoleRow[]) : [];
  const usableRow = rows.find(
    (row) => typeof row.space_id === 'string' && row.space_id.trim().length > 0,
  );

  steps.push(
    sanitizeCandidateSearchStep({
      kind: 'actor_space_role_space',
      attempted: true,
      dbReadExecuted: true,
      rowCountCategory: categorizeRowCount(rows),
      usableCandidateFound: Boolean(usableRow),
      sanitizedQueryErrorCategory: 'none',
    }),
  );

  if (!usableRow?.space_id) {
    return null;
  }

  return {
    kind: 'actor_space_role_space',
    requestedSpaceId: usableRow.space_id,
    requestedActorId: null,
    requestedOrganizationId: null,
    requestedContextSource: 'auto_actor_space_role_space',
  };
}

async function findCreatorOrganizationCandidate(
  mappedAppUserId: string,
  steps: CandidateSearchStep[],
): Promise<Candidate | null> {
  const supabaseAdmin = getSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('created_by_app_user_id', mappedAppUserId)
    .limit(2);

  if (error) {
    steps.push(
      sanitizeCandidateSearchStep({
        kind: 'creator_organization',
        attempted: true,
        dbReadExecuted: true,
        rowCountCategory: 'unknown',
        usableCandidateFound: false,
        sanitizedQueryErrorCategory: categorizeQueryIssue(error),
      }),
    );

    return null;
  }

  const rows = Array.isArray(data) ? (data as OrganizationRow[]) : [];
  const usableRow = rows.find((row) => typeof row.id === 'string' && row.id.trim().length > 0);

  steps.push(
    sanitizeCandidateSearchStep({
      kind: 'creator_organization',
      attempted: true,
      dbReadExecuted: true,
      rowCountCategory: categorizeRowCount(rows),
      usableCandidateFound: Boolean(usableRow),
      sanitizedQueryErrorCategory: 'none',
    }),
  );

  if (!usableRow?.id) {
    return null;
  }

  return {
    kind: 'creator_organization',
    requestedSpaceId: null,
    requestedActorId: null,
    requestedOrganizationId: usableRow.id,
    requestedContextSource: 'auto_creator_organization',
  };
}

async function findOrganizationActorCandidate(
  mappedAppUserId: string,
  steps: CandidateSearchStep[],
): Promise<Candidate | null> {
  const supabaseAdmin = getSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from('actors')
    .select('id,organization_id')
    .eq('app_user_id', mappedAppUserId)
    .limit(2);

  if (error) {
    steps.push(
      sanitizeCandidateSearchStep({
        kind: 'organization_actor',
        attempted: true,
        dbReadExecuted: true,
        rowCountCategory: 'unknown',
        usableCandidateFound: false,
        sanitizedQueryErrorCategory: categorizeQueryIssue(error),
      }),
    );

    return null;
  }

  const rows = Array.isArray(data) ? (data as ActorRow[]) : [];
  const usableRow = rows.find(
    (row) =>
      typeof row.id === 'string' &&
      row.id.trim().length > 0 &&
      typeof row.organization_id === 'string' &&
      row.organization_id.trim().length > 0,
  );

  steps.push(
    sanitizeCandidateSearchStep({
      kind: 'organization_actor',
      attempted: true,
      dbReadExecuted: true,
      rowCountCategory: categorizeRowCount(rows),
      usableCandidateFound: Boolean(usableRow),
      sanitizedQueryErrorCategory: 'none',
    }),
  );

  if (!usableRow?.id || !usableRow.organization_id) {
    return null;
  }

  return {
    kind: 'organization_actor',
    requestedSpaceId: null,
    requestedActorId: usableRow.id,
    requestedOrganizationId: usableRow.organization_id,
    requestedContextSource: 'auto_organization_actor',
  };
}

async function findPositiveCandidate(mappedAppUserId: string): Promise<{
  candidate: Candidate | null;
  steps: CandidateSearchStep[];
}> {
  const steps: CandidateSearchStep[] = [];

  const ownedSpaceCandidate = await findOwnedSpaceCandidate(mappedAppUserId, steps);
  if (ownedSpaceCandidate) {
    return {
      candidate: ownedSpaceCandidate,
      steps,
    };
  }

  const actorSpaceRoleCandidate = await findActorSpaceRoleCandidate(mappedAppUserId, steps);
  if (actorSpaceRoleCandidate) {
    return {
      candidate: actorSpaceRoleCandidate,
      steps,
    };
  }

  const creatorOrganizationCandidate = await findCreatorOrganizationCandidate(mappedAppUserId, steps);
  if (creatorOrganizationCandidate) {
    return {
      candidate: creatorOrganizationCandidate,
      steps,
    };
  }

  const organizationActorCandidate = await findOrganizationActorCandidate(mappedAppUserId, steps);
  if (organizationActorCandidate) {
    return {
      candidate: organizationActorCandidate,
      steps,
    };
  }

  return {
    candidate: null,
    steps,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<DiagnosticResponseBody>> {
  const headerValue = request.headers.get(REQUIRED_HEADER_NAME);

  if (headerValue !== REQUIRED_HEADER_VALUE) {
    return jsonResponse(
      buildBody({
        code: 'OWNERSHIP_CONTEXT_POSITIVE_AUTO_CANDIDATE_HEADER_REQUIRED',
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
        code: 'OWNERSHIP_CONTEXT_POSITIVE_AUTO_CANDIDATE_AUTH_SESSION_READ_FAILED',
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
        code: 'OWNERSHIP_CONTEXT_POSITIVE_AUTO_CANDIDATE_AUTH_SESSION_REQUIRED',
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
        code: 'OWNERSHIP_CONTEXT_POSITIVE_AUTO_CANDIDATE_APP_USER_MAPPING_REQUIRED',
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

  const candidateSearch = await findPositiveCandidate(mappedAppUserId);
  const candidate = candidateSearch.candidate;
  const candidateSearchErrorCategories = collectCandidateSearchErrorCategories(candidateSearch.steps);

  if (!candidate) {
    return jsonResponse(
      buildBody({
        code: 'OWNERSHIP_CONTEXT_POSITIVE_AUTO_CANDIDATE_NOT_FOUND',
        headerAccepted: true,
        authSessionReadExecuted: true,
        appUserMappingExecuted: true,
        appUserMappingStatus,
        appUserMapped: true,
        appUserMappingDbReadExecuted,
        candidateSearchExecuted: true,
        candidateKind: 'none',
        candidateFound: false,
        candidateSearchSteps: candidateSearch.steps,
        candidateSearchErrorCategories,
        guardrails: buildGuardrails({
          dbReadExecuted: true,
        }),
      }),
      404,
    );
  }

  const ownershipContextResolution =
    await resolveControlledActivityIntakeOwnershipContextReadOnly({
      mappedAppUserId,
      requestedActorId: candidate.requestedActorId,
      requestedSpaceId: candidate.requestedSpaceId,
      requestedOrganizationId: candidate.requestedOrganizationId,
      requestedContextSource: candidate.requestedContextSource,
    });

  const dbReadExecuted =
    appUserMappingDbReadExecuted ||
    candidateSearch.steps.some((step) => step.dbReadExecuted) ||
    ownershipContextResolution.dbReadExecuted;

  return jsonResponse(
    buildBody({
      ok: ownershipContextResolution.resolved,
      code: ownershipContextResolution.resolved
        ? 'OWNERSHIP_CONTEXT_POSITIVE_AUTO_CANDIDATE_RESOLVED'
        : 'OWNERSHIP_CONTEXT_POSITIVE_AUTO_CANDIDATE_FAIL_CLOSED',
      headerAccepted: true,
      authSessionReadExecuted: true,
      appUserMappingExecuted: true,
      appUserMappingStatus,
      appUserMapped: true,
      appUserMappingDbReadExecuted,
      candidateSearchExecuted: true,
      candidateKind: candidate.kind,
      candidateFound: true,
      candidateSearchSteps: candidateSearch.steps,
      candidateSearchErrorCategories,
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
    ownershipContextResolution.resolved ? 200 : 409,
  );
}
