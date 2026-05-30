import crypto from "crypto";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import { getSupabaseAdminClient } from "../../../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProbeResultV0 = {
  table: string;
  column: string;
  attempted: boolean;
  exists: boolean;
  errorCode: string | null;
  errorMessage: string | null;
};

type TableInventoryV0 = {
  table: string;
  existingColumns: string[];
  missingColumns: string[];
  probes: ProbeResultV0[];
};

type AppUserMappingV0 = {
  attempted: boolean;
  outcome:
    | "not_attempted_no_session"
    | "mapped"
    | "not_found"
    | "duplicate"
    | "query_error";
  rowCount: number | null;
  appUserId: string | null;
  appUserIdSha256Prefix: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type LinkedSpaceCandidateV0 = {
  spaceId: string;
  spaceIdSha256Prefix: string | null;
  organizationId: string | null;
  organizationIdSha256Prefix: string | null;
  sourceColumn: string;
};

type ActorBootstrapWriteResultV0 = {
  ok: boolean;
  status:
    | "not_executed_get_only"
    | "blocked_missing_gate"
    | "blocked_no_session"
    | "blocked_app_user_not_mapped"
    | "blocked_no_space"
    | "blocked_multiple_spaces"
    | "blocked_multiple_existing_actors"
    | "already_resolved_existing_actor"
    | "actor_bootstrap_created"
    | "actor_created_but_role_failed_cleanup_attempted"
    | "actor_insert_failed"
    | "actor_space_role_insert_failed"
    | "unexpected_error";
  message: string;
  selectedSpaceIdSha256Prefix: string | null;
  existingActorIdSha256Prefix: string | null;
  createdActorIdSha256Prefix: string | null;
  createdActorSpaceRoleIdSha256Prefix: string | null;
  cleanupExecuted: boolean;
  cleanupSucceeded: boolean | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type WritesV0 = {
  sqlExecuted: false;
  dbReadExecuted: boolean;
  dbWriteExecuted: boolean;
  supabaseReadExecuted: boolean;
  supabaseWriteExecuted: boolean;
  actorCreated: boolean;
  actorSpaceRoleCreated: boolean;
  actorDeletedDuringCleanup: boolean;
  userUpdated: false;
  spaceCreated: false;
  activityEventInserted: false;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  stateFactCreated: false;
  stateDeltaCreated: false;
  stateSnapshotCreated: false;
};

type SupabaseAdminClientV0 = ReturnType<typeof getSupabaseAdminClient>;

const SPACE_USER_LINK_COLUMNS_V0 = [
  "app_user_id",
  "user_id",
  "owner_user_id",
  "created_by_user_id",
  "created_by",
];

const SPACE_PROBE_COLUMNS_V0 = [
  "id",
  "type",
  "space_type",
  "name",
  "title",
  "owner_user_id",
  "app_user_id",
  "user_id",
  "created_by",
  "created_by_user_id",
  "organization_id",
  "created_at",
  "updated_at",
];

const ACTORS_PROBE_COLUMNS_V0 = [
  "id",
  "organization_id",
  "created_at",
  "updated_at",
];

const ACTOR_SPACE_ROLES_PROBE_COLUMNS_V0 = [
  "id",
  "actor_id",
  "space_id",
  "created_at",
  "updated_at",
];

function sanitizeErrorMessage(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.slice(0, 260);
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

function buildWrites(params: {
  dbReadExecuted: boolean;
  dbWriteExecuted: boolean;
  actorCreated: boolean;
  actorSpaceRoleCreated: boolean;
  actorDeletedDuringCleanup: boolean;
}): WritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: params.dbReadExecuted,
    dbWriteExecuted: params.dbWriteExecuted,
    supabaseReadExecuted: params.dbReadExecuted,
    supabaseWriteExecuted: params.dbWriteExecuted,
    actorCreated: params.actorCreated,
    actorSpaceRoleCreated: params.actorSpaceRoleCreated,
    actorDeletedDuringCleanup: params.actorDeletedDuringCleanup,
    userUpdated: false,
    spaceCreated: false,
    activityEventInserted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    stateFactCreated: false,
    stateDeltaCreated: false,
    stateSnapshotCreated: false,
  };
}

function buildBlockedResult(
  status: ActorBootstrapWriteResultV0["status"],
  message: string,
  errorMessage: string | null = null
): ActorBootstrapWriteResultV0 {
  return {
    ok: false,
    status,
    message,
    selectedSpaceIdSha256Prefix: null,
    existingActorIdSha256Prefix: null,
    createdActorIdSha256Prefix: null,
    createdActorSpaceRoleIdSha256Prefix: null,
    cleanupExecuted: false,
    cleanupSucceeded: null,
    errorCode: null,
    errorMessage,
  };
}

async function probeColumn(
  supabase: SupabaseAdminClientV0,
  table: string,
  column: string
): Promise<ProbeResultV0> {
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
      errorCode: "unexpected_probe_error",
      errorMessage:
        error instanceof Error
          ? sanitizeErrorMessage(error.message)
          : "Unexpected probe error.",
    };
  }
}

async function buildTableInventory(
  supabase: SupabaseAdminClientV0,
  table: string,
  columns: string[]
): Promise<TableInventoryV0> {
  const probes: ProbeResultV0[] = [];

  for (const column of columns) {
    probes.push(await probeColumn(supabase, table, column));
  }

  const existingColumns = probes
    .filter((probe) => probe.exists)
    .map((probe) => probe.column);

  const missingColumns = probes
    .filter((probe) => !probe.exists)
    .map((probe) => probe.column);

  return {
    table,
    existingColumns,
    missingColumns,
    probes,
  };
}

function selectExistingColumns(
  inventory: TableInventoryV0,
  preferredColumns: string[]
): string {
  const selected = preferredColumns.filter((column) =>
    inventory.existingColumns.includes(column)
  );

  if (!selected.includes("id") && inventory.existingColumns.includes("id")) {
    selected.unshift("id");
  }

  return selected.length > 0 ? selected.join(", ") : "id";
}

async function readAppUserByAuthSubject(
  supabase: SupabaseAdminClientV0,
  trustedAuthSubject: string | null
): Promise<AppUserMappingV0> {
  if (!trustedAuthSubject) {
    return {
      attempted: false,
      outcome: "not_attempted_no_session",
      rowCount: null,
      appUserId: null,
      appUserIdSha256Prefix: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("id, auth0_sub")
    .eq("auth0_sub", trustedAuthSubject)
    .limit(2);

  if (error) {
    return {
      attempted: true,
      outcome: "query_error",
      rowCount: null,
      appUserId: null,
      appUserIdSha256Prefix: null,
      errorCode: error.code ?? "unknown",
      errorMessage: sanitizeErrorMessage(error.message),
    };
  }

  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];

  if (rows.length === 0) {
    return {
      attempted: true,
      outcome: "not_found",
      rowCount: 0,
      appUserId: null,
      appUserIdSha256Prefix: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  if (rows.length > 1) {
    return {
      attempted: true,
      outcome: "duplicate",
      rowCount: rows.length,
      appUserId: null,
      appUserIdSha256Prefix: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  const appUserId = readStringProperty(rows[0], "id");

  return {
    attempted: true,
    outcome: appUserId ? "mapped" : "query_error",
    rowCount: rows.length,
    appUserId,
    appUserIdSha256Prefix: hashDiagnosticValue(appUserId),
    errorCode: null,
    errorMessage: appUserId ? null : "Mapped app_users row has no id.",
  };
}

async function findLinkedSpaces(
  supabase: SupabaseAdminClientV0,
  spacesInventory: TableInventoryV0,
  appUserId: string
): Promise<LinkedSpaceCandidateV0[]> {
  const candidates = new Map<string, LinkedSpaceCandidateV0>();

  const existingUserLinkColumns = SPACE_USER_LINK_COLUMNS_V0.filter((column) =>
    spacesInventory.existingColumns.includes(column)
  );

  const selectColumns = selectExistingColumns(spacesInventory, [
    "id",
    "organization_id",
    "app_user_id",
    "user_id",
    "owner_user_id",
    "created_by_user_id",
    "created_by",
  ]);

  for (const column of existingUserLinkColumns) {
    const { data, error } = await supabase
      .from("spaces")
      .select(selectColumns)
      .eq(column, appUserId)
      .limit(10);

    if (error) {
      continue;
    }

    const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];

    for (const row of rows) {
      const spaceId = readStringProperty(row, "id");

      if (!spaceId || candidates.has(spaceId)) {
        continue;
      }

      const organizationId = readStringProperty(row, "organization_id");

      candidates.set(spaceId, {
        spaceId,
        spaceIdSha256Prefix: hashDiagnosticValue(spaceId),
        organizationId,
        organizationIdSha256Prefix: hashDiagnosticValue(organizationId),
        sourceColumn: column,
      });
    }
  }

  return Array.from(candidates.values());
}

async function findExistingActorsForSpace(
  supabase: SupabaseAdminClientV0,
  spaceId: string
): Promise<{
  ok: boolean;
  actorIds: string[];
  errorCode: string | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("actor_space_roles")
    .select("id, actor_id, space_id")
    .eq("space_id", spaceId)
    .limit(10);

  if (error) {
    return {
      ok: false,
      actorIds: [],
      errorCode: error.code ?? "unknown",
      errorMessage: sanitizeErrorMessage(error.message),
    };
  }

  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  const actorIds = Array.from(
    new Set(
      rows
        .map((row) => readStringProperty(row, "actor_id"))
        .filter((value): value is string => Boolean(value))
    )
  );

  return {
    ok: true,
    actorIds,
    errorCode: null,
    errorMessage: null,
  };
}

function parseWriteGate(body: unknown): {
  executeControlledWrite: boolean;
  expectedPolicy: string | null;
  acknowledgedFirstControlledDbWrite: string | null;
} {
  if (!isRecord(body)) {
    return {
      executeControlledWrite: false,
      expectedPolicy: null,
      acknowledgedFirstControlledDbWrite: null,
    };
  }

  return {
    executeControlledWrite: body.executeControlledWrite === true,
    expectedPolicy: readStringProperty(body, "expectedPolicy"),
    acknowledgedFirstControlledDbWrite: readStringProperty(
      body,
      "acknowledgedFirstControlledDbWrite"
    ),
  };
}

async function runActorBootstrapControlledWrite(params: {
  executeControlledWrite: boolean;
  expectedPolicy: string | null;
  acknowledgedFirstControlledDbWrite: string | null;
}): Promise<{
  auth0Session: {
    readOk: boolean;
    sessionAvailable: boolean;
    trustedAuthSubjectPresent: boolean;
    trustedAuthSubjectSha256Prefix: string | null;
  };
  appUserMapping: Omit<AppUserMappingV0, "appUserId">;
  inventories: {
    spaces: TableInventoryV0 | null;
    actors: TableInventoryV0 | null;
    actorSpaceRoles: TableInventoryV0 | null;
  };
  linkedSpaces: Omit<LinkedSpaceCandidateV0, "spaceId" | "organizationId">[];
  writeResult: ActorBootstrapWriteResultV0;
  writes: WritesV0;
}> {
  let dbReadExecuted = false;
  let dbWriteExecuted = false;
  let actorCreated = false;
  let actorSpaceRoleCreated = false;
  let actorDeletedDuringCleanup = false;

  let session: unknown = null;
  let sessionReadOk = true;

  try {
    session = await auth0.getSession();
  } catch {
    sessionReadOk = false;
  }

  const trustedAuthSubject = readAuthSubjectFromSession(session);

  const emptyMapping: AppUserMappingV0 = {
    attempted: false,
    outcome: trustedAuthSubject ? "query_error" : "not_attempted_no_session",
    rowCount: null,
    appUserId: null,
    appUserIdSha256Prefix: null,
    errorCode: null,
    errorMessage: null,
  };

  let appUserMapping: AppUserMappingV0 = emptyMapping;
  let spacesInventory: TableInventoryV0 | null = null;
  let actorsInventory: TableInventoryV0 | null = null;
  let actorSpaceRolesInventory: TableInventoryV0 | null = null;
  let linkedSpaces: LinkedSpaceCandidateV0[] = [];

  const supabase = getSupabaseAdminClient();

  spacesInventory = await buildTableInventory(
    supabase,
    "spaces",
    SPACE_PROBE_COLUMNS_V0
  );
  actorsInventory = await buildTableInventory(
    supabase,
    "actors",
    ACTORS_PROBE_COLUMNS_V0
  );
  actorSpaceRolesInventory = await buildTableInventory(
    supabase,
    "actor_space_roles",
    ACTOR_SPACE_ROLES_PROBE_COLUMNS_V0
  );
  dbReadExecuted = true;

  if (!params.executeControlledWrite) {
    return {
      auth0Session: {
        readOk: sessionReadOk,
        sessionAvailable: Boolean(session),
        trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
        trustedAuthSubjectSha256Prefix: hashDiagnosticValue(trustedAuthSubject),
      },
      appUserMapping: {
        attempted: appUserMapping.attempted,
        outcome: appUserMapping.outcome,
        rowCount: appUserMapping.rowCount,
        appUserIdSha256Prefix: appUserMapping.appUserIdSha256Prefix,
        errorCode: appUserMapping.errorCode,
        errorMessage: appUserMapping.errorMessage,
      },
      inventories: {
        spaces: spacesInventory,
        actors: actorsInventory,
        actorSpaceRoles: actorSpaceRolesInventory,
      },
      linkedSpaces: [],
      writeResult: buildBlockedResult(
        "blocked_missing_gate",
        "POST body must include executeControlledWrite=true."
      ),
      writes: buildWrites({
        dbReadExecuted,
        dbWriteExecuted,
        actorCreated,
        actorSpaceRoleCreated,
        actorDeletedDuringCleanup,
      }),
    };
  }

  if (
    params.expectedPolicy !== "actor_bootstrap_controlled_write_v0" ||
    params.acknowledgedFirstControlledDbWrite !==
      "C8-I-IMPLEMENT-30-F_FIRST_CONTROLLED_DB_WRITE"
  ) {
    return {
      auth0Session: {
        readOk: sessionReadOk,
        sessionAvailable: Boolean(session),
        trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
        trustedAuthSubjectSha256Prefix: hashDiagnosticValue(trustedAuthSubject),
      },
      appUserMapping: {
        attempted: appUserMapping.attempted,
        outcome: appUserMapping.outcome,
        rowCount: appUserMapping.rowCount,
        appUserIdSha256Prefix: appUserMapping.appUserIdSha256Prefix,
        errorCode: appUserMapping.errorCode,
        errorMessage: appUserMapping.errorMessage,
      },
      inventories: {
        spaces: spacesInventory,
        actors: actorsInventory,
        actorSpaceRoles: actorSpaceRolesInventory,
      },
      linkedSpaces: [],
      writeResult: buildBlockedResult(
        "blocked_missing_gate",
        "Explicit first controlled DB write acknowledgement is missing or invalid."
      ),
      writes: buildWrites({
        dbReadExecuted,
        dbWriteExecuted,
        actorCreated,
        actorSpaceRoleCreated,
        actorDeletedDuringCleanup,
      }),
    };
  }

  if (!session || !trustedAuthSubject) {
    return {
      auth0Session: {
        readOk: sessionReadOk,
        sessionAvailable: Boolean(session),
        trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
        trustedAuthSubjectSha256Prefix: hashDiagnosticValue(trustedAuthSubject),
      },
      appUserMapping: {
        attempted: appUserMapping.attempted,
        outcome: appUserMapping.outcome,
        rowCount: appUserMapping.rowCount,
        appUserIdSha256Prefix: appUserMapping.appUserIdSha256Prefix,
        errorCode: appUserMapping.errorCode,
        errorMessage: appUserMapping.errorMessage,
      },
      inventories: {
        spaces: spacesInventory,
        actors: actorsInventory,
        actorSpaceRoles: actorSpaceRolesInventory,
      },
      linkedSpaces: [],
      writeResult: buildBlockedResult(
        "blocked_no_session",
        "Browser Auth0 session is required for controlled actor bootstrap write."
      ),
      writes: buildWrites({
        dbReadExecuted,
        dbWriteExecuted,
        actorCreated,
        actorSpaceRoleCreated,
        actorDeletedDuringCleanup,
      }),
    };
  }

  appUserMapping = await readAppUserByAuthSubject(supabase, trustedAuthSubject);
  dbReadExecuted = true;

  if (appUserMapping.outcome !== "mapped" || !appUserMapping.appUserId) {
    return {
      auth0Session: {
        readOk: sessionReadOk,
        sessionAvailable: Boolean(session),
        trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
        trustedAuthSubjectSha256Prefix: hashDiagnosticValue(trustedAuthSubject),
      },
      appUserMapping: {
        attempted: appUserMapping.attempted,
        outcome: appUserMapping.outcome,
        rowCount: appUserMapping.rowCount,
        appUserIdSha256Prefix: appUserMapping.appUserIdSha256Prefix,
        errorCode: appUserMapping.errorCode,
        errorMessage: appUserMapping.errorMessage,
      },
      inventories: {
        spaces: spacesInventory,
        actors: actorsInventory,
        actorSpaceRoles: actorSpaceRolesInventory,
      },
      linkedSpaces: [],
      writeResult: buildBlockedResult(
        "blocked_app_user_not_mapped",
        "Auth0 subject was not mapped to exactly one app_users row."
      ),
      writes: buildWrites({
        dbReadExecuted,
        dbWriteExecuted,
        actorCreated,
        actorSpaceRoleCreated,
        actorDeletedDuringCleanup,
      }),
    };
  }

  linkedSpaces = await findLinkedSpaces(
    supabase,
    spacesInventory,
    appUserMapping.appUserId
  );
  dbReadExecuted = true;

  if (linkedSpaces.length === 0) {
    return {
      auth0Session: {
        readOk: sessionReadOk,
        sessionAvailable: Boolean(session),
        trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
        trustedAuthSubjectSha256Prefix: hashDiagnosticValue(trustedAuthSubject),
      },
      appUserMapping: {
        attempted: appUserMapping.attempted,
        outcome: appUserMapping.outcome,
        rowCount: appUserMapping.rowCount,
        appUserIdSha256Prefix: appUserMapping.appUserIdSha256Prefix,
        errorCode: appUserMapping.errorCode,
        errorMessage: appUserMapping.errorMessage,
      },
      inventories: {
        spaces: spacesInventory,
        actors: actorsInventory,
        actorSpaceRoles: actorSpaceRolesInventory,
      },
      linkedSpaces: [],
      writeResult: buildBlockedResult(
        "blocked_no_space",
        "No linked space was found for mapped app_user."
      ),
      writes: buildWrites({
        dbReadExecuted,
        dbWriteExecuted,
        actorCreated,
        actorSpaceRoleCreated,
        actorDeletedDuringCleanup,
      }),
    };
  }

  if (linkedSpaces.length > 1) {
    return {
      auth0Session: {
        readOk: sessionReadOk,
        sessionAvailable: Boolean(session),
        trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
        trustedAuthSubjectSha256Prefix: hashDiagnosticValue(trustedAuthSubject),
      },
      appUserMapping: {
        attempted: appUserMapping.attempted,
        outcome: appUserMapping.outcome,
        rowCount: appUserMapping.rowCount,
        appUserIdSha256Prefix: appUserMapping.appUserIdSha256Prefix,
        errorCode: appUserMapping.errorCode,
        errorMessage: appUserMapping.errorMessage,
      },
      inventories: {
        spaces: spacesInventory,
        actors: actorsInventory,
        actorSpaceRoles: actorSpaceRolesInventory,
      },
      linkedSpaces: linkedSpaces.map((space) => ({
        spaceIdSha256Prefix: space.spaceIdSha256Prefix,
        organizationIdSha256Prefix: space.organizationIdSha256Prefix,
        sourceColumn: space.sourceColumn,
      })),
      writeResult: buildBlockedResult(
        "blocked_multiple_spaces",
        "More than one linked space was found; controlled write requires one unambiguous space."
      ),
      writes: buildWrites({
        dbReadExecuted,
        dbWriteExecuted,
        actorCreated,
        actorSpaceRoleCreated,
        actorDeletedDuringCleanup,
      }),
    };
  }

  const selectedSpace = linkedSpaces[0];

  const existingActorsForSpace = await findExistingActorsForSpace(
    supabase,
    selectedSpace.spaceId
  );
  dbReadExecuted = true;

  if (!existingActorsForSpace.ok) {
    return {
      auth0Session: {
        readOk: sessionReadOk,
        sessionAvailable: Boolean(session),
        trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
        trustedAuthSubjectSha256Prefix: hashDiagnosticValue(trustedAuthSubject),
      },
      appUserMapping: {
        attempted: appUserMapping.attempted,
        outcome: appUserMapping.outcome,
        rowCount: appUserMapping.rowCount,
        appUserIdSha256Prefix: appUserMapping.appUserIdSha256Prefix,
        errorCode: appUserMapping.errorCode,
        errorMessage: appUserMapping.errorMessage,
      },
      inventories: {
        spaces: spacesInventory,
        actors: actorsInventory,
        actorSpaceRoles: actorSpaceRolesInventory,
      },
      linkedSpaces: linkedSpaces.map((space) => ({
        spaceIdSha256Prefix: space.spaceIdSha256Prefix,
        organizationIdSha256Prefix: space.organizationIdSha256Prefix,
        sourceColumn: space.sourceColumn,
      })),
      writeResult: buildBlockedResult(
        "unexpected_error",
        "Failed to read existing actor candidates for selected space.",
        existingActorsForSpace.errorMessage
      ),
      writes: buildWrites({
        dbReadExecuted,
        dbWriteExecuted,
        actorCreated,
        actorSpaceRoleCreated,
        actorDeletedDuringCleanup,
      }),
    };
  }

  if (existingActorsForSpace.actorIds.length === 1) {
    return {
      auth0Session: {
        readOk: sessionReadOk,
        sessionAvailable: Boolean(session),
        trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
        trustedAuthSubjectSha256Prefix: hashDiagnosticValue(trustedAuthSubject),
      },
      appUserMapping: {
        attempted: appUserMapping.attempted,
        outcome: appUserMapping.outcome,
        rowCount: appUserMapping.rowCount,
        appUserIdSha256Prefix: appUserMapping.appUserIdSha256Prefix,
        errorCode: appUserMapping.errorCode,
        errorMessage: appUserMapping.errorMessage,
      },
      inventories: {
        spaces: spacesInventory,
        actors: actorsInventory,
        actorSpaceRoles: actorSpaceRolesInventory,
      },
      linkedSpaces: linkedSpaces.map((space) => ({
        spaceIdSha256Prefix: space.spaceIdSha256Prefix,
        organizationIdSha256Prefix: space.organizationIdSha256Prefix,
        sourceColumn: space.sourceColumn,
      })),
      writeResult: {
        ok: true,
        status: "already_resolved_existing_actor",
        message:
          "Selected space already has exactly one actor candidate. No new DB write was needed.",
        selectedSpaceIdSha256Prefix: selectedSpace.spaceIdSha256Prefix,
        existingActorIdSha256Prefix: hashDiagnosticValue(
          existingActorsForSpace.actorIds[0]
        ),
        createdActorIdSha256Prefix: null,
        createdActorSpaceRoleIdSha256Prefix: null,
        cleanupExecuted: false,
        cleanupSucceeded: null,
        errorCode: null,
        errorMessage: null,
      },
      writes: buildWrites({
        dbReadExecuted,
        dbWriteExecuted,
        actorCreated,
        actorSpaceRoleCreated,
        actorDeletedDuringCleanup,
      }),
    };
  }

  if (existingActorsForSpace.actorIds.length > 1) {
    return {
      auth0Session: {
        readOk: sessionReadOk,
        sessionAvailable: Boolean(session),
        trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
        trustedAuthSubjectSha256Prefix: hashDiagnosticValue(trustedAuthSubject),
      },
      appUserMapping: {
        attempted: appUserMapping.attempted,
        outcome: appUserMapping.outcome,
        rowCount: appUserMapping.rowCount,
        appUserIdSha256Prefix: appUserMapping.appUserIdSha256Prefix,
        errorCode: appUserMapping.errorCode,
        errorMessage: appUserMapping.errorMessage,
      },
      inventories: {
        spaces: spacesInventory,
        actors: actorsInventory,
        actorSpaceRoles: actorSpaceRolesInventory,
      },
      linkedSpaces: linkedSpaces.map((space) => ({
        spaceIdSha256Prefix: space.spaceIdSha256Prefix,
        organizationIdSha256Prefix: space.organizationIdSha256Prefix,
        sourceColumn: space.sourceColumn,
      })),
      writeResult: buildBlockedResult(
        "blocked_multiple_existing_actors",
        "Selected space already has multiple actor candidates."
      ),
      writes: buildWrites({
        dbReadExecuted,
        dbWriteExecuted,
        actorCreated,
        actorSpaceRoleCreated,
        actorDeletedDuringCleanup,
      }),
    };
  }

  const actorInsertPayload: Record<string, string | null> = {};

  if (actorsInventory.existingColumns.includes("organization_id")) {
    actorInsertPayload.organization_id = selectedSpace.organizationId;
  }

  const actorInsertResult = await supabase
    .from("actors")
    .insert(actorInsertPayload)
    .select("id")
    .single();

  dbWriteExecuted = true;

  if (actorInsertResult.error) {
    return {
      auth0Session: {
        readOk: sessionReadOk,
        sessionAvailable: Boolean(session),
        trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
        trustedAuthSubjectSha256Prefix: hashDiagnosticValue(trustedAuthSubject),
      },
      appUserMapping: {
        attempted: appUserMapping.attempted,
        outcome: appUserMapping.outcome,
        rowCount: appUserMapping.rowCount,
        appUserIdSha256Prefix: appUserMapping.appUserIdSha256Prefix,
        errorCode: appUserMapping.errorCode,
        errorMessage: appUserMapping.errorMessage,
      },
      inventories: {
        spaces: spacesInventory,
        actors: actorsInventory,
        actorSpaceRoles: actorSpaceRolesInventory,
      },
      linkedSpaces: linkedSpaces.map((space) => ({
        spaceIdSha256Prefix: space.spaceIdSha256Prefix,
        organizationIdSha256Prefix: space.organizationIdSha256Prefix,
        sourceColumn: space.sourceColumn,
      })),
      writeResult: {
        ok: false,
        status: "actor_insert_failed",
        message: "Actor insert failed. Actor-space-role was not attempted.",
        selectedSpaceIdSha256Prefix: selectedSpace.spaceIdSha256Prefix,
        existingActorIdSha256Prefix: null,
        createdActorIdSha256Prefix: null,
        createdActorSpaceRoleIdSha256Prefix: null,
        cleanupExecuted: false,
        cleanupSucceeded: null,
        errorCode: actorInsertResult.error.code ?? "unknown",
        errorMessage: sanitizeErrorMessage(actorInsertResult.error.message),
      },
      writes: buildWrites({
        dbReadExecuted,
        dbWriteExecuted,
        actorCreated,
        actorSpaceRoleCreated,
        actorDeletedDuringCleanup,
      }),
    };
  }

  const createdActorId = readStringProperty(actorInsertResult.data, "id");
  actorCreated = Boolean(createdActorId);

  if (!createdActorId) {
    return {
      auth0Session: {
        readOk: sessionReadOk,
        sessionAvailable: Boolean(session),
        trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
        trustedAuthSubjectSha256Prefix: hashDiagnosticValue(trustedAuthSubject),
      },
      appUserMapping: {
        attempted: appUserMapping.attempted,
        outcome: appUserMapping.outcome,
        rowCount: appUserMapping.rowCount,
        appUserIdSha256Prefix: appUserMapping.appUserIdSha256Prefix,
        errorCode: appUserMapping.errorCode,
        errorMessage: appUserMapping.errorMessage,
      },
      inventories: {
        spaces: spacesInventory,
        actors: actorsInventory,
        actorSpaceRoles: actorSpaceRolesInventory,
      },
      linkedSpaces: linkedSpaces.map((space) => ({
        spaceIdSha256Prefix: space.spaceIdSha256Prefix,
        organizationIdSha256Prefix: space.organizationIdSha256Prefix,
        sourceColumn: space.sourceColumn,
      })),
      writeResult: {
        ok: false,
        status: "actor_insert_failed",
        message: "Actor insert returned no id.",
        selectedSpaceIdSha256Prefix: selectedSpace.spaceIdSha256Prefix,
        existingActorIdSha256Prefix: null,
        createdActorIdSha256Prefix: null,
        createdActorSpaceRoleIdSha256Prefix: null,
        cleanupExecuted: false,
        cleanupSucceeded: null,
        errorCode: "actor_insert_no_id",
        errorMessage: "Actor insert returned no id.",
      },
      writes: buildWrites({
        dbReadExecuted,
        dbWriteExecuted,
        actorCreated,
        actorSpaceRoleCreated,
        actorDeletedDuringCleanup,
      }),
    };
  }

  const roleInsertResult = await supabase
    .from("actor_space_roles")
    .insert({
      actor_id: createdActorId,
      space_id: selectedSpace.spaceId,
    })
    .select("id")
    .single();

  dbWriteExecuted = true;

  if (roleInsertResult.error) {
    const cleanupResult = await supabase
      .from("actors")
      .delete()
      .eq("id", createdActorId);

    actorDeletedDuringCleanup = !cleanupResult.error;

    return {
      auth0Session: {
        readOk: sessionReadOk,
        sessionAvailable: Boolean(session),
        trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
        trustedAuthSubjectSha256Prefix: hashDiagnosticValue(trustedAuthSubject),
      },
      appUserMapping: {
        attempted: appUserMapping.attempted,
        outcome: appUserMapping.outcome,
        rowCount: appUserMapping.rowCount,
        appUserIdSha256Prefix: appUserMapping.appUserIdSha256Prefix,
        errorCode: appUserMapping.errorCode,
        errorMessage: appUserMapping.errorMessage,
      },
      inventories: {
        spaces: spacesInventory,
        actors: actorsInventory,
        actorSpaceRoles: actorSpaceRolesInventory,
      },
      linkedSpaces: linkedSpaces.map((space) => ({
        spaceIdSha256Prefix: space.spaceIdSha256Prefix,
        organizationIdSha256Prefix: space.organizationIdSha256Prefix,
        sourceColumn: space.sourceColumn,
      })),
      writeResult: {
        ok: false,
        status: "actor_created_but_role_failed_cleanup_attempted",
        message:
          "Actor was created but actor_space_roles insert failed. Cleanup was attempted.",
        selectedSpaceIdSha256Prefix: selectedSpace.spaceIdSha256Prefix,
        existingActorIdSha256Prefix: null,
        createdActorIdSha256Prefix: hashDiagnosticValue(createdActorId),
        createdActorSpaceRoleIdSha256Prefix: null,
        cleanupExecuted: true,
        cleanupSucceeded: actorDeletedDuringCleanup,
        errorCode: roleInsertResult.error.code ?? "unknown",
        errorMessage: sanitizeErrorMessage(roleInsertResult.error.message),
      },
      writes: buildWrites({
        dbReadExecuted,
        dbWriteExecuted,
        actorCreated,
        actorSpaceRoleCreated,
        actorDeletedDuringCleanup,
      }),
    };
  }

  const createdActorSpaceRoleId = readStringProperty(
    roleInsertResult.data,
    "id"
  );
  actorSpaceRoleCreated = Boolean(createdActorSpaceRoleId);

  return {
    auth0Session: {
      readOk: sessionReadOk,
      sessionAvailable: Boolean(session),
      trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
      trustedAuthSubjectSha256Prefix: hashDiagnosticValue(trustedAuthSubject),
    },
    appUserMapping: {
      attempted: appUserMapping.attempted,
      outcome: appUserMapping.outcome,
      rowCount: appUserMapping.rowCount,
      appUserIdSha256Prefix: appUserMapping.appUserIdSha256Prefix,
      errorCode: appUserMapping.errorCode,
      errorMessage: appUserMapping.errorMessage,
    },
    inventories: {
      spaces: spacesInventory,
      actors: actorsInventory,
      actorSpaceRoles: actorSpaceRolesInventory,
    },
    linkedSpaces: linkedSpaces.map((space) => ({
      spaceIdSha256Prefix: space.spaceIdSha256Prefix,
      organizationIdSha256Prefix: space.organizationIdSha256Prefix,
      sourceColumn: space.sourceColumn,
    })),
    writeResult: {
      ok: true,
      status: "actor_bootstrap_created",
      message:
        "Controlled actor bootstrap write completed: actor and actor_space_roles link were created.",
      selectedSpaceIdSha256Prefix: selectedSpace.spaceIdSha256Prefix,
      existingActorIdSha256Prefix: null,
      createdActorIdSha256Prefix: hashDiagnosticValue(createdActorId),
      createdActorSpaceRoleIdSha256Prefix: hashDiagnosticValue(
        createdActorSpaceRoleId
      ),
      cleanupExecuted: false,
      cleanupSucceeded: null,
      errorCode: null,
      errorMessage: null,
    },
    writes: buildWrites({
      dbReadExecuted,
      dbWriteExecuted,
      actorCreated,
      actorSpaceRoleCreated,
      actorDeletedDuringCleanup,
    }),
  };
}

export async function GET() {
  const result = await runActorBootstrapControlledWrite({
    executeControlledWrite: false,
    expectedPolicy: null,
    acknowledgedFirstControlledDbWrite: null,
  });

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/debug/actor-bootstrap-controlled-write",
    policy: "actor_bootstrap_controlled_write_v0",
    mode: "readiness_get_no_write",
    actualWriteEndpoint: "POST /api/activity/debug/actor-bootstrap-controlled-write",
    auth0Session: result.auth0Session,
    appUserMapping: result.appUserMapping,
    inventories: result.inventories,
    linkedSpaces: result.linkedSpaces,
    writeResult: {
      ...result.writeResult,
      status: "not_executed_get_only",
      message: "GET is read-only. Use POST with explicit gate to execute first controlled DB write.",
    },
    writes: buildWrites({
      dbReadExecuted: result.writes.dbReadExecuted,
      dbWriteExecuted: false,
      actorCreated: false,
      actorSpaceRoleCreated: false,
      actorDeletedDuringCleanup: false,
    }),
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        endpoint: "/api/activity/debug/actor-bootstrap-controlled-write",
        policy: "actor_bootstrap_controlled_write_v0",
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  const gate = parseWriteGate(body);

  try {
    const result = await runActorBootstrapControlledWrite(gate);

    return NextResponse.json({
      ok: result.writeResult.ok,
      endpoint: "/api/activity/debug/actor-bootstrap-controlled-write",
      policy: "actor_bootstrap_controlled_write_v0",
      mode: "first_controlled_db_write_actor_bootstrap",
      auth0Session: result.auth0Session,
      appUserMapping: result.appUserMapping,
      linkedSpaces: result.linkedSpaces,
      writeResult: result.writeResult,
      writes: result.writes,
      next:
        result.writeResult.ok
          ? "Run browser-authenticated actor resolution proof again."
          : "Do not continue until this controlled write result is reviewed.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: "/api/activity/debug/actor-bootstrap-controlled-write",
        policy: "actor_bootstrap_controlled_write_v0",
        mode: "first_controlled_db_write_actor_bootstrap",
        writeResult: {
          ok: false,
          status: "unexpected_error",
          message: "Unexpected controlled write route error.",
          selectedSpaceIdSha256Prefix: null,
          existingActorIdSha256Prefix: null,
          createdActorIdSha256Prefix: null,
          createdActorSpaceRoleIdSha256Prefix: null,
          cleanupExecuted: false,
          cleanupSucceeded: null,
          errorCode: "unexpected_route_error",
          errorMessage:
            error instanceof Error
              ? sanitizeErrorMessage(error.message)
              : "Unexpected route error.",
        },
        writes: buildWrites({
          dbReadExecuted: false,
          dbWriteExecuted: false,
          actorCreated: false,
          actorSpaceRoleCreated: false,
          actorDeletedDuringCleanup: false,
        }),
      },
      { status: 500 }
    );
  }
}
