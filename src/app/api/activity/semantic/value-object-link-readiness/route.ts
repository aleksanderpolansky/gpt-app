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
  matchCount: number | null;
  sourceColumns: string[];
};

type ActorResolution = {
  outcome:
    | "not_attempted_no_space"
    | "resolved_single_actor"
    | "no_actor_candidate"
    | "multiple_actor_candidates"
    | "query_error";
  candidateActorCount: number;
  actorId: string | null;
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
  activityEventId: string | null;
  activityEventIdSha256Prefix: string | null;
  title: string | null;
  source: string | null;
  status: string | null;
  durationMinutes: number | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type ReadinessDecision = {
  canAttemptValueObjectWriteWithExplicitPost: boolean;
  canAttemptActivityValueObjectLinkWriteWithExplicitPost: boolean;
  firstValueObjectWriteTarget: "value_objects";
  firstLinkWriteTarget: "activity_value_object_links";
  semanticWriteGateStillRequiresExplicitPostConfirmation: true;
  stateWritesEnabledNow: false;
  blockers: string[];
  positiveSignals: string[];
  valueObjectRequiredSignals: {
    tableReadable: boolean;
    hasIdentityColumn: boolean;
    hasTitleColumn: boolean;
    hasDescriptionColumn: boolean;
    hasOwnerOrScopeColumn: boolean;
    ownerOrScopeColumns: string[];
  };
  linkRequiredSignals: {
    tableReadable: boolean;
    hasIdentityColumn: boolean;
    hasActivityReferenceColumn: boolean;
    activityReferenceColumns: string[];
    hasValueObjectReferenceColumn: boolean;
    hasLinkTypeColumn: boolean;
    hasOwnerOrScopeColumn: boolean;
    ownerOrScopeColumns: string[];
  };
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

const VALUE_OBJECT_COLUMNS = [
  "id",
  "actor_id",
  "space_id",
  "app_user_id",
  "user_id",
  "owner_user_id",
  "organization_id",
  "title",
  "name",
  "description",
  "visibility",
  "status",
  "created_at",
  "updated_at",
];

const ACTIVITY_VALUE_OBJECT_LINK_COLUMNS = [
  "id",
  "activity_event_id",
  "activity_id",
  "value_object_id",
  "actor_id",
  "space_id",
  "app_user_id",
  "user_id",
  "owner_user_id",
  "organization_id",
  "link_type",
  "exposure_type",
  "confidence",
  "created_at",
  "updated_at",
];

const STATE_TABLE_COLUMNS = [
  "id",
  "activity_event_id",
  "activity_id",
  "actor_id",
  "space_id",
  "value_object_id",
  "state_key",
  "delta_value",
  "confidence",
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
      matchCount: null,
      sourceColumns: [],
    };
  }

  if (!params.selectedSpaceIdSha256Prefix) {
    return {
      outcome: "missing_selected_space_scope",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: null,
      matchCount: null,
      sourceColumns: [],
    };
  }

  const availableUserColumns = SPACE_USER_LINK_COLUMNS.filter((column) =>
    params.spacesInventory.existingColumns.includes(column)
  );

  const matches = new Map<
    string,
    {
      spaceId: string;
      sourceColumns: string[];
    }
  >();

  for (const column of availableUserColumns) {
    try {
      const { data, error } = await params.supabase
        .from("spaces")
        .select("id")
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
      matchCount: 0,
      sourceColumns: [],
    };
  }

  if (found.length > 1) {
    return {
      outcome: "multiple_matching_spaces",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: params.selectedSpaceIdSha256Prefix,
      matchCount: found.length,
      sourceColumns: found.flatMap((item) => item.sourceColumns),
    };
  }

  const selected = found[0];

  return {
    outcome: "resolved_single_space",
    selectedSpaceId: selected.spaceId,
    selectedSpaceIdSha256Prefix: hashDiagnosticValue(selected.spaceId),
    matchCount: 1,
    sourceColumns: selected.sourceColumns,
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
      actorId: null,
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
      actorId: null,
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
      actorId: null,
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
      actorId: null,
      actorIdSha256Prefix: null,
      actorIdAvailableForFutureWriteGate: false,
      errorCode: null,
      errorMessage: null,
    };
  }

  return {
    outcome: "resolved_single_actor",
    candidateActorCount: 1,
    actorId: actorIds[0],
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
      activityEventId: null,
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
      activityEventId: null,
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
      activityEventId: null,
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
      activityEventId: null,
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
      activityEventId: null,
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
    activityEventId: id,
    activityEventIdSha256Prefix: hashDiagnosticValue(id),
    title: readStringProperty(match, "title"),
    source: readStringProperty(match, "source"),
    status: readStringProperty(match, "status"),
    durationMinutes: typeof duration === "number" ? duration : null,
    errorCode: null,
    errorMessage: null,
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

function buildReadinessDecision(params: {
  authSessionAvailable: boolean;
  appUserMapping: AppUserMapping;
  selectedSpaceResolution: SpaceResolution;
  actorResolution: ActorResolution;
  activityEventResolution: ActivityEventResolution;
  valueObjectsInventory: TableInventory;
  activityValueObjectLinksInventory: TableInventory;
}): ReadinessDecision {
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

  const valueObjectOwnerOrScopeColumns = existingColumns(
    params.valueObjectsInventory,
    ["actor_id", "space_id", "app_user_id", "user_id", "owner_user_id", "organization_id"]
  );

  const linkOwnerOrScopeColumns = existingColumns(
    params.activityValueObjectLinksInventory,
    ["actor_id", "space_id", "app_user_id", "user_id", "owner_user_id", "organization_id"]
  );

  const valueObjectSignals = {
    tableReadable: params.valueObjectsInventory.tableReadable,
    hasIdentityColumn: params.valueObjectsInventory.existingColumns.includes("id"),
    hasTitleColumn: anyColumnExists(params.valueObjectsInventory, [
      "title",
      "name",
    ]),
    hasDescriptionColumn: params.valueObjectsInventory.existingColumns.includes(
      "description"
    ),
    hasOwnerOrScopeColumn: valueObjectOwnerOrScopeColumns.length > 0,
    ownerOrScopeColumns: valueObjectOwnerOrScopeColumns,
  };

  const linkSignals = {
    tableReadable: params.activityValueObjectLinksInventory.tableReadable,
    hasIdentityColumn:
      params.activityValueObjectLinksInventory.existingColumns.includes("id"),
    hasActivityReferenceColumn: anyColumnExists(
      params.activityValueObjectLinksInventory,
      ["activity_event_id", "activity_id"]
    ),
    activityReferenceColumns: existingColumns(
      params.activityValueObjectLinksInventory,
      ["activity_event_id", "activity_id"]
    ),
    hasValueObjectReferenceColumn:
      params.activityValueObjectLinksInventory.existingColumns.includes(
        "value_object_id"
      ),
    hasLinkTypeColumn: anyColumnExists(params.activityValueObjectLinksInventory, [
      "link_type",
      "exposure_type",
    ]),
    hasOwnerOrScopeColumn: linkOwnerOrScopeColumns.length > 0,
    ownerOrScopeColumns: linkOwnerOrScopeColumns,
  };

  if (!valueObjectSignals.tableReadable) {
    blockers.push("value_objects_table_not_readable");
  } else {
    positiveSignals.push("value_objects_table_readable");
  }

  if (!valueObjectSignals.hasTitleColumn) {
    blockers.push("value_objects_title_or_name_column_required");
  } else {
    positiveSignals.push("value_objects_title_or_name_column_available");
  }

  if (!valueObjectSignals.hasOwnerOrScopeColumn) {
    blockers.push("value_objects_owner_or_scope_column_required");
  } else {
    positiveSignals.push("value_objects_owner_or_scope_column_available");
  }

  if (!linkSignals.tableReadable) {
    blockers.push("activity_value_object_links_table_not_readable");
  } else {
    positiveSignals.push("activity_value_object_links_table_readable");
  }

  if (!linkSignals.hasActivityReferenceColumn) {
    blockers.push("activity_value_object_links_activity_reference_required");
  } else {
    positiveSignals.push("activity_value_object_links_activity_reference_available");
  }

  if (!linkSignals.hasValueObjectReferenceColumn) {
    blockers.push("activity_value_object_links_value_object_reference_required");
  } else {
    positiveSignals.push("activity_value_object_links_value_object_reference_available");
  }

  const sharedContextReady =
    params.authSessionAvailable &&
    params.appUserMapping.outcome === "mapped" &&
    params.selectedSpaceResolution.outcome === "resolved_single_space" &&
    params.actorResolution.outcome === "resolved_single_actor" &&
    params.activityEventResolution.outcome ===
      "found_single_matching_activity_event";

  const canAttemptValueObjectWriteWithExplicitPost =
    sharedContextReady &&
    valueObjectSignals.tableReadable &&
    valueObjectSignals.hasTitleColumn &&
    valueObjectSignals.hasOwnerOrScopeColumn;

  const canAttemptActivityValueObjectLinkWriteWithExplicitPost =
    canAttemptValueObjectWriteWithExplicitPost &&
    linkSignals.tableReadable &&
    linkSignals.hasActivityReferenceColumn &&
    linkSignals.hasValueObjectReferenceColumn;

  return {
    canAttemptValueObjectWriteWithExplicitPost,
    canAttemptActivityValueObjectLinkWriteWithExplicitPost,
    firstValueObjectWriteTarget: "value_objects",
    firstLinkWriteTarget: "activity_value_object_links",
    semanticWriteGateStillRequiresExplicitPostConfirmation: true,
    stateWritesEnabledNow: false,
    blockers,
    positiveSignals,
    valueObjectRequiredSignals: valueObjectSignals,
    linkRequiredSignals: linkSignals,
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
    activityEventsInventory,
    valueObjectsInventory,
    activityValueObjectLinksInventory,
    activityStateDeltasInventory,
  ] = await Promise.all([
    buildInventory(supabase, "spaces", SPACE_COLUMNS),
    buildInventory(supabase, "actor_space_roles", ACTOR_SPACE_ROLE_COLUMNS),
    buildInventory(supabase, "activity_events", ACTIVITY_EVENT_COLUMNS),
    buildInventory(supabase, "value_objects", VALUE_OBJECT_COLUMNS),
    buildInventory(
      supabase,
      "activity_value_object_links",
      ACTIVITY_VALUE_OBJECT_LINK_COLUMNS
    ),
    buildInventory(supabase, "activity_state_deltas", STATE_TABLE_COLUMNS),
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

  const actorResolution = await resolveActorForSpace({
    supabase,
    selectedSpaceId: selectedSpaceResolution.selectedSpaceId,
  });

  const activityEventResolution = await findInsertedActivityEvent({
    supabase,
    appUserId: appUserMapping.appUserId,
    insertedActivityEventIdSha256Prefix,
  });

  const readinessDecision = buildReadinessDecision({
    authSessionAvailable: Boolean(session),
    appUserMapping,
    selectedSpaceResolution,
    actorResolution,
    activityEventResolution,
    valueObjectsInventory,
    activityValueObjectLinksInventory,
  });

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/semantic/value-object-link-readiness",
    policy: "value_object_link_persistence_readiness_v0",
    mode: "read_only_value_object_link_readiness_no_write",
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
    selectedSpaceResolution,
    actorResolution: {
      outcome: actorResolution.outcome,
      candidateActorCount: actorResolution.candidateActorCount,
      actorIdSha256Prefix: actorResolution.actorIdSha256Prefix,
      actorIdAvailableForFutureWriteGate:
        actorResolution.actorIdAvailableForFutureWriteGate,
      errorCode: actorResolution.errorCode,
      errorMessage: actorResolution.errorMessage,
    },
    activityEventResolution: {
      outcome: activityEventResolution.outcome,
      candidateCount: activityEventResolution.candidateCount,
      activityEventIdSha256Prefix:
        activityEventResolution.activityEventIdSha256Prefix,
      title: activityEventResolution.title,
      source: activityEventResolution.source,
      status: activityEventResolution.status,
      durationMinutes: activityEventResolution.durationMinutes,
      errorCode: activityEventResolution.errorCode,
      errorMessage: activityEventResolution.errorMessage,
    },
    targetInventories: {
      spaces: spacesInventory,
      actorSpaceRoles: actorSpaceRolesInventory,
      activityEvents: activityEventsInventory,
      valueObjects: valueObjectsInventory,
      activityValueObjectLinks: activityValueObjectLinksInventory,
      activityStateDeltas: activityStateDeltasInventory,
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
    next: readinessDecision.canAttemptActivityValueObjectLinkWriteWithExplicitPost
      ? "C32-B may define explicit VO/link write policy and POST gate."
      : "Inspect blockers before designing VO/link write policy.",
  });
}
