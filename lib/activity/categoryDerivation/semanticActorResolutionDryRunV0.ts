import crypto from "crypto";

import { auth0 } from "../../../lib/auth0";
import { getSupabaseAdminClient } from "../../../lib/supabase/admin";

export type SemanticActorResolutionDryRunPolicyV0 =
  "semantic_actor_resolution_dry_run_v0";

export type SemanticActorResolutionDryRunModeV0 =
  "read_only_actor_resolution_dry_run_no_write";

export type SemanticActorResolutionWritesV0 = {
  sqlExecuted: false;
  dbReadExecuted: boolean;
  dbWriteExecuted: false;
  supabaseReadExecuted: boolean;
  supabaseWriteExecuted: false;
  activityEventInserted: false;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  actorCreated: false;
  actorUpdated: false;
  userCreated: false;
  userUpdated: false;
  stateDeltaCreated: false;
  stateFactCreated: false;
  stateSnapshotCreated: false;
};

export type SemanticActorResolutionColumnProbeV0 = {
  table: string;
  column: string;
  attempted: boolean;
  exists: boolean;
  errorCode: string | null;
  errorMessage: string | null;
};

export type SemanticActorResolutionTableProbeV0 = {
  key: string;
  table: string;
  primaryColumn: string;
  primaryColumnExists: boolean;
  ownershipColumnsChecked: string[];
  existingOwnershipColumns: string[];
  relationColumnsChecked: string[];
  existingRelationColumns: string[];
  tableReadable: boolean;
  probes: SemanticActorResolutionColumnProbeV0[];
};

export type SemanticAppUserMappingOutcomeV0 =
  | "not_attempted_no_session"
  | "mapped"
  | "not_found"
  | "duplicate"
  | "query_error"
  | "shape_error"
  | "client_creation_error";

export type SemanticActorResolutionOutcomeV0 =
  | "not_attempted_no_session"
  | "not_attempted_no_app_user"
  | "resolved_single_actor"
  | "multiple_actor_candidates"
  | "no_actor_candidate"
  | "query_error";

export type SemanticActorCandidateSummaryV0 = {
  actorIdSha256Prefix: string;
  sourceKeys: string[];
};

export type SemanticActorResolutionDryRunV0 = {
  ok: true;
  endpointPolicy: SemanticActorResolutionDryRunPolicyV0;
  mode: SemanticActorResolutionDryRunModeV0;
  countdownBeforeFirstDbWrite: "2/4";
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
  appUserMapping: {
    attempted: boolean;
    outcome: SemanticAppUserMappingOutcomeV0;
    appUserRowCount: number | null;
    appUserIdSha256Prefix: string | null;
    errorCode: string | null;
    errorMessage: string | null;
  };
  actorResolution: {
    attempted: boolean;
    outcome: SemanticActorResolutionOutcomeV0;
    candidateActorCount: number;
    selectedActorIdSha256Prefix: string | null;
    candidates: SemanticActorCandidateSummaryV0[];
    sourceReadResults: {
      actorsDirectRows: number;
      actorSpaceRoleRowsByUser: number;
      actorSpaceRoleRowsByActor: number;
    };
    tableReadiness: {
      actors: SemanticActorResolutionTableProbeV0;
      actorSpaceRoles: SemanticActorResolutionTableProbeV0;
    };
    actorIdAvailableForFutureWriteGate: boolean;
    reason: string;
  };
  readinessDecision: {
    provesAuth0SessionReadPath: boolean;
    provesInternalUserMappingWhenSessionAvailable: boolean;
    provesActorResolutionForCurrentSession: boolean;
    canUseSingleActorForFutureWriteGate: boolean;
    provesRlsRuntimeVerification: false;
    canOpenWriteGate: false;
    canTrustClientIdentity: false;
    readyForC31FinalWriteGateContract: boolean;
  };
  forbiddenInThisStep: string[];
  nextStep: {
    step: "C8-I-IMPLEMENT-31";
    countdownBeforeFirstDbWrite: "1/4";
    goal: "Final semantic write-gate contract.";
  };
  writes: SemanticActorResolutionWritesV0;
};

type SupabaseAdminClientV0 = ReturnType<typeof getSupabaseAdminClient>;

type TableProbeDefinitionV0 = {
  key: string;
  table: string;
  primaryColumn: string;
  ownershipColumns: string[];
  relationColumns: string[];
};

type ReadRowsResultV0 = {
  ok: boolean;
  rows: Record<string, unknown>[];
  errorCode: string | null;
  errorMessage: string | null;
};

const ACTORS_TABLE_V0: TableProbeDefinitionV0 = {
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
};

const ACTOR_SPACE_ROLES_TABLE_V0: TableProbeDefinitionV0 = {
  key: "actorSpaceRoles",
  table: "actor_space_roles",
  primaryColumn: "id",
  ownershipColumns: ["user_id", "app_user_id", "owner_user_id"],
  relationColumns: ["actor_id", "space_id", "organization_id", "role"],
};

function buildWrites(supabaseReadExecuted: boolean): SemanticActorResolutionWritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: supabaseReadExecuted,
    dbWriteExecuted: false,
    supabaseReadExecuted,
    supabaseWriteExecuted: false,
    activityEventInserted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    actorCreated: false,
    actorUpdated: false,
    userCreated: false,
    userUpdated: false,
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
): Promise<SemanticActorResolutionColumnProbeV0> {
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

async function buildTableProbe(
  supabase: SupabaseAdminClientV0,
  definition: TableProbeDefinitionV0
): Promise<SemanticActorResolutionTableProbeV0> {
  const probes: SemanticActorResolutionColumnProbeV0[] = [];

  probes.push(await probeColumn(supabase, definition.table, definition.primaryColumn));

  for (const column of definition.ownershipColumns) {
    probes.push(await probeColumn(supabase, definition.table, column));
  }

  for (const column of definition.relationColumns) {
    probes.push(await probeColumn(supabase, definition.table, column));
  }

  const primaryColumnProbe = probes.find(
    (probe) => probe.column === definition.primaryColumn
  );

  const existingOwnershipColumns = probes
    .filter(
      (probe) =>
        definition.ownershipColumns.includes(probe.column) && probe.exists
    )
    .map((probe) => probe.column);

  const existingRelationColumns = probes
    .filter(
      (probe) =>
        definition.relationColumns.includes(probe.column) && probe.exists
    )
    .map((probe) => probe.column);

  const primaryColumnExists = Boolean(primaryColumnProbe?.exists);

  return {
    key: definition.key,
    table: definition.table,
    primaryColumn: definition.primaryColumn,
    primaryColumnExists,
    ownershipColumnsChecked: definition.ownershipColumns,
    existingOwnershipColumns,
    relationColumnsChecked: definition.relationColumns,
    existingRelationColumns,
    tableReadable: primaryColumnExists,
    probes,
  };
}

function buildSelectColumns(
  primaryColumn: string,
  ownershipColumns: string[],
  relationColumns: string[]
): string {
  return Array.from(
    new Set([primaryColumn, ...ownershipColumns, ...relationColumns])
  ).join(", ");
}

async function readRowsByColumnEquals(
  supabase: SupabaseAdminClientV0,
  table: string,
  selectColumns: string,
  matchColumn: string,
  matchValue: string,
  limit: number
): Promise<ReadRowsResultV0> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(selectColumns)
      .eq(matchColumn, matchValue)
      .limit(limit);

    if (error) {
      return {
        ok: false,
        rows: [],
        errorCode: error.code ?? "unknown",
        errorMessage: sanitizeErrorMessage(error.message),
      };
    }

    return {
      ok: true,
      rows: Array.isArray(data) ? (data as Record<string, unknown>[]) : [],
      errorCode: null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      errorCode: "unexpected_read_error",
      errorMessage:
        error instanceof Error
          ? sanitizeErrorMessage(error.message)
          : "Unexpected read error.",
    };
  }
}

type ActorCandidateAccumulatorV0 = Map<string, Set<string>>;

function addActorCandidate(
  candidates: ActorCandidateAccumulatorV0,
  actorId: string | null,
  sourceKey: string
) {
  if (!actorId) {
    return;
  }

  const existing = candidates.get(actorId) ?? new Set<string>();
  existing.add(sourceKey);
  candidates.set(actorId, existing);
}

function toCandidateSummaries(
  candidates: ActorCandidateAccumulatorV0
): SemanticActorCandidateSummaryV0[] {
  return Array.from(candidates.entries())
    .map(([actorId, sourceKeys]) => ({
      actorIdSha256Prefix: hashDiagnosticValue(actorId) ?? "unhashable",
      sourceKeys: Array.from(sourceKeys).sort(),
    }))
    .sort((left, right) =>
      left.actorIdSha256Prefix.localeCompare(right.actorIdSha256Prefix)
    );
}


async function addActorCandidatesViaLinkedSpaces(
  supabase: SupabaseAdminClientV0,
  appUserId: string,
  candidates: ActorCandidateAccumulatorV0,
  selectedSpaceIdSha256Prefix: string | null
): Promise<number> {
  const possibleSpaceUserColumns = [
    "app_user_id",
    "user_id",
    "owner_user_id",
    "created_by_user_id",
    "created_by",
  ];

  let actorSpaceRoleRowsBySpace = 0;

  for (const column of possibleSpaceUserColumns) {
    let spaceRows: Record<string, unknown>[] = [];

    try {
      const { data, error } = await supabase
        .from("spaces")
        .select("id")
        .eq(column, appUserId)
        .limit(50);

      if (error) {
        continue;
      }

      spaceRows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    } catch {
      continue;
    }

    for (const spaceRow of spaceRows) {
      const spaceId = readStringProperty(spaceRow, "id");

      if (!spaceId) {
        continue;
      }

      if (
        selectedSpaceIdSha256Prefix &&
        hashDiagnosticValue(spaceId) !== selectedSpaceIdSha256Prefix
      ) {
        continue;
      }

      const result = await readRowsByColumnEquals(
        supabase,
        "actor_space_roles",
        "id, actor_id, space_id",
        "space_id",
        spaceId,
        50
      );

      if (!result.ok) {
        continue;
      }

      actorSpaceRoleRowsBySpace += result.rows.length;

      for (const row of result.rows) {
        addActorCandidate(
          candidates,
          readStringProperty(row, "actor_id"),
          `spaces.${column}->actor_space_roles.space_id`
        );
      }
    }
  }

  return actorSpaceRoleRowsBySpace;
}
async function mapAppUserByAuthSubject(
  supabase: SupabaseAdminClientV0,
  trustedAuthSubject: string | null
): Promise<SemanticActorResolutionDryRunV0["appUserMapping"] & { rawAppUserId: string | null }> {
  if (!trustedAuthSubject) {
    return {
      attempted: false,
      outcome: "not_attempted_no_session",
      appUserRowCount: null,
      appUserIdSha256Prefix: null,
      errorCode: null,
      errorMessage: null,
      rawAppUserId: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("id, auth0_sub")
      .eq("auth0_sub", trustedAuthSubject)
      .limit(2);

    if (error) {
      return {
        attempted: true,
        outcome: "query_error",
        appUserRowCount: null,
        appUserIdSha256Prefix: null,
        errorCode: error.code ?? "unknown",
        errorMessage: sanitizeErrorMessage(error.message),
        rawAppUserId: null,
      };
    }

    const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];

    if (rows.length === 0) {
      return {
        attempted: true,
        outcome: "not_found",
        appUserRowCount: 0,
        appUserIdSha256Prefix: null,
        errorCode: null,
        errorMessage: null,
        rawAppUserId: null,
      };
    }

    if (rows.length > 1) {
      return {
        attempted: true,
        outcome: "duplicate",
        appUserRowCount: rows.length,
        appUserIdSha256Prefix: null,
        errorCode: null,
        errorMessage: null,
        rawAppUserId: null,
      };
    }

    const appUserId = readStringProperty(rows[0], "id");

    return {
      attempted: true,
      outcome: appUserId ? "mapped" : "shape_error",
      appUserRowCount: rows.length,
      appUserIdSha256Prefix: hashDiagnosticValue(appUserId),
      errorCode: null,
      errorMessage: appUserId ? null : "Mapped app_users row has no id.",
      rawAppUserId: appUserId,
    };
  } catch (error) {
    return {
      attempted: true,
      outcome: "query_error",
      appUserRowCount: null,
      appUserIdSha256Prefix: null,
      errorCode: "unexpected_app_user_mapping_error",
      errorMessage:
        error instanceof Error
          ? sanitizeErrorMessage(error.message)
          : "Unexpected app user mapping error.",
      rawAppUserId: null,
    };
  }
}

async function resolveActorCandidates(
  supabase: SupabaseAdminClientV0,
  appUserId: string | null,
  actorsProbe: SemanticActorResolutionTableProbeV0,
  actorSpaceRolesProbe: SemanticActorResolutionTableProbeV0,
  selectedSpaceIdSha256Prefix: string | null
): Promise<SemanticActorResolutionDryRunV0["actorResolution"]> {
  if (!appUserId) {
    return {
      attempted: false,
      outcome: "not_attempted_no_app_user",
      candidateActorCount: 0,
      selectedActorIdSha256Prefix: null,
      candidates: [],
      sourceReadResults: {
        actorsDirectRows: 0,
        actorSpaceRoleRowsByUser: 0,
        actorSpaceRoleRowsByActor: 0,
      },
      tableReadiness: {
        actors: actorsProbe,
        actorSpaceRoles: actorSpaceRolesProbe,
      },
      actorIdAvailableForFutureWriteGate: false,
      reason: "App user id is not available, so actor resolution was not attempted.",
    };
  }

  const candidates: ActorCandidateAccumulatorV0 = new Map();
  let actorsDirectRows = 0;
  let actorSpaceRoleRowsByUser = 0;
  let actorSpaceRoleRowsByActor = 0;
  let queryError = false;

  const actorsSelectColumns = buildSelectColumns(
    actorsProbe.primaryColumn,
    actorsProbe.existingOwnershipColumns,
    actorsProbe.existingRelationColumns
  );

  for (const column of actorsProbe.existingOwnershipColumns) {
    const result = await readRowsByColumnEquals(
      supabase,
      actorsProbe.table,
      actorsSelectColumns,
      column,
      appUserId,
      10
    );

    if (!result.ok) {
      queryError = true;
      continue;
    }

    actorsDirectRows += result.rows.length;

    for (const row of result.rows) {
      addActorCandidate(
        candidates,
        readStringProperty(row, actorsProbe.primaryColumn),
        `actors.${column}`
      );
    }
  }

  const actorSpaceRolesSelectColumns = buildSelectColumns(
    actorSpaceRolesProbe.primaryColumn,
    actorSpaceRolesProbe.existingOwnershipColumns,
    actorSpaceRolesProbe.existingRelationColumns
  );

  for (const column of actorSpaceRolesProbe.existingOwnershipColumns) {
    const result = await readRowsByColumnEquals(
      supabase,
      actorSpaceRolesProbe.table,
      actorSpaceRolesSelectColumns,
      column,
      appUserId,
      10
    );

    if (!result.ok) {
      queryError = true;
      continue;
    }

    actorSpaceRoleRowsByUser += result.rows.length;

    for (const row of result.rows) {
      addActorCandidate(
        candidates,
        readStringProperty(row, "actor_id"),
        `actor_space_roles.${column}`
      );
    }
  }

  const linkedSpaceActorRows = await addActorCandidatesViaLinkedSpaces(
    supabase,
    appUserId,
    candidates,
    selectedSpaceIdSha256Prefix
  );
  actorSpaceRoleRowsByUser += linkedSpaceActorRows;

  const directActorIds = Array.from(candidates.keys());

  if (actorSpaceRolesProbe.existingRelationColumns.includes("actor_id")) {
    for (const actorId of directActorIds) {
      const result = await readRowsByColumnEquals(
        supabase,
        actorSpaceRolesProbe.table,
        actorSpaceRolesSelectColumns,
        "actor_id",
        actorId,
        10
      );

      if (!result.ok) {
        queryError = true;
        continue;
      }

      actorSpaceRoleRowsByActor += result.rows.length;

      for (const row of result.rows) {
        addActorCandidate(
          candidates,
          readStringProperty(row, "actor_id"),
          "actor_space_roles.actor_id"
        );
      }
    }
  }

  const candidateActorIds = Array.from(candidates.keys());
  const selectedActorId =
    candidateActorIds.length === 1 ? candidateActorIds[0] : null;

  let outcome: SemanticActorResolutionOutcomeV0;
  let reason: string;

  if (queryError && candidateActorIds.length === 0) {
    outcome = "query_error";
    reason = "At least one actor candidate read failed and no actor candidate was found.";
  } else if (candidateActorIds.length === 0) {
    outcome = "no_actor_candidate";
    reason = "No actor candidate was found for the mapped app user.";
  } else if (candidateActorIds.length === 1) {
    outcome = "resolved_single_actor";
    reason = "Exactly one actor candidate was found for the mapped app user.";
  } else {
    outcome = "multiple_actor_candidates";
    reason = "More than one actor candidate was found; future write gate must choose an explicit actor.";
  }

  return {
    attempted: true,
    outcome,
    candidateActorCount: candidateActorIds.length,
    selectedActorIdSha256Prefix: hashDiagnosticValue(selectedActorId),
    candidates: toCandidateSummaries(candidates),
    sourceReadResults: {
      actorsDirectRows,
      actorSpaceRoleRowsByUser,
      actorSpaceRoleRowsByActor,
    },
    tableReadiness: {
      actors: actorsProbe,
      actorSpaceRoles: actorSpaceRolesProbe,
    },
    actorIdAvailableForFutureWriteGate: outcome === "resolved_single_actor",
    reason,
  };
}

export async function buildSemanticActorResolutionDryRunV0(params?: {
  selectedSpaceIdSha256Prefix?: string | null;
}): Promise<SemanticActorResolutionDryRunV0> {
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

  let actorsProbe: SemanticActorResolutionTableProbeV0 = {
    key: ACTORS_TABLE_V0.key,
    table: ACTORS_TABLE_V0.table,
    primaryColumn: ACTORS_TABLE_V0.primaryColumn,
    primaryColumnExists: false,
    ownershipColumnsChecked: ACTORS_TABLE_V0.ownershipColumns,
    existingOwnershipColumns: [],
    relationColumnsChecked: ACTORS_TABLE_V0.relationColumns,
    existingRelationColumns: [],
    tableReadable: false,
    probes: [],
  };

  let actorSpaceRolesProbe: SemanticActorResolutionTableProbeV0 = {
    key: ACTOR_SPACE_ROLES_TABLE_V0.key,
    table: ACTOR_SPACE_ROLES_TABLE_V0.table,
    primaryColumn: ACTOR_SPACE_ROLES_TABLE_V0.primaryColumn,
    primaryColumnExists: false,
    ownershipColumnsChecked: ACTOR_SPACE_ROLES_TABLE_V0.ownershipColumns,
    existingOwnershipColumns: [],
    relationColumnsChecked: ACTOR_SPACE_ROLES_TABLE_V0.relationColumns,
    existingRelationColumns: [],
    tableReadable: false,
    probes: [],
  };

  let appUserMappingWithRawId: Awaited<ReturnType<typeof mapAppUserByAuthSubject>> = {
    attempted: false,
    outcome: "client_creation_error",
    appUserRowCount: null,
    appUserIdSha256Prefix: null,
    errorCode: "client_not_created",
    errorMessage: "Supabase admin client was not created.",
    rawAppUserId: null,
  };

  let actorResolution: SemanticActorResolutionDryRunV0["actorResolution"] = {
    attempted: false,
    outcome: trustedAuthSubject
      ? "not_attempted_no_app_user"
      : "not_attempted_no_session",
    candidateActorCount: 0,
    selectedActorIdSha256Prefix: null,
    candidates: [],
    sourceReadResults: {
      actorsDirectRows: 0,
      actorSpaceRoleRowsByUser: 0,
      actorSpaceRoleRowsByActor: 0,
    },
    tableReadiness: {
      actors: actorsProbe,
      actorSpaceRoles: actorSpaceRolesProbe,
    },
    actorIdAvailableForFutureWriteGate: false,
    reason: "Supabase admin client was not created.",
  };

  if (supabaseUrlConfigured && serviceRoleKeyConfigured) {
    try {
      const supabase = getSupabaseAdminClient();
      supabaseAdminClientCreated = true;

      actorsProbe = await buildTableProbe(supabase, ACTORS_TABLE_V0);
      actorSpaceRolesProbe = await buildTableProbe(
        supabase,
        ACTOR_SPACE_ROLES_TABLE_V0
      );
      supabaseReadExecuted = true;

      appUserMappingWithRawId = await mapAppUserByAuthSubject(
        supabase,
        trustedAuthSubject
      );
      supabaseReadExecuted = true;

      actorResolution = await resolveActorCandidates(
        supabase,
        appUserMappingWithRawId.rawAppUserId,
        actorsProbe,
        actorSpaceRolesProbe,
        params?.selectedSpaceIdSha256Prefix ?? null
      );
      supabaseReadExecuted = true;
    } catch (error) {
      supabaseClientError =
        error instanceof Error
          ? sanitizeErrorMessage(error.message)
          : "Supabase admin client creation/probe error.";
    }
  }

  const appUserMapping = {
    attempted: appUserMappingWithRawId.attempted,
    outcome: appUserMappingWithRawId.outcome,
    appUserRowCount: appUserMappingWithRawId.appUserRowCount,
    appUserIdSha256Prefix: appUserMappingWithRawId.appUserIdSha256Prefix,
    errorCode: appUserMappingWithRawId.errorCode,
    errorMessage: appUserMappingWithRawId.errorMessage,
  };

  const provesInternalUserMappingWhenSessionAvailable =
    appUserMapping.outcome === "mapped";

  const provesActorResolutionForCurrentSession =
    actorResolution.outcome === "resolved_single_actor";

  const readyForC31FinalWriteGateContract =
    sessionReadOk &&
    provesInternalUserMappingWhenSessionAvailable &&
    provesActorResolutionForCurrentSession &&
    actorResolution.actorIdAvailableForFutureWriteGate;

  return {
    ok: true,
    endpointPolicy: "semantic_actor_resolution_dry_run_v0",
    mode: "read_only_actor_resolution_dry_run_no_write",
    countdownBeforeFirstDbWrite: "2/4",
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
    appUserMapping,
    actorResolution,
    readinessDecision: {
      provesAuth0SessionReadPath: sessionReadOk,
      provesInternalUserMappingWhenSessionAvailable,
      provesActorResolutionForCurrentSession,
      canUseSingleActorForFutureWriteGate:
        actorResolution.actorIdAvailableForFutureWriteGate,
      provesRlsRuntimeVerification: false,
      canOpenWriteGate: false,
      canTrustClientIdentity: false,
      readyForC31FinalWriteGateContract,
    },
    forbiddenInThisStep: [
      "No SQL statement.",
      "No Supabase write.",
      "No activity persistence.",
      "No actor creation.",
      "No actor update.",
      "No user creation.",
      "No user update.",
      "No write gate opening.",
      "No state fact/delta/snapshot creation.",
    ],
    nextStep: {
      step: "C8-I-IMPLEMENT-31",
      countdownBeforeFirstDbWrite: "1/4",
      goal: "Final semantic write-gate contract.",
    },
    writes: buildWrites(supabaseReadExecuted),
  };
}


