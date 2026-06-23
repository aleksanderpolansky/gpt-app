import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import crypto from "crypto";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import { getSupabaseAdminClient } from "../../../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";

type OwnershipRlsWritesV0 = {
  sqlExecuted: false;
  dbReadExecuted: boolean;
  dbWriteExecuted: false;
  supabaseReadExecuted: boolean;
  supabaseWriteExecuted: false;
  activityEventInserted: false;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  stateDeltaCreated: false;
  stateFactCreated: false;
  stateSnapshotCreated: false;
};

type ColumnProbeV0 = {
  column: string;
  attempted: boolean;
  exists: boolean;
  errorCode: string | null;
  errorMessage: string | null;
};

type OwnershipTargetDefinitionV0 = {
  key: string;
  table: string;
  primaryColumn: string;
  ownershipColumns: string[];
  relationColumns: string[];
  semanticPersistenceRelevance:
    | "identity_mapping"
    | "actor_resolution"
    | "organization_resolution"
    | "activity_persistence"
    | "value_object_persistence"
    | "semantic_link_persistence"
    | "state_candidate_persistence"
    | "resolver_feedback";
};

type OwnershipTargetReadinessV0 = {
  key: string;
  table: string;
  primaryColumn: string;
  semanticPersistenceRelevance: OwnershipTargetDefinitionV0["semanticPersistenceRelevance"];
  tableReadable: boolean;
  primaryColumnExists: boolean;
  ownershipColumnsChecked: string[];
  existingOwnershipColumns: string[];
  relationColumnsChecked: string[];
  existingRelationColumns: string[];
  hasOwnershipSignal: boolean;
  hasRelationSignal: boolean;
  canBuildFutureOwnershipPredicate: boolean;
  primaryColumnProbe: ColumnProbeV0;
  ownershipColumnProbes: ColumnProbeV0[];
  relationColumnProbes: ColumnProbeV0[];
};

type Auth0ReadinessV0 = {
  readAttempted: true;
  readOk: boolean;
  readErrorName: string | null;
  readErrorMessage: string | null;
  sessionAvailable: boolean;
  trustedAuthSubjectPresent: boolean;
  trustedAuthSubjectSha256Prefix: string | null;
};

type OwnershipRlsReadinessDecisionV0 = {
  provesAuth0SessionReadPath: boolean;
  provesOwnershipColumnReadiness: boolean;
  provesActorOwnershipPredicateReadiness: boolean;
  provesOrganizationOwnershipPredicateReadiness: boolean;
  provesActivityPersistenceOwnershipPredicateReadiness: boolean;
  provesValueObjectOwnershipPredicateReadiness: boolean;
  provesRlsRuntimeVerification: false;
  rlsRuntimeVerificationReason: string;
  canOpenWriteGate: false;
  canTrustClientIdentity: false;
  readyForC28DryRunIntegration: boolean;
};

type SupabaseAdminClientV0 = ReturnType<typeof getSupabaseAdminClient>;

const OWNERSHIP_TARGETS_V0: OwnershipTargetDefinitionV0[] = [
  {
    key: "appUsers",
    table: "app_users",
    primaryColumn: "id",
    ownershipColumns: ["auth0_sub"],
    relationColumns: [],
    semanticPersistenceRelevance: "identity_mapping",
  },
  {
    key: "actors",
    table: "actors",
    primaryColumn: "id",
    ownershipColumns: ["user_id", "app_user_id", "owner_user_id", "created_by", "created_by_user_id"],
    relationColumns: ["organization_id", "space_id"],
    semanticPersistenceRelevance: "actor_resolution",
  },
  {
    key: "actorSpaceRoles",
    table: "actor_space_roles",
    primaryColumn: "id",
    ownershipColumns: ["user_id", "app_user_id", "owner_user_id"],
    relationColumns: ["actor_id", "space_id", "organization_id", "role"],
    semanticPersistenceRelevance: "actor_resolution",
  },
  {
    key: "organizations",
    table: "organizations",
    primaryColumn: "id",
    ownershipColumns: ["owner_user_id", "created_by_user_id", "created_by", "user_id", "app_user_id"],
    relationColumns: ["country_code", "default_currency"],
    semanticPersistenceRelevance: "organization_resolution",
  },
  {
    key: "activityEvents",
    table: "activity_events",
    primaryColumn: "id",
    ownershipColumns: ["user_id", "app_user_id", "owner_user_id", "created_by", "created_by_user_id"],
    relationColumns: ["actor_id", "organization_id", "source", "status"],
    semanticPersistenceRelevance: "activity_persistence",
  },
  {
    key: "valueObjects",
    table: "value_objects",
    primaryColumn: "id",
    ownershipColumns: ["user_id", "app_user_id", "owner_user_id", "created_by", "created_by_user_id"],
    relationColumns: ["actor_id", "organization_id", "visibility", "status"],
    semanticPersistenceRelevance: "value_object_persistence",
  },
  {
    key: "activityValueObjectLinks",
    table: "activity_value_object_links",
    primaryColumn: "id",
    ownershipColumns: ["user_id", "app_user_id", "owner_user_id", "created_by", "created_by_user_id"],
    relationColumns: ["activity_event_id", "value_object_id", "actor_id", "organization_id"],
    semanticPersistenceRelevance: "semantic_link_persistence",
  },
  {
    key: "activityStateDeltas",
    table: "activity_state_deltas",
    primaryColumn: "id",
    ownershipColumns: ["user_id", "app_user_id", "owner_user_id", "created_by", "created_by_user_id"],
    relationColumns: ["activity_event_id", "value_object_id", "dimension_id", "dimension_key", "actor_id", "organization_id"],
    semanticPersistenceRelevance: "state_candidate_persistence",
  },
  {
    key: "resolverFeedback",
    table: "resolver_feedback",
    primaryColumn: "id",
    ownershipColumns: ["user_id", "app_user_id", "owner_user_id", "created_by", "created_by_user_id"],
    relationColumns: ["resolver_run_id", "candidate_id", "actor_id", "organization_id"],
    semanticPersistenceRelevance: "resolver_feedback",
  },
];

function buildWrites(supabaseReadExecuted: boolean): OwnershipRlsWritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: supabaseReadExecuted,
    dbWriteExecuted: false,
    supabaseReadExecuted,
    supabaseWriteExecuted: false,
    activityEventInserted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    stateDeltaCreated: false,
    stateFactCreated: false,
    stateSnapshotCreated: false,
  };
}

function sanitizeErrorMessage(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.slice(0, 220);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStringProperty(value: unknown, key: string): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const fieldValue = value[key];

  return typeof fieldValue === "string" && fieldValue.length > 0
    ? fieldValue
    : null;
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

function hashDiagnosticValue(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return crypto
    .createHash("sha256")
    .update(value.trim())
    .digest("hex")
    .slice(0, 16);
}

function getSupabaseUrlConfigured(): boolean {
  return Boolean(
    (
      process.env.SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      ""
    ).trim()
  );
}

function getServiceRoleKeyConfigured(): boolean {
  return Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim());
}

async function probeColumn(
  supabase: SupabaseAdminClientV0,
  table: string,
  column: string
): Promise<ColumnProbeV0> {
  try {
    const { error } = await supabase.from(table).select(column).limit(1);

    if (error) {
      return {
        column,
        attempted: true,
        exists: false,
        errorCode: error.code ?? "unknown",
        errorMessage: sanitizeErrorMessage(error.message),
      };
    }

    return {
      column,
      attempted: true,
      exists: true,
      errorCode: null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      column,
      attempted: true,
      exists: false,
      errorCode: "unexpected_column_probe_error",
      errorMessage:
        error instanceof Error
          ? sanitizeErrorMessage(error.message)
          : "Unexpected column probe error.",
    };
  }
}

async function buildTargetReadiness(
  supabase: SupabaseAdminClientV0,
  target: OwnershipTargetDefinitionV0
): Promise<OwnershipTargetReadinessV0> {
  const primaryColumnProbe = await probeColumn(
    supabase,
    target.table,
    target.primaryColumn
  );

  const ownershipColumnProbes: ColumnProbeV0[] = [];

  for (const column of target.ownershipColumns) {
    ownershipColumnProbes.push(await probeColumn(supabase, target.table, column));
  }

  const relationColumnProbes: ColumnProbeV0[] = [];

  for (const column of target.relationColumns) {
    relationColumnProbes.push(await probeColumn(supabase, target.table, column));
  }

  const existingOwnershipColumns = ownershipColumnProbes
    .filter((probe) => probe.exists)
    .map((probe) => probe.column);

  const existingRelationColumns = relationColumnProbes
    .filter((probe) => probe.exists)
    .map((probe) => probe.column);

  const hasOwnershipSignal = existingOwnershipColumns.length > 0;
  const hasRelationSignal = existingRelationColumns.length > 0;

  return {
    key: target.key,
    table: target.table,
    primaryColumn: target.primaryColumn,
    semanticPersistenceRelevance: target.semanticPersistenceRelevance,
    tableReadable: primaryColumnProbe.exists,
    primaryColumnExists: primaryColumnProbe.exists,
    ownershipColumnsChecked: target.ownershipColumns,
    existingOwnershipColumns,
    relationColumnsChecked: target.relationColumns,
    existingRelationColumns,
    hasOwnershipSignal,
    hasRelationSignal,
    canBuildFutureOwnershipPredicate:
      primaryColumnProbe.exists && (hasOwnershipSignal || hasRelationSignal),
    primaryColumnProbe,
    ownershipColumnProbes,
    relationColumnProbes,
  };
}

function getTarget(
  targets: OwnershipTargetReadinessV0[],
  key: string
): OwnershipTargetReadinessV0 | null {
  return targets.find((target) => target.key === key) ?? null;
}

function buildReadinessDecision(
  auth0Session: Auth0ReadinessV0,
  targets: OwnershipTargetReadinessV0[],
  supabaseAdminClientCreated: boolean
): OwnershipRlsReadinessDecisionV0 {
  const appUsers = getTarget(targets, "appUsers");
  const actors = getTarget(targets, "actors");
  const actorSpaceRoles = getTarget(targets, "actorSpaceRoles");
  const organizations = getTarget(targets, "organizations");
  const activityEvents = getTarget(targets, "activityEvents");
  const valueObjects = getTarget(targets, "valueObjects");

  const provesOwnershipColumnReadiness =
    Boolean(appUsers?.primaryColumnExists) &&
    Boolean(appUsers?.existingOwnershipColumns.includes("auth0_sub"));

  const provesActorOwnershipPredicateReadiness =
    Boolean(actors?.primaryColumnExists) ||
    Boolean(actorSpaceRoles?.primaryColumnExists);

  const provesOrganizationOwnershipPredicateReadiness =
    Boolean(organizations?.primaryColumnExists);

  const provesActivityPersistenceOwnershipPredicateReadiness =
    Boolean(activityEvents?.primaryColumnExists);

  const provesValueObjectOwnershipPredicateReadiness =
    Boolean(valueObjects?.primaryColumnExists);

  const readyForC28DryRunIntegration =
    supabaseAdminClientCreated &&
    auth0Session.readOk &&
    provesOwnershipColumnReadiness &&
    provesActorOwnershipPredicateReadiness &&
    provesOrganizationOwnershipPredicateReadiness &&
    provesActivityPersistenceOwnershipPredicateReadiness &&
    provesValueObjectOwnershipPredicateReadiness;

  return {
    provesAuth0SessionReadPath: auth0Session.readOk,
    provesOwnershipColumnReadiness,
    provesActorOwnershipPredicateReadiness,
    provesOrganizationOwnershipPredicateReadiness,
    provesActivityPersistenceOwnershipPredicateReadiness,
    provesValueObjectOwnershipPredicateReadiness,
    provesRlsRuntimeVerification: false,
    rlsRuntimeVerificationReason:
      "This endpoint uses server-side diagnostic reads and service-role-backed admin client. It verifies ownership predicate readiness only. It does not prove end-user RLS execution and does not open the write gate.",
    canOpenWriteGate: false,
    canTrustClientIdentity: false,
    readyForC28DryRunIntegration,
  };
}

export async function GET() {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

  let session: unknown = null;
  let sessionReadOk = true;
  let sessionReadErrorName: string | null = null;
  let sessionReadErrorMessage: string | null = null;

  try {
    session = await auth0.getSession();
  } catch (error) {
    sessionReadOk = false;
    sessionReadErrorName =
      error instanceof Error ? error.name : "UnknownAuth0SessionError";
    sessionReadErrorMessage =
      error instanceof Error
        ? sanitizeErrorMessage(error.message)
        : "Unknown Auth0 session diagnostic error.";
  }

  const trustedAuthSubject = readAuthSubjectFromSession(session);

  const auth0Session: Auth0ReadinessV0 = {
    readAttempted: true,
    readOk: sessionReadOk,
    readErrorName: sessionReadErrorName,
    readErrorMessage: sessionReadErrorMessage,
    sessionAvailable: Boolean(session),
    trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
    trustedAuthSubjectSha256Prefix: hashDiagnosticValue(trustedAuthSubject),
  };

  const supabaseUrlConfigured = getSupabaseUrlConfigured();
  const serviceRoleKeyConfigured = getServiceRoleKeyConfigured();
  let supabaseAdminClientCreated = false;
  let supabaseClientError: string | null = null;
  let supabaseReadExecuted = false;
  let targetReadiness: OwnershipTargetReadinessV0[] = [];

  if (supabaseUrlConfigured && serviceRoleKeyConfigured) {
    try {
      const supabase = getSupabaseAdminClient();
      supabaseAdminClientCreated = true;

      for (const target of OWNERSHIP_TARGETS_V0) {
        targetReadiness.push(await buildTargetReadiness(supabase, target));
        supabaseReadExecuted = true;
      }
    } catch (error) {
      supabaseClientError =
        error instanceof Error
          ? sanitizeErrorMessage(error.message)
          : "Supabase admin client creation/probe error.";
    }
  }

  const readableTargets = targetReadiness.filter(
    (target) => target.tableReadable
  ).length;

  const targetsWithOwnershipSignal = targetReadiness.filter(
    (target) => target.hasOwnershipSignal
  ).length;

  const targetsWithRelationSignal = targetReadiness.filter(
    (target) => target.hasRelationSignal
  ).length;

  const targetsWithFutureOwnershipPredicate = targetReadiness.filter(
    (target) => target.canBuildFutureOwnershipPredicate
  ).length;

  const readinessDecision = buildReadinessDecision(
    auth0Session,
    targetReadiness,
    supabaseAdminClientCreated
  );

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/debug/ownership-rls-verification-readiness",
    policy: "ownership_rls_verification_readiness_proof_v0",
    mode: "read_only_ownership_rls_readiness_no_write",
    countdownBeforeRealIntegrationChanges: "1/3",
    auth0Session,
    supabaseReadiness: {
      supabaseUrlConfigured,
      serviceRoleKeyConfigured,
      supabaseAdminClientCreated,
      supabaseClientError,
    },
    ownershipTargets: {
      totalTargets: OWNERSHIP_TARGETS_V0.length,
      probedTargets: targetReadiness.length,
      readableTargets,
      targetsWithOwnershipSignal,
      targetsWithRelationSignal,
      targetsWithFutureOwnershipPredicate,
      targets: targetReadiness,
    },
    readinessDecision,
    forbiddenInThisStep: [
      "No SQL statement.",
      "No Supabase write.",
      "No activity persistence.",
      "No user/actor mapping write.",
      "No existing auth route modification.",
      "No existing persistence route modification.",
      "No write gate opening.",
      "No state fact/delta/snapshot creation.",
    ],
    nextStep: {
      step: "C8-I-IMPLEMENT-28",
      countdownBeforeRealIntegrationChanges: "0/3",
      goal:
        "First real integration change: wire server-auth/ownership diagnostics into semantic dry-run route without enabling DB writes.",
    },
    writes: buildWrites(supabaseReadExecuted),
  });
}
