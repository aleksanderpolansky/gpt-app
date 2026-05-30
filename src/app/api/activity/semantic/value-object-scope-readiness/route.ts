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

type SpaceResolution = {
  outcome:
    | "not_attempted_no_app_user"
    | "missing_selected_space_scope"
    | "resolved_single_space"
    | "space_not_found"
    | "multiple_matching_spaces";
  selectedSpaceId: string | null;
  selectedSpaceIdSha256Prefix: string | null;
  selectedSpaceOrganizationId: string | null;
  selectedSpaceOrganizationIdSha256Prefix: string | null;
  matchCount: number | null;
  sourceColumns: string[];
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

type ActorResolution = {
  outcome:
    | "not_attempted_no_space"
    | "resolved_single_actor"
    | "no_actor_candidate"
    | "multiple_actor_candidates"
    | "query_error";
  candidateActorCount: number;
  actorIdSha256Prefix: string | null;
  actorIdAvailableForFutureWriteGate: boolean;
  errorCode: string | null;
  errorMessage: string | null;
};

type ActivityEventResolution = {
  outcome:
    | "missing_app_user"
    | "missing_inserted_hash"
    | "found_single_matching_activity_event"
    | "not_found"
    | "multiple_matching_activity_events"
    | "query_error";
  candidateCount: number | null;
  activityEventIdSha256Prefix: string | null;
  title: string | null;
  source: string | null;
  status: string | null;
  durationMinutes: number | null;
  errorCode: string | null;
  errorMessage: string | null;
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

const ACTOR_SPACE_ROLE_COLUMNS = [
  "id",
  "actor_id",
  "space_id",
  "role",
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

const ACTIVITY_EVENT_COLUMNS = [
  "id",
  "user_id",
  "title",
  "description",
  "input_text",
  "source",
  "status",
  "duration_minutes",
  "started_at",
  "ended_at",
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

function anyColumnExists(inventory: TableInventory, columns: string[]): boolean {
  return columns.some((column) => inventory.existingColumns.includes(column));
}

function existingColumns(
  inventory: TableInventory,
  columns: string[]
): string[] {
  return columns.filter((column) => inventory.existingColumns.includes(column));
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

async function resolveSelectedSpace(params: {
  supabase: any;
  appUserId: string | null;
  selectedSpaceIdSha256Prefix: string | null;
  spacesInventory: TableInventory;
}): Promise<SpaceResolution> {
  if (!params.appUserId) {
    return {
      outcome: "not_attempted_no_app_user",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: params.selectedSpaceIdSha256Prefix,
      selectedSpaceOrganizationId: null,
      selectedSpaceOrganizationIdSha256Prefix: null,
      matchCount: null,
      sourceColumns: [],
    };
  }

  if (!params.selectedSpaceIdSha256Prefix) {
    return {
      outcome: "missing_selected_space_scope",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: null,
      selectedSpaceOrganizationId: null,
      selectedSpaceOrganizationIdSha256Prefix: null,
      matchCount: null,
      sourceColumns: [],
    };
  }

  const availableUserColumns = SPACE_USER_LINK_COLUMNS.filter((column) =>
    params.spacesInventory.existingColumns.includes(column)
  );

  const selectColumns = params.spacesInventory.existingColumns.includes(
    "organization_id"
  )
    ? "id, organization_id"
    : "id";

  const matches = new Map<
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

        if (hashDiagnosticValue(spaceId) !== params.selectedSpaceIdSha256Prefix) {
          continue;
        }

        const existing = matches.get(spaceId);

        if (existing) {
          if (!existing.sourceColumns.includes(column)) {
            existing.sourceColumns.push(column);
          }
          continue;
        }

        matches.set(spaceId, {
          spaceId,
          organizationId: readStringProperty(row, "organization_id"),
          sourceColumns: [column],
        });
      }
    } catch {
      continue;
    }
  }

  const found = Array.from(matches.values());

  if (found.length === 0) {
    return {
      outcome: "space_not_found",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: params.selectedSpaceIdSha256Prefix,
      selectedSpaceOrganizationId: null,
      selectedSpaceOrganizationIdSha256Prefix: null,
      matchCount: 0,
      sourceColumns: [],
    };
  }

  if (found.length > 1) {
    return {
      outcome: "multiple_matching_spaces",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: params.selectedSpaceIdSha256Prefix,
      selectedSpaceOrganizationId: null,
      selectedSpaceOrganizationIdSha256Prefix: null,
      matchCount: found.length,
      sourceColumns: found.flatMap((item) => item.sourceColumns),
    };
  }

  const selected = found[0];

  return {
    outcome: "resolved_single_space",
    selectedSpaceId: selected.spaceId,
    selectedSpaceIdSha256Prefix: hashDiagnosticValue(selected.spaceId),
    selectedSpaceOrganizationId: selected.organizationId,
    selectedSpaceOrganizationIdSha256Prefix: hashDiagnosticValue(
      selected.organizationId
    ),
    matchCount: 1,
    sourceColumns: selected.sourceColumns,
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

async function resolveActorForSpace(params: {
  supabase: any;
  selectedSpaceId: string | null;
}): Promise<ActorResolution> {
  if (!params.selectedSpaceId) {
    return {
      outcome: "not_attempted_no_space",
      candidateActorCount: 0,
      actorIdSha256Prefix: null,
      actorIdAvailableForFutureWriteGate: false,
      errorCode: null,
      errorMessage: null,
    };
  }

  const { data, error } = await params.supabase
    .from("actor_space_roles")
    .select("id, actor_id, space_id")
    .eq("space_id", params.selectedSpaceId)
    .limit(20);

  if (error) {
    return {
      outcome: "query_error",
      candidateActorCount: 0,
      actorIdSha256Prefix: null,
      actorIdAvailableForFutureWriteGate: false,
      errorCode: error.code ?? "unknown",
      errorMessage: sanitizeErrorMessage(error.message),
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

  if (actorIds.length === 0) {
    return {
      outcome: "no_actor_candidate",
      candidateActorCount: 0,
      actorIdSha256Prefix: null,
      actorIdAvailableForFutureWriteGate: false,
      errorCode: null,
      errorMessage: null,
    };
  }

  if (actorIds.length > 1) {
    return {
      outcome: "multiple_actor_candidates",
      candidateActorCount: actorIds.length,
      actorIdSha256Prefix: null,
      actorIdAvailableForFutureWriteGate: false,
      errorCode: null,
      errorMessage: null,
    };
  }

  return {
    outcome: "resolved_single_actor",
    candidateActorCount: 1,
    actorIdSha256Prefix: hashDiagnosticValue(actorIds[0]),
    actorIdAvailableForFutureWriteGate: true,
    errorCode: null,
    errorMessage: null,
  };
}

async function findInsertedActivityEvent(params: {
  supabase: any;
  appUserId: string | null;
  insertedActivityEventIdSha256Prefix: string | null;
}): Promise<ActivityEventResolution> {
  if (!params.appUserId) {
    return {
      outcome: "missing_app_user",
      candidateCount: null,
      activityEventIdSha256Prefix: null,
      title: null,
      source: null,
      status: null,
      durationMinutes: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  if (!params.insertedActivityEventIdSha256Prefix) {
    return {
      outcome: "missing_inserted_hash",
      candidateCount: null,
      activityEventIdSha256Prefix: null,
      title: null,
      source: null,
      status: null,
      durationMinutes: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  const { data, error } = await params.supabase
    .from("activity_events")
    .select("id, user_id, title, source, status, duration_minutes, created_at")
    .eq("user_id", params.appUserId)
    .eq("source", "chat_ai")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return {
      outcome: "query_error",
      candidateCount: null,
      activityEventIdSha256Prefix: null,
      title: null,
      source: null,
      status: null,
      durationMinutes: null,
      errorCode: error.code ?? "unknown",
      errorMessage: sanitizeErrorMessage(error.message),
    };
  }

  const rows = Array.isArray(data) ? (data as JsonRecord[]) : [];

  const matches = rows.filter((row) => {
    const id = readStringProperty(row, "id");
    return hashDiagnosticValue(id) === params.insertedActivityEventIdSha256Prefix;
  });

  if (matches.length === 0) {
    return {
      outcome: "not_found",
      candidateCount: rows.length,
      activityEventIdSha256Prefix: null,
      title: null,
      source: null,
      status: null,
      durationMinutes: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  if (matches.length > 1) {
    return {
      outcome: "multiple_matching_activity_events",
      candidateCount: matches.length,
      activityEventIdSha256Prefix: params.insertedActivityEventIdSha256Prefix,
      title: null,
      source: null,
      status: null,
      durationMinutes: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  const match = matches[0];
  const id = readStringProperty(match, "id");
  const duration = match.duration_minutes;

  return {
    outcome: "found_single_matching_activity_event",
    candidateCount: 1,
    activityEventIdSha256Prefix: hashDiagnosticValue(id),
    title: readStringProperty(match, "title"),
    source: readStringProperty(match, "source"),
    status: readStringProperty(match, "status"),
    durationMinutes: typeof duration === "number" ? duration : null,
    errorCode: null,
    errorMessage: null,
  };
}

function buildDecision(params: {
  authSessionAvailable: boolean;
  appUserMapping: AppUserMapping;
  selectedSpaceResolution: SpaceResolution;
  organizationResolution: OrganizationResolution;
  actorResolution: ActorResolution;
  activityEventResolution: ActivityEventResolution;
  valueObjectsInventory: TableInventory;
}): {
  canAttemptOrganizationScopedValueObjectWriteWithExplicitPost: boolean;
  canAttemptPersonalValueObjectWriteNow: false;
  blockers: string[];
  positiveSignals: string[];
  valueObjectScopeMode:
    | "organization_scoped_candidate"
    | "personal_scope_not_supported_by_current_value_objects_schema"
    | "blocked";
  valueObjectRequiredSignals: {
    tableReadable: boolean;
    hasIdentityColumn: boolean;
    hasOrganizationScopeColumn: boolean;
    hasPersonalScopeColumn: boolean;
    personalScopeColumns: string[];
    hasTitleColumn: boolean;
    hasDescriptionColumn: boolean;
    hasStatusColumn: boolean;
  };
  note: string;
} {
  const blockers: string[] = [];
  const positiveSignals: string[] = [];

  if (!params.authSessionAvailable) {
    blockers.push("browser_auth0_session_required");
  } else {
    positiveSignals.push("browser_auth0_session_available");
  }

  if (params.appUserMapping.outcome !== "mapped") {
    blockers.push("app_user_mapping_required");
  } else {
    positiveSignals.push("auth0_subject_mapped_to_app_user");
  }

  if (params.selectedSpaceResolution.outcome !== "resolved_single_space") {
    blockers.push("selected_space_resolution_required");
  } else {
    positiveSignals.push("selected_space_resolved");
  }

  if (!params.selectedSpaceResolution.selectedSpaceOrganizationId) {
    blockers.push("selected_space_organization_id_required_for_current_value_objects_schema");
  } else {
    positiveSignals.push("selected_space_has_organization_id");
  }

  if (params.organizationResolution.outcome !== "organization_resolved") {
    blockers.push("organization_resolution_required");
  } else {
    positiveSignals.push("organization_resolved");
  }

  if (params.actorResolution.outcome !== "resolved_single_actor") {
    blockers.push("single_actor_resolution_required");
  } else {
    positiveSignals.push("single_actor_resolved");
  }

  if (
    params.activityEventResolution.outcome !==
    "found_single_matching_activity_event"
  ) {
    blockers.push("verified_activity_event_required");
  } else {
    positiveSignals.push("verified_activity_event_found");
  }

  const personalScopeColumns = existingColumns(params.valueObjectsInventory, [
    "actor_id",
    "space_id",
    "app_user_id",
    "user_id",
    "owner_user_id",
  ]);

  const valueObjectSignals = {
    tableReadable: params.valueObjectsInventory.tableReadable,
    hasIdentityColumn: params.valueObjectsInventory.existingColumns.includes("id"),
    hasOrganizationScopeColumn:
      params.valueObjectsInventory.existingColumns.includes("organization_id"),
    hasPersonalScopeColumn: personalScopeColumns.length > 0,
    personalScopeColumns,
    hasTitleColumn: anyColumnExists(params.valueObjectsInventory, [
      "title",
      "name",
    ]),
    hasDescriptionColumn:
      params.valueObjectsInventory.existingColumns.includes("description"),
    hasStatusColumn: params.valueObjectsInventory.existingColumns.includes(
      "status"
    ),
  };

  if (!valueObjectSignals.tableReadable) {
    blockers.push("value_objects_table_not_readable");
  } else {
    positiveSignals.push("value_objects_table_readable");
  }

  if (!valueObjectSignals.hasOrganizationScopeColumn) {
    blockers.push("value_objects_organization_id_column_required_for_current_schema");
  } else {
    positiveSignals.push("value_objects_organization_id_column_available");
  }

  if (!valueObjectSignals.hasTitleColumn) {
    blockers.push("value_objects_title_or_name_column_required");
  } else {
    positiveSignals.push("value_objects_title_or_name_column_available");
  }

  if (!valueObjectSignals.hasStatusColumn) {
    blockers.push("value_objects_status_column_missing_but_insert_may_use_default_or_omit");
  } else {
    positiveSignals.push("value_objects_status_column_available");
  }

  const canAttemptOrganizationScopedValueObjectWriteWithExplicitPost =
    params.authSessionAvailable &&
    params.appUserMapping.outcome === "mapped" &&
    params.selectedSpaceResolution.outcome === "resolved_single_space" &&
    Boolean(params.selectedSpaceResolution.selectedSpaceOrganizationId) &&
    params.organizationResolution.outcome === "organization_resolved" &&
    params.actorResolution.outcome === "resolved_single_actor" &&
    params.activityEventResolution.outcome ===
      "found_single_matching_activity_event" &&
    valueObjectSignals.tableReadable &&
    valueObjectSignals.hasOrganizationScopeColumn &&
    valueObjectSignals.hasTitleColumn;

  return {
    canAttemptOrganizationScopedValueObjectWriteWithExplicitPost,
    canAttemptPersonalValueObjectWriteNow: false,
    blockers,
    positiveSignals,
    valueObjectScopeMode: canAttemptOrganizationScopedValueObjectWriteWithExplicitPost
      ? "organization_scoped_candidate"
      : valueObjectSignals.hasPersonalScopeColumn
        ? "blocked"
        : "personal_scope_not_supported_by_current_value_objects_schema",
    valueObjectRequiredSignals: valueObjectSignals,
    note:
      "Current value_objects schema is evaluated as organization-scoped for the first safe VO write. Personal/actor/user scoped VO write remains disabled unless matching scope columns exist and a separate policy is created.",
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const selectedSpaceIdSha256Prefix = url.searchParams.get(
    "selectedSpaceIdSha256Prefix"
  );

  const insertedActivityEventIdSha256Prefix = url.searchParams.get(
    "insertedActivityEventIdSha256Prefix"
  );

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
    actorSpaceRolesInventory,
    organizationsInventory,
    valueObjectsInventory,
    activityEventsInventory,
  ] = await Promise.all([
    buildInventory(supabase, "spaces", SPACE_COLUMNS),
    buildInventory(supabase, "actor_space_roles", ACTOR_SPACE_ROLE_COLUMNS),
    buildInventory(supabase, "organizations", ORGANIZATION_COLUMNS),
    buildInventory(supabase, "value_objects", VALUE_OBJECT_COLUMNS),
    buildInventory(supabase, "activity_events", ACTIVITY_EVENT_COLUMNS),
  ]);

  const appUserMapping = await mapAppUser({
    supabase,
    trustedAuthSubject,
  });

  const selectedSpaceResolution = await resolveSelectedSpace({
    supabase,
    appUserId: appUserMapping.appUserId,
    selectedSpaceIdSha256Prefix,
    spacesInventory,
  });

  const organizationResolution = await resolveOrganization({
    supabase,
    organizationId: selectedSpaceResolution.selectedSpaceOrganizationId,
  });

  const actorResolution = await resolveActorForSpace({
    supabase,
    selectedSpaceId: selectedSpaceResolution.selectedSpaceId,
  });

  const activityEventResolution = await findInsertedActivityEvent({
    supabase,
    appUserId: appUserMapping.appUserId,
    insertedActivityEventIdSha256Prefix,
  });

  const readinessDecision = buildDecision({
    authSessionAvailable: Boolean(session),
    appUserMapping,
    selectedSpaceResolution,
    organizationResolution,
    actorResolution,
    activityEventResolution,
    valueObjectsInventory,
  });

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/semantic/value-object-scope-readiness",
    policy: "value_object_scope_readiness_v0",
    mode: "read_only_value_object_scope_readiness_no_write",
    selectedSpaceIdSha256Prefix,
    insertedActivityEventIdSha256Prefix,
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
    selectedSpaceResolution: {
      outcome: selectedSpaceResolution.outcome,
      selectedSpaceIdSha256Prefix:
        selectedSpaceResolution.selectedSpaceIdSha256Prefix,
      selectedSpaceOrganizationIdSha256Prefix:
        selectedSpaceResolution.selectedSpaceOrganizationIdSha256Prefix,
      matchCount: selectedSpaceResolution.matchCount,
      sourceColumns: selectedSpaceResolution.sourceColumns,
    },
    organizationResolution,
    actorResolution,
    activityEventResolution,
    targetInventories: {
      spaces: spacesInventory,
      actorSpaceRoles: actorSpaceRolesInventory,
      organizations: organizationsInventory,
      valueObjects: valueObjectsInventory,
      activityEvents: activityEventsInventory,
    },
    readinessDecision,
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
    next: readinessDecision.canAttemptOrganizationScopedValueObjectWriteWithExplicitPost
      ? "C32-C may prove stable semantic bundle before explicit first VO write."
      : "Stop: decide whether to add personal/actor scope to value_objects or use organization-scoped VO only when selected space has organization_id.",
  });
}
