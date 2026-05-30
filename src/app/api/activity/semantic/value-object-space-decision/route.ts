import crypto from "crypto";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import { getSupabaseAdminClient } from "../../../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

type ProbeResult = {
  table: string;
  column: string;
  exists: boolean;
  errorCode: string | null;
  errorMessage: string | null;
};

type TableInventory = {
  table: string;
  tableReadable: boolean;
  existingColumns: string[];
  missingColumns: string[];
  probes: ProbeResult[];
};

type AppUserMapping = {
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

type OrganizationResolution = {
  outcome:
    | "not_attempted_no_organization_id"
    | "organization_resolved"
    | "organization_not_found"
    | "multiple_organizations"
    | "query_error";
  organizationIdSha256Prefix: string | null;
  rowCount: number | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type SpaceCandidate = {
  spaceIdSha256Prefix: string | null;
  sourceColumns: string[];
  hasOrganizationId: boolean;
  organizationIdSha256Prefix: string | null;
  organizationResolution: OrganizationResolution;
  actorCandidateCount: number;
  singleActorResolved: boolean;
  canBeUsedForOrganizationScopedValueObject: boolean;
};

const SPACE_USER_LINK_COLUMNS = [
  "app_user_id",
  "user_id",
  "owner_user_id",
  "created_by_user_id",
  "created_by",
];

const SPACE_COLUMNS = [
  "id",
  "organization_id",
  "app_user_id",
  "user_id",
  "owner_user_id",
  "created_by_user_id",
  "created_by",
  "type",
  "space_type",
  "name",
  "title",
  "created_at",
  "updated_at",
];

const ORGANIZATION_COLUMNS = [
  "id",
  "name",
  "title",
  "public_slug",
  "slug",
  "status",
  "created_at",
  "updated_at",
];

const ACTOR_SPACE_ROLE_COLUMNS = [
  "id",
  "actor_id",
  "space_id",
  "role",
  "created_at",
  "updated_at",
];

const VALUE_OBJECT_COLUMNS = [
  "id",
  "organization_id",
  "actor_id",
  "space_id",
  "app_user_id",
  "user_id",
  "owner_user_id",
  "title",
  "name",
  "description",
  "status",
  "visibility",
  "created_at",
  "updated_at",
];

function sanitizeErrorMessage(value: string | null | undefined): string | null {
  return value ? value.slice(0, 260) : null;
}

function isRecord(value: unknown): value is JsonRecord {
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

async function probeColumn(
  supabase: any,
  table: string,
  column: string
): Promise<ProbeResult> {
  try {
    const { error } = await supabase.from(table).select(column).limit(1);

    if (error) {
      return {
        table,
        column,
        exists: false,
        errorCode: error.code ?? "unknown",
        errorMessage: sanitizeErrorMessage(error.message),
      };
    }

    return {
      table,
      column,
      exists: true,
      errorCode: null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      table,
      column,
      exists: false,
      errorCode: "unexpected_probe_error",
      errorMessage:
        error instanceof Error
          ? sanitizeErrorMessage(error.message)
          : "Unexpected probe error.",
    };
  }
}

async function buildInventory(
  supabase: any,
  table: string,
  columns: string[]
): Promise<TableInventory> {
  const probes: ProbeResult[] = [];

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
    tableReadable: existingColumns.includes("id"),
    existingColumns,
    missingColumns,
    probes,
  };
}

async function mapAppUser(params: {
  supabase: any;
  trustedAuthSubject: string | null;
}): Promise<AppUserMapping> {
  if (!params.trustedAuthSubject) {
    return {
      outcome: "not_attempted_no_session",
      rowCount: null,
      appUserId: null,
      appUserIdSha256Prefix: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  const { data, error } = await params.supabase
    .from("app_users")
    .select("id, auth0_sub")
    .eq("auth0_sub", params.trustedAuthSubject)
    .limit(2);

  if (error) {
    return {
      outcome: "query_error",
      rowCount: null,
      appUserId: null,
      appUserIdSha256Prefix: null,
      errorCode: error.code ?? "unknown",
      errorMessage: sanitizeErrorMessage(error.message),
    };
  }

  const rows = Array.isArray(data) ? (data as JsonRecord[]) : [];

  if (rows.length === 0) {
    return {
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
    outcome: appUserId ? "mapped" : "query_error",
    rowCount: rows.length,
    appUserId,
    appUserIdSha256Prefix: hashDiagnosticValue(appUserId),
    errorCode: null,
    errorMessage: appUserId ? null : "Mapped app_users row has no id.",
  };
}

async function resolveOrganization(params: {
  supabase: any;
  organizationId: string | null;
}): Promise<OrganizationResolution> {
  if (!params.organizationId) {
    return {
      outcome: "not_attempted_no_organization_id",
      organizationIdSha256Prefix: null,
      rowCount: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  const { data, error } = await params.supabase
    .from("organizations")
    .select("id")
    .eq("id", params.organizationId)
    .limit(2);

  if (error) {
    return {
      outcome: "query_error",
      organizationIdSha256Prefix: hashDiagnosticValue(params.organizationId),
      rowCount: null,
      errorCode: error.code ?? "unknown",
      errorMessage: sanitizeErrorMessage(error.message),
    };
  }

  const rows = Array.isArray(data) ? (data as JsonRecord[]) : [];

  if (rows.length === 0) {
    return {
      outcome: "organization_not_found",
      organizationIdSha256Prefix: hashDiagnosticValue(params.organizationId),
      rowCount: 0,
      errorCode: null,
      errorMessage: null,
    };
  }

  if (rows.length > 1) {
    return {
      outcome: "multiple_organizations",
      organizationIdSha256Prefix: hashDiagnosticValue(params.organizationId),
      rowCount: rows.length,
      errorCode: null,
      errorMessage: null,
    };
  }

  return {
    outcome: "organization_resolved",
    organizationIdSha256Prefix: hashDiagnosticValue(params.organizationId),
    rowCount: 1,
    errorCode: null,
    errorMessage: null,
  };
}

async function countActorsForSpace(params: {
  supabase: any;
  spaceId: string;
}): Promise<{
  actorCandidateCount: number;
  singleActorResolved: boolean;
}> {
  const { data, error } = await params.supabase
    .from("actor_space_roles")
    .select("actor_id, space_id")
    .eq("space_id", params.spaceId)
    .limit(20);

  if (error) {
    return {
      actorCandidateCount: 0,
      singleActorResolved: false,
    };
  }

  const rows = Array.isArray(data) ? (data as JsonRecord[]) : [];

  const actorIds = Array.from(
    new Set(
      rows
        .map((row) => readStringProperty(row, "actor_id"))
        .filter((value): value is string => Boolean(value))
    )
  );

  return {
    actorCandidateCount: actorIds.length,
    singleActorResolved: actorIds.length === 1,
  };
}

async function listSpaceCandidates(params: {
  supabase: any;
  appUserId: string | null;
  spacesInventory: TableInventory;
}): Promise<SpaceCandidate[]> {
  if (!params.appUserId) {
    return [];
  }

  const availableUserColumns = SPACE_USER_LINK_COLUMNS.filter((column) =>
    params.spacesInventory.existingColumns.includes(column)
  );

  const selectColumns = ["id", "organization_id"]
    .filter((column) => params.spacesInventory.existingColumns.includes(column))
    .join(", ");

  if (!selectColumns.includes("id")) {
    return [];
  }

  const rawMatches = new Map<
    string,
    {
      spaceId: string;
      organizationId: string | null;
      sourceColumns: string[];
    }
  >();

  for (const column of availableUserColumns) {
    try {
      const { data, error } = await params.supabase
        .from("spaces")
        .select(selectColumns)
        .eq(column, params.appUserId)
        .limit(100);

      if (error) {
        continue;
      }

      const rows = Array.isArray(data) ? (data as JsonRecord[]) : [];

      for (const row of rows) {
        const spaceId = readStringProperty(row, "id");

        if (!spaceId) {
          continue;
        }

        const existing = rawMatches.get(spaceId);

        if (existing) {
          if (!existing.sourceColumns.includes(column)) {
            existing.sourceColumns.push(column);
          }
          continue;
        }

        rawMatches.set(spaceId, {
          spaceId,
          organizationId: readStringProperty(row, "organization_id"),
          sourceColumns: [column],
        });
      }
    } catch {
      continue;
    }
  }

  const candidates: SpaceCandidate[] = [];

  for (const match of Array.from(rawMatches.values())) {
    const organizationResolution = await resolveOrganization({
      supabase: params.supabase,
      organizationId: match.organizationId,
    });

    const actorResolution = await countActorsForSpace({
      supabase: params.supabase,
      spaceId: match.spaceId,
    });

    candidates.push({
      spaceIdSha256Prefix: hashDiagnosticValue(match.spaceId),
      sourceColumns: match.sourceColumns,
      hasOrganizationId: Boolean(match.organizationId),
      organizationIdSha256Prefix: hashDiagnosticValue(match.organizationId),
      organizationResolution,
      actorCandidateCount: actorResolution.actorCandidateCount,
      singleActorResolved: actorResolution.singleActorResolved,
      canBeUsedForOrganizationScopedValueObject:
        Boolean(match.organizationId) &&
        organizationResolution.outcome === "organization_resolved" &&
        actorResolution.singleActorResolved,
    });
  }

  return candidates.sort((a, b) => {
    if (
      a.canBeUsedForOrganizationScopedValueObject !==
      b.canBeUsedForOrganizationScopedValueObject
    ) {
      return a.canBeUsedForOrganizationScopedValueObject ? -1 : 1;
    }

    if (a.hasOrganizationId !== b.hasOrganizationId) {
      return a.hasOrganizationId ? -1 : 1;
    }

    return String(a.spaceIdSha256Prefix).localeCompare(
      String(b.spaceIdSha256Prefix)
    );
  });
}

export async function GET() {
  let session: unknown = null;
  let sessionReadOk = true;

  try {
    session = await auth0.getSession();
  } catch {
    sessionReadOk = false;
  }

  const trustedAuthSubject = readAuthSubjectFromSession(session);
  const supabase = getSupabaseAdminClient() as any;

  const [
    spacesInventory,
    organizationsInventory,
    actorSpaceRolesInventory,
    valueObjectsInventory,
  ] = await Promise.all([
    buildInventory(supabase, "spaces", SPACE_COLUMNS),
    buildInventory(supabase, "organizations", ORGANIZATION_COLUMNS),
    buildInventory(supabase, "actor_space_roles", ACTOR_SPACE_ROLE_COLUMNS),
    buildInventory(supabase, "value_objects", VALUE_OBJECT_COLUMNS),
  ]);

  const appUserMapping = await mapAppUser({
    supabase,
    trustedAuthSubject,
  });

  const spaceCandidates = await listSpaceCandidates({
    supabase,
    appUserId: appUserMapping.appUserId,
    spacesInventory,
  });

  const usableOrganizationScopedSpaces = spaceCandidates.filter(
    (candidate) => candidate.canBeUsedForOrganizationScopedValueObject
  );

  const hasOrganizationScopedCandidate =
    usableOrganizationScopedSpaces.length > 0;

  const blockers: string[] = [];
  const positiveSignals: string[] = [];

  if (!session || !trustedAuthSubject) {
    blockers.push("browser_auth0_session_required");
  } else {
    positiveSignals.push("browser_auth0_session_available");
  }

  if (appUserMapping.outcome !== "mapped") {
    blockers.push("app_user_mapping_required");
  } else {
    positiveSignals.push("auth0_subject_mapped_to_app_user");
  }

  if (!spacesInventory.tableReadable) {
    blockers.push("spaces_table_not_readable");
  } else {
    positiveSignals.push("spaces_table_readable");
  }

  if (!organizationsInventory.tableReadable) {
    blockers.push("organizations_table_not_readable");
  } else {
    positiveSignals.push("organizations_table_readable");
  }

  if (!actorSpaceRolesInventory.tableReadable) {
    blockers.push("actor_space_roles_table_not_readable");
  } else {
    positiveSignals.push("actor_space_roles_table_readable");
  }

  if (!valueObjectsInventory.tableReadable) {
    blockers.push("value_objects_table_not_readable");
  } else {
    positiveSignals.push("value_objects_table_readable");
  }

  if (!hasOrganizationScopedCandidate) {
    blockers.push("no_organization_linked_space_available_for_current_user");
  } else {
    positiveSignals.push("organization_linked_space_available_for_current_user");
  }

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/semantic/value-object-space-decision",
    policy: "value_object_space_decision_readiness_v0",
    mode: "read_only_user_space_inventory_for_vo_scope_decision",
    auth0Session: {
      readAttempted: true,
      readOk: sessionReadOk,
      sessionAvailable: Boolean(session),
      trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
      trustedAuthSubjectSha256Prefix: hashDiagnosticValue(trustedAuthSubject),
    },
    appUserMapping: {
      outcome: appUserMapping.outcome,
      rowCount: appUserMapping.rowCount,
      appUserIdSha256Prefix: appUserMapping.appUserIdSha256Prefix,
      errorCode: appUserMapping.errorCode,
      errorMessage: appUserMapping.errorMessage,
    },
    targetInventories: {
      spaces: spacesInventory,
      organizations: organizationsInventory,
      actorSpaceRoles: actorSpaceRolesInventory,
      valueObjects: valueObjectsInventory,
    },
    spaceDecision: {
      candidateCount: spaceCandidates.length,
      usableOrganizationScopedSpaceCount:
        usableOrganizationScopedSpaces.length,
      hasOrganizationScopedCandidate,
      recommendedSelectedSpaceIdSha256Prefix:
        usableOrganizationScopedSpaces[0]?.spaceIdSha256Prefix ?? null,
      candidates: spaceCandidates,
      decision: hasOrganizationScopedCandidate
        ? "switch_to_organization_linked_space_for_first_vo_write"
        : "schema_decision_required_before_first_vo_write",
      note: hasOrganizationScopedCandidate
        ? "Use recommendedSelectedSpaceIdSha256Prefix in the next VO-only scope readiness proof. No database writes were performed."
        : "No organization-linked space is available for this user. Do not write value_objects until personal/actor/user scope is designed or an organization-linked space is created intentionally.",
    },
    writes: {
      sqlExecuted: false,
      dbReadExecuted: true,
      dbWriteExecuted: false,
      supabaseReadExecuted: true,
      supabaseWriteExecuted: false,
      activityEventInserted: false,
      valueObjectCreated: false,
      activityValueObjectLinkCreated: false,
      stateDeltaCreated: false,
      stateFactCreated: false,
      stateSnapshotCreated: false,
    },
    next: hasOrganizationScopedCandidate
      ? "Repeat C32-B browser scope proof with recommendedSelectedSpaceIdSha256Prefix."
      : "Stop and design value_objects personal/actor/user scope before any VO write.",
  });
}
