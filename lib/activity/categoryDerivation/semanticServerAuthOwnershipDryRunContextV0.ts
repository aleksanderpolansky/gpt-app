import crypto from "crypto";

import { auth0 } from "../../../lib/auth0";
import { getSupabaseAdminClient } from "../../../lib/supabase/admin";

export type SemanticServerAuthOwnershipDryRunContextPolicyV0 =
  "semantic_server_auth_ownership_dry_run_context_v0";

export type SemanticServerAuthOwnershipDryRunContextModeV0 =
  "read_only_server_auth_ownership_context_for_dry_run_no_write";

export type SemanticServerAuthOwnershipDryRunContextWritesV0 = {
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

export type SemanticServerAuthOwnershipColumnProbeV0 = {
  table: string;
  column: string;
  attempted: boolean;
  exists: boolean;
  errorCode: string | null;
  errorMessage: string | null;
};

export type SemanticServerAuthOwnershipTableProbeV0 = {
  key: string;
  table: string;
  primaryColumn: string;
  primaryColumnExists: boolean;
  ownershipColumnsChecked: string[];
  existingOwnershipColumns: string[];
  relationColumnsChecked: string[];
  existingRelationColumns: string[];
  tableReadable: boolean;
  hasOwnershipSignal: boolean;
  hasRelationSignal: boolean;
  canBuildFutureOwnershipPredicate: boolean;
  probes: SemanticServerAuthOwnershipColumnProbeV0[];
};

export type SemanticServerAuthOwnershipDryRunContextV0 = {
  ok: true;
  policy: SemanticServerAuthOwnershipDryRunContextPolicyV0;
  mode: SemanticServerAuthOwnershipDryRunContextModeV0;
  countdownBeforeFirstDbWrite: "4/4";
  integrationChange: {
    isRealIntegrationCodeChange: true;
    modifiesExistingDryRunRoute: true;
    enablesDbWrite: false;
    opensWriteGate: false;
  };
  auth0Session: {
    readAttempted: true;
    readOk: boolean;
    readErrorName: string | null;
    readErrorMessage: string | null;
    sessionAvailable: boolean;
    trustedAuthSubjectPresent: boolean;
    trustedAuthSubjectSha256Prefix: string | null;
  };
  supabaseReadiness: {
    supabaseUrlConfigured: boolean;
    serviceRoleKeyConfigured: boolean;
    supabaseAdminClientCreated: boolean;
    supabaseClientError: string | null;
  };
  ownershipReadiness: {
    totalTargets: number;
    probedTargets: number;
    readableTargets: number;
    targetsWithOwnershipSignal: number;
    targetsWithRelationSignal: number;
    targetsWithFutureOwnershipPredicate: number;
    targets: SemanticServerAuthOwnershipTableProbeV0[];
  };
  dryRunIntegrationDecision: {
    serverAuthDiagnosticsConnectedToDryRunRoute: true;
    provesAuth0SessionReadPath: boolean;
    provesOwnershipColumnReadiness: boolean;
    provesActorOwnershipPredicateReadiness: boolean;
    provesActivityPersistenceOwnershipPredicateReadiness: boolean;
    provesValueObjectOwnershipPredicateReadiness: boolean;
    provesRlsRuntimeVerification: false;
    canUseForDryRunOnly: boolean;
    canOpenWriteGate: false;
    canTrustClientIdentity: false;
    readyForNextBrowserAuthProof: boolean;
  };
  forbiddenInThisStep: string[];
  nextStep: {
    step: "C8-I-IMPLEMENT-29";
    countdownBeforeFirstDbWrite: "3/4";
    goal: "Browser-authenticated dry-run proof for semantic persistence route.";
  };
  writes: SemanticServerAuthOwnershipDryRunContextWritesV0;
};

type SupabaseAdminClientV0 = ReturnType<typeof getSupabaseAdminClient>;

type OwnershipTargetDefinitionV0 = {
  key: string;
  table: string;
  primaryColumn: string;
  ownershipColumns: string[];
  relationColumns: string[];
};

const OWNERSHIP_TARGETS_V0: OwnershipTargetDefinitionV0[] = [
  {
    key: "appUsers",
    table: "app_users",
    primaryColumn: "id",
    ownershipColumns: ["auth0_sub"],
    relationColumns: [],
  },
  {
    key: "actors",
    table: "actors",
    primaryColumn: "id",
    ownershipColumns: [
      "user_id",
      "app_user_id",
      "owner_user_id",
      "created_by",
      "created_by_user_id",
    ],
    relationColumns: ["organization_id", "space_id"],
  },
  {
    key: "actorSpaceRoles",
    table: "actor_space_roles",
    primaryColumn: "id",
    ownershipColumns: ["user_id", "app_user_id", "owner_user_id"],
    relationColumns: ["actor_id", "space_id", "organization_id", "role"],
  },
  {
    key: "activityEvents",
    table: "activity_events",
    primaryColumn: "id",
    ownershipColumns: [
      "user_id",
      "app_user_id",
      "owner_user_id",
      "created_by",
      "created_by_user_id",
    ],
    relationColumns: ["actor_id", "organization_id", "source", "status"],
  },
  {
    key: "valueObjects",
    table: "value_objects",
    primaryColumn: "id",
    ownershipColumns: [
      "user_id",
      "app_user_id",
      "owner_user_id",
      "created_by",
      "created_by_user_id",
    ],
    relationColumns: ["actor_id", "organization_id", "visibility", "status"],
  },
  {
    key: "activityValueObjectLinks",
    table: "activity_value_object_links",
    primaryColumn: "id",
    ownershipColumns: [
      "user_id",
      "app_user_id",
      "owner_user_id",
      "created_by",
      "created_by_user_id",
    ],
    relationColumns: [
      "activity_event_id",
      "value_object_id",
      "actor_id",
      "organization_id",
    ],
  },
  {
    key: "activityStateDeltas",
    table: "activity_state_deltas",
    primaryColumn: "id",
    ownershipColumns: [
      "user_id",
      "app_user_id",
      "owner_user_id",
      "created_by",
      "created_by_user_id",
    ],
    relationColumns: [
      "activity_event_id",
      "value_object_id",
      "dimension_id",
      "dimension_key",
      "actor_id",
      "organization_id",
    ],
  },
];

function sanitizeErrorMessage(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.slice(0, 220);
}

function buildWrites(
  supabaseReadExecuted: boolean
): SemanticServerAuthOwnershipDryRunContextWritesV0 {
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
): Promise<SemanticServerAuthOwnershipColumnProbeV0> {
  try {
    const { error } = await supabase.from(table).select(column).limit(1);

    if (error) {
      return {
        table,
        column,
        attempted: true,
        exists: false,
        errorCode: error.code ?? "unknown",
        errorMessage: sanitizeErrorMessage(error.message),
      };
    }

    return {
      table,
      column,
      attempted: true,
      exists: true,
      errorCode: null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      table,
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

async function buildTargetProbe(
  supabase: SupabaseAdminClientV0,
  target: OwnershipTargetDefinitionV0
): Promise<SemanticServerAuthOwnershipTableProbeV0> {
  const probes: SemanticServerAuthOwnershipColumnProbeV0[] = [];

  probes.push(await probeColumn(supabase, target.table, target.primaryColumn));

  for (const column of target.ownershipColumns) {
    probes.push(await probeColumn(supabase, target.table, column));
  }

  for (const column of target.relationColumns) {
    probes.push(await probeColumn(supabase, target.table, column));
  }

  const primaryColumnProbe = probes.find(
    (probe) => probe.column === target.primaryColumn
  );

  const existingOwnershipColumns = probes
    .filter(
      (probe) =>
        target.ownershipColumns.includes(probe.column) && probe.exists
    )
    .map((probe) => probe.column);

  const existingRelationColumns = probes
    .filter(
      (probe) => target.relationColumns.includes(probe.column) && probe.exists
    )
    .map((probe) => probe.column);

  const primaryColumnExists = Boolean(primaryColumnProbe?.exists);
  const hasOwnershipSignal = existingOwnershipColumns.length > 0;
  const hasRelationSignal = existingRelationColumns.length > 0;

  return {
    key: target.key,
    table: target.table,
    primaryColumn: target.primaryColumn,
    primaryColumnExists,
    ownershipColumnsChecked: target.ownershipColumns,
    existingOwnershipColumns,
    relationColumnsChecked: target.relationColumns,
    existingRelationColumns,
    tableReadable: primaryColumnExists,
    hasOwnershipSignal,
    hasRelationSignal,
    canBuildFutureOwnershipPredicate:
      primaryColumnExists && (hasOwnershipSignal || hasRelationSignal),
    probes,
  };
}

function getTarget(
  targets: SemanticServerAuthOwnershipTableProbeV0[],
  key: string
): SemanticServerAuthOwnershipTableProbeV0 | null {
  return targets.find((target) => target.key === key) ?? null;
}

export async function buildSemanticServerAuthOwnershipDryRunContextV0(): Promise<SemanticServerAuthOwnershipDryRunContextV0> {
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

  const supabaseUrlConfigured = getSupabaseUrlConfigured();
  const serviceRoleKeyConfigured = getServiceRoleKeyConfigured();
  let supabaseAdminClientCreated = false;
  let supabaseClientError: string | null = null;
  let supabaseReadExecuted = false;
  const targets: SemanticServerAuthOwnershipTableProbeV0[] = [];

  if (supabaseUrlConfigured && serviceRoleKeyConfigured) {
    try {
      const supabase = getSupabaseAdminClient();
      supabaseAdminClientCreated = true;

      for (const target of OWNERSHIP_TARGETS_V0) {
        targets.push(await buildTargetProbe(supabase, target));
        supabaseReadExecuted = true;
      }
    } catch (error) {
      supabaseClientError =
        error instanceof Error
          ? sanitizeErrorMessage(error.message)
          : "Supabase admin client creation/probe error.";
    }
  }

  const readableTargets = targets.filter((target) => target.tableReadable).length;
  const targetsWithOwnershipSignal = targets.filter(
    (target) => target.hasOwnershipSignal
  ).length;
  const targetsWithRelationSignal = targets.filter(
    (target) => target.hasRelationSignal
  ).length;
  const targetsWithFutureOwnershipPredicate = targets.filter(
    (target) => target.canBuildFutureOwnershipPredicate
  ).length;

  const appUsers = getTarget(targets, "appUsers");
  const actors = getTarget(targets, "actors");
  const actorSpaceRoles = getTarget(targets, "actorSpaceRoles");
  const activityEvents = getTarget(targets, "activityEvents");
  const valueObjects = getTarget(targets, "valueObjects");

  const provesOwnershipColumnReadiness =
    Boolean(appUsers?.primaryColumnExists) &&
    Boolean(appUsers?.existingOwnershipColumns.includes("auth0_sub"));

  const provesActorOwnershipPredicateReadiness =
    Boolean(actors?.primaryColumnExists) ||
    Boolean(actorSpaceRoles?.primaryColumnExists);

  const provesActivityPersistenceOwnershipPredicateReadiness = Boolean(
    activityEvents?.primaryColumnExists
  );

  const provesValueObjectOwnershipPredicateReadiness = Boolean(
    valueObjects?.primaryColumnExists
  );

  const canUseForDryRunOnly =
    sessionReadOk &&
    supabaseAdminClientCreated &&
    provesOwnershipColumnReadiness &&
    provesActorOwnershipPredicateReadiness &&
    provesActivityPersistenceOwnershipPredicateReadiness &&
    provesValueObjectOwnershipPredicateReadiness;

  return {
    ok: true,
    policy: "semantic_server_auth_ownership_dry_run_context_v0",
    mode: "read_only_server_auth_ownership_context_for_dry_run_no_write",
    countdownBeforeFirstDbWrite: "4/4",
    integrationChange: {
      isRealIntegrationCodeChange: true,
      modifiesExistingDryRunRoute: true,
      enablesDbWrite: false,
      opensWriteGate: false,
    },
    auth0Session: {
      readAttempted: true,
      readOk: sessionReadOk,
      readErrorName: sessionReadErrorName,
      readErrorMessage: sessionReadErrorMessage,
      sessionAvailable: Boolean(session),
      trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
      trustedAuthSubjectSha256Prefix: hashDiagnosticValue(trustedAuthSubject),
    },
    supabaseReadiness: {
      supabaseUrlConfigured,
      serviceRoleKeyConfigured,
      supabaseAdminClientCreated,
      supabaseClientError,
    },
    ownershipReadiness: {
      totalTargets: OWNERSHIP_TARGETS_V0.length,
      probedTargets: targets.length,
      readableTargets,
      targetsWithOwnershipSignal,
      targetsWithRelationSignal,
      targetsWithFutureOwnershipPredicate,
      targets,
    },
    dryRunIntegrationDecision: {
      serverAuthDiagnosticsConnectedToDryRunRoute: true,
      provesAuth0SessionReadPath: sessionReadOk,
      provesOwnershipColumnReadiness,
      provesActorOwnershipPredicateReadiness,
      provesActivityPersistenceOwnershipPredicateReadiness,
      provesValueObjectOwnershipPredicateReadiness,
      provesRlsRuntimeVerification: false,
      canUseForDryRunOnly,
      canOpenWriteGate: false,
      canTrustClientIdentity: false,
      readyForNextBrowserAuthProof: canUseForDryRunOnly,
    },
    forbiddenInThisStep: [
      "No SQL statement.",
      "No Supabase write.",
      "No activity persistence.",
      "No user/actor mapping write.",
      "No write gate opening.",
      "No state fact/delta/snapshot creation.",
      "Do not trust client-provided identity.",
    ],
    nextStep: {
      step: "C8-I-IMPLEMENT-29",
      countdownBeforeFirstDbWrite: "3/4",
      goal: "Browser-authenticated dry-run proof for semantic persistence route.",
    },
    writes: buildWrites(supabaseReadExecuted),
  };
}
