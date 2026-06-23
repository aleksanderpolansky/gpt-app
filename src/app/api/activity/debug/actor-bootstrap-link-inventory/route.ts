import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
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
  key: string;
  table: string;
  tableReadable: boolean;
  existingColumns: string[];
  missingColumns: string[];
  probes: ProbeResultV0[];
};

type MatchProbeV0 = {
  key: string;
  table: string;
  matchColumn: string;
  selectColumns: string;
  attempted: boolean;
  ok: boolean;
  rowCount: number | null;
  hashedIds: string[];
  errorCode: string | null;
  errorMessage: string | null;
};

type WritesV0 = {
  sqlExecuted: false;
  dbReadExecuted: boolean;
  dbWriteExecuted: false;
  supabaseReadExecuted: boolean;
  supabaseWriteExecuted: false;
  actorCreated: false;
  actorSpaceRoleCreated: false;
  userUpdated: false;
  spaceCreated: false;
};

type SupabaseAdminClientV0 = ReturnType<typeof getSupabaseAdminClient>;

type TableDefinitionV0 = {
  key: string;
  table: string;
  columns: string[];
};

const TABLES_TO_PROBE: TableDefinitionV0[] = [
  {
    key: "appUsers",
    table: "app_users",
    columns: [
      "id",
      "auth0_sub",
      "email",
      "space_id",
      "default_space_id",
      "personal_space_id",
      "created_at",
      "updated_at",
    ],
  },
  {
    key: "spaces",
    table: "spaces",
    columns: [
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
    ],
  },
  {
    key: "actors",
    table: "actors",
    columns: [
      "id",
      "type",
      "actor_type",
      "name",
      "display_name",
      "organization_id",
      "created_at",
      "updated_at",
    ],
  },
  {
    key: "actorSpaceRoles",
    table: "actor_space_roles",
    columns: [
      "id",
      "actor_id",
      "space_id",
      "role",
      "role_key",
      "created_at",
      "updated_at",
    ],
  },
  {
    key: "spaceMembers",
    table: "space_members",
    columns: [
      "id",
      "space_id",
      "user_id",
      "app_user_id",
      "actor_id",
      "role",
      "role_key",
      "created_at",
      "updated_at",
    ],
  },
  {
    key: "userSpaces",
    table: "user_spaces",
    columns: [
      "id",
      "space_id",
      "user_id",
      "app_user_id",
      "role",
      "role_key",
      "created_at",
      "updated_at",
    ],
  },
  {
    key: "appUserSpaces",
    table: "app_user_spaces",
    columns: [
      "id",
      "space_id",
      "app_user_id",
      "user_id",
      "role",
      "role_key",
      "created_at",
      "updated_at",
    ],
  },
];

function sanitizeErrorMessage(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.slice(0, 220);
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

function buildWrites(supabaseReadExecuted: boolean): WritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: supabaseReadExecuted,
    dbWriteExecuted: false,
    supabaseReadExecuted,
    supabaseWriteExecuted: false,
    actorCreated: false,
    actorSpaceRoleCreated: false,
    userUpdated: false,
    spaceCreated: false,
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
  definition: TableDefinitionV0
): Promise<TableInventoryV0> {
  const probes: ProbeResultV0[] = [];

  for (const column of definition.columns) {
    probes.push(await probeColumn(supabase, definition.table, column));
  }

  const existingColumns = probes
    .filter((probe) => probe.exists)
    .map((probe) => probe.column);

  const missingColumns = probes
    .filter((probe) => !probe.exists)
    .map((probe) => probe.column);

  return {
    key: definition.key,
    table: definition.table,
    tableReadable: existingColumns.includes("id"),
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
): Promise<{
  attempted: boolean;
  outcome: "not_attempted_no_session" | "mapped" | "not_found" | "duplicate" | "query_error";
  rowCount: number | null;
  appUserId: string | null;
  appUserIdSha256Prefix: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}> {
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
  } catch (error) {
    return {
      attempted: true,
      outcome: "query_error",
      rowCount: null,
      appUserId: null,
      appUserIdSha256Prefix: null,
      errorCode: "unexpected_app_user_read_error",
      errorMessage:
        error instanceof Error
          ? sanitizeErrorMessage(error.message)
          : "Unexpected app user read error.",
    };
  }
}

async function matchRows(
  supabase: SupabaseAdminClientV0,
  key: string,
  table: string,
  selectColumns: string,
  matchColumn: string,
  matchValue: string | null
): Promise<MatchProbeV0> {
  if (!matchValue) {
    return {
      key,
      table,
      matchColumn,
      selectColumns,
      attempted: false,
      ok: false,
      rowCount: null,
      hashedIds: [],
      errorCode: "no_match_value",
      errorMessage: "No match value was available.",
    };
  }

  try {
    const { data, error } = await supabase
      .from(table)
      .select(selectColumns)
      .eq(matchColumn, matchValue)
      .limit(10);

    if (error) {
      return {
        key,
        table,
        matchColumn,
        selectColumns,
        attempted: true,
        ok: false,
        rowCount: null,
        hashedIds: [],
        errorCode: error.code ?? "unknown",
        errorMessage: sanitizeErrorMessage(error.message),
      };
    }

    const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    const hashedIds = rows
      .map((row) => hashDiagnosticValue(readStringProperty(row, "id")))
      .filter((value): value is string => Boolean(value));

    return {
      key,
      table,
      matchColumn,
      selectColumns,
      attempted: true,
      ok: true,
      rowCount: rows.length,
      hashedIds,
      errorCode: null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      key,
      table,
      matchColumn,
      selectColumns,
      attempted: true,
      ok: false,
      rowCount: null,
      hashedIds: [],
      errorCode: "unexpected_match_error",
      errorMessage:
        error instanceof Error
          ? sanitizeErrorMessage(error.message)
          : "Unexpected match error.",
    };
  }
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

  let supabaseAdminClientCreated = false;
  let supabaseReadExecuted = false;
  let supabaseClientError: string | null = null;

  const inventories: TableInventoryV0[] = [];
  let appUserMapping: Awaited<ReturnType<typeof readAppUserByAuthSubject>> = {
    attempted: false,
    outcome: "not_attempted_no_session",
    rowCount: null,
    appUserId: null,
    appUserIdSha256Prefix: null,
    errorCode: null,
    errorMessage: null,
  };

  const matchProbes: MatchProbeV0[] = [];

  try {
    const supabase = getSupabaseAdminClient();
    supabaseAdminClientCreated = true;

    for (const tableDefinition of TABLES_TO_PROBE) {
      inventories.push(await buildTableInventory(supabase, tableDefinition));
      supabaseReadExecuted = true;
    }

    appUserMapping = await readAppUserByAuthSubject(
      supabase,
      trustedAuthSubject
    );
    supabaseReadExecuted = true;

    const appUserId = appUserMapping.appUserId;

    for (const inventory of inventories) {
      const possibleUserColumns = [
        "app_user_id",
        "user_id",
        "owner_user_id",
        "created_by_user_id",
        "created_by",
      ].filter((column) => inventory.existingColumns.includes(column));

      const selectColumns = selectExistingColumns(inventory, [
        "id",
        "space_id",
        "actor_id",
        "app_user_id",
        "user_id",
        "owner_user_id",
        "created_by_user_id",
        "created_by",
        "role",
        "role_key",
        "type",
        "space_type",
        "organization_id",
      ]);

      for (const column of possibleUserColumns) {
        matchProbes.push(
          await matchRows(
            supabase,
            `${inventory.key}.${column}`,
            inventory.table,
            selectColumns,
            column,
            appUserId
          )
        );
        supabaseReadExecuted = true;
      }
    }
  } catch (error) {
    supabaseClientError =
      error instanceof Error
        ? sanitizeErrorMessage(error.message)
        : "Supabase admin client/inventory error.";
  }

  const tablesWithUserLinkColumns = inventories
    .filter((inventory) =>
      inventory.existingColumns.some((column) =>
        [
          "app_user_id",
          "user_id",
          "owner_user_id",
          "created_by_user_id",
          "created_by",
        ].includes(column)
      )
    )
    .map((inventory) => inventory.key);

  const matchProbesWithRows = matchProbes.filter(
    (probe) => probe.ok && (probe.rowCount ?? 0) > 0
  );

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/debug/actor-bootstrap-link-inventory",
    policy: "actor_bootstrap_link_inventory_v0",
    mode: "read_only_actor_bootstrap_link_inventory_no_write",
    countdownBeforeFirstControlledDbWrite: "1/1",
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
      supabaseAdminClientCreated,
      supabaseClientError,
    },
    appUserMapping: {
      attempted: appUserMapping.attempted,
      outcome: appUserMapping.outcome,
      rowCount: appUserMapping.rowCount,
      appUserIdSha256Prefix: appUserMapping.appUserIdSha256Prefix,
      errorCode: appUserMapping.errorCode,
      errorMessage: appUserMapping.errorMessage,
    },
    inventories,
    linkAnalysis: {
      tablesWithUserLinkColumns,
      matchProbeCount: matchProbes.length,
      matchProbesWithRowsCount: matchProbesWithRows.length,
      matchProbes,
      safestCurrentConclusion:
        matchProbesWithRows.length > 0
          ? "There is at least one existing app_user -> table link candidate."
          : "No existing app_user -> actor/space link was found in probed tables. First controlled DB write may need to create a minimal actor/space-role link using the existing schema.",
    },
    writes: buildWrites(supabaseReadExecuted),
  });
}

