import crypto from "crypto";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import { getSupabaseAdminClient } from "../../../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SupabaseAdminClientV0 = ReturnType<typeof getSupabaseAdminClient>;

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
  tableReadable: boolean;
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

type SelectedSpaceResolutionV0 = {
  outcome:
    | "not_attempted_no_app_user"
    | "missing_selected_space_scope"
    | "resolved_single_space"
    | "space_not_found"
    | "multiple_matching_spaces"
    | "query_error";
  selectedSpaceId: string | null;
  selectedSpaceIdSha256Prefix: string | null;
  selectedSpaceOrganizationId: string | null;
  selectedSpaceOrganizationIdSha256Prefix: string | null;
  matchCount: number | null;
  sourceColumns: string[];
  errorCode: string | null;
  errorMessage: string | null;
};

type ActorResolutionV0 = {
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

type FirstSemanticPersistenceReadinessV0 = {
  policy: "first_semantic_persistence_write_v0";
  mode: "explicit_first_semantic_persistence_write_route";
  selectedSpaceIdSha256Prefix: string | null;
  auth0Session: {
    readAttempted: true;
    readOk: boolean;
    sessionAvailable: boolean;
    trustedAuthSubjectPresent: boolean;
    trustedAuthSubjectSha256Prefix: string | null;
  };
  appUserMapping: Omit<AppUserMappingV0, "appUserId">;
  selectedSpaceResolution: Omit<
    SelectedSpaceResolutionV0,
    "selectedSpaceId" | "selectedSpaceOrganizationId"
  >;
  actorResolution: Omit<ActorResolutionV0, "actorId">;
  targetInventories: {
    activityEvents: TableInventoryV0;
    valueObjects: TableInventoryV0;
    activityValueObjectLinks: TableInventoryV0;
    activityStateDeltas: TableInventoryV0;
  };
  readinessDecision: {
    canAttemptFirstSemanticActivityEventWriteWithExplicitPost: boolean;
    semanticWriteGateStillRequiresExplicitPostConfirmation: true;
    firstWriteTarget: "activity_events";
    valueObjectWritesEnabledNow: false;
    activityValueObjectLinkWritesEnabledNow: false;
    stateWritesEnabledNow: false;
    blockers: string[];
    positiveSignals: string[];
  };
  raw: {
    appUserId: string | null;
    selectedSpaceId: string | null;
    selectedSpaceOrganizationId: string | null;
    actorId: string | null;
  };
};

type WriteFlagsV0 = {
  sqlExecuted: false;
  dbReadExecuted: boolean;
  dbWriteExecuted: boolean;
  supabaseReadExecuted: boolean;
  supabaseWriteExecuted: boolean;
  activityEventInserted: boolean;
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

type ParsedWriteBodyV0 = {
  executeSemanticPersistenceWrite: boolean;
  expectedPolicy: string | null;
  acknowledgement: string | null;
  selectedSpaceIdSha256Prefix: string | null;
  inputText: string;
  inputLanguage: string;
  durationMinutes: number | null;
};

const SPACE_USER_LINK_COLUMNS_V0 = [
  "app_user_id",
  "user_id",
  "owner_user_id",
  "created_by_user_id",
  "created_by",
];

const SPACE_PROBE_COLUMNS_V0 = [
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

const ACTIVITY_EVENTS_PROBE_COLUMNS_V0 = [
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
  "comment",
  "note",
  "input_text",
  "raw_text",
  "source",
  "source_type",
  "status",
  "type",
  "activity_type",
  "duration_minutes",
  "duration_min",
  "minutes",
  "input_language",
  "language",
  "occurred_at",
  "started_at",
  "ended_at",
  "created_at",
  "updated_at",
];

const VALUE_OBJECTS_PROBE_COLUMNS_V0 = [
  "id",
  "actor_id",
  "space_id",
  "app_user_id",
  "user_id",
  "organization_id",
  "title",
  "name",
  "description",
  "created_at",
  "updated_at",
];

const ACTIVITY_VALUE_OBJECT_LINKS_PROBE_COLUMNS_V0 = [
  "id",
  "activity_event_id",
  "activity_id",
  "value_object_id",
  "actor_id",
  "space_id",
  "link_type",
  "created_at",
  "updated_at",
];

const ACTIVITY_STATE_DELTAS_PROBE_COLUMNS_V0 = [
  "id",
  "activity_event_id",
  "activity_id",
  "actor_id",
  "space_id",
  "state_key",
  "delta_value",
  "confidence",
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

function readNumberProperty(value: unknown, key: string): number | null {
  if (!isRecord(value)) {
    return null;
  }

  const fieldValue = value[key];

  if (typeof fieldValue !== "number" || Number.isNaN(fieldValue)) {
    return null;
  }

  return fieldValue;
}

function buildWrites(params: {
  dbReadExecuted: boolean;
  dbWriteExecuted: boolean;
  activityEventInserted: boolean;
}): WriteFlagsV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: params.dbReadExecuted,
    dbWriteExecuted: params.dbWriteExecuted,
    supabaseReadExecuted: params.dbReadExecuted,
    supabaseWriteExecuted: params.dbWriteExecuted,
    activityEventInserted: params.activityEventInserted,
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

async function resolveSelectedSpace(params: {
  supabase: SupabaseAdminClientV0;
  appUserId: string | null;
  selectedSpaceIdSha256Prefix: string | null;
  spacesInventory: TableInventoryV0;
}): Promise<SelectedSpaceResolutionV0> {
  if (!params.appUserId) {
    return {
      outcome: "not_attempted_no_app_user",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: params.selectedSpaceIdSha256Prefix,
      selectedSpaceOrganizationId: null,
      selectedSpaceOrganizationIdSha256Prefix: null,
      matchCount: null,
      sourceColumns: [],
      errorCode: null,
      errorMessage: null,
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
      errorCode: null,
      errorMessage: null,
    };
  }

  const candidates = new Map<
    string,
    {
      spaceId: string;
      organizationId: string | null;
      sourceColumns: string[];
    }
  >();

  const userLinkColumns = SPACE_USER_LINK_COLUMNS_V0.filter((column) =>
    params.spacesInventory.existingColumns.includes(column)
  );

  const selectColumns = selectExistingColumns(params.spacesInventory, [
    "id",
    "organization_id",
    "app_user_id",
    "user_id",
    "owner_user_id",
    "created_by_user_id",
    "created_by",
  ]);

  for (const column of userLinkColumns) {
    const { data, error } = await params.supabase
      .from("spaces")
      .select(selectColumns)
      .eq(column, params.appUserId)
      .limit(50);

    if (error) {
      continue;
    }

    const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];

    for (const row of rows) {
      const spaceId = readStringProperty(row, "id");

      if (!spaceId) {
        continue;
      }

      if (hashDiagnosticValue(spaceId) !== params.selectedSpaceIdSha256Prefix) {
        continue;
      }

      const existing = candidates.get(spaceId);

      if (existing) {
        existing.sourceColumns.push(column);
        continue;
      }

      candidates.set(spaceId, {
        spaceId,
        organizationId: readStringProperty(row, "organization_id"),
        sourceColumns: [column],
      });
    }
  }

  const matches = Array.from(candidates.values());

  if (matches.length === 0) {
    return {
      outcome: "space_not_found",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: params.selectedSpaceIdSha256Prefix,
      selectedSpaceOrganizationId: null,
      selectedSpaceOrganizationIdSha256Prefix: null,
      matchCount: 0,
      sourceColumns: [],
      errorCode: null,
      errorMessage: null,
    };
  }

  if (matches.length > 1) {
    return {
      outcome: "multiple_matching_spaces",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: params.selectedSpaceIdSha256Prefix,
      selectedSpaceOrganizationId: null,
      selectedSpaceOrganizationIdSha256Prefix: null,
      matchCount: matches.length,
      sourceColumns: matches.flatMap((match) => match.sourceColumns),
      errorCode: null,
      errorMessage: null,
    };
  }

  const selected = matches[0];

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
    errorCode: null,
    errorMessage: null,
  };
}

async function resolveActorForSpace(params: {
  supabase: SupabaseAdminClientV0;
  selectedSpaceId: string | null;
}): Promise<ActorResolutionV0> {
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
    .limit(10);

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

  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
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

async function buildReadiness(
  selectedSpaceIdSha256Prefix: string | null
): Promise<FirstSemanticPersistenceReadinessV0> {
  let session: unknown = null;
  let sessionReadOk = true;

  try {
    session = await auth0.getSession();
  } catch {
    sessionReadOk = false;
  }

  const trustedAuthSubject = readAuthSubjectFromSession(session);
  const supabase = getSupabaseAdminClient();

  const [
    spacesInventory,
    activityEventsInventory,
    valueObjectsInventory,
    activityValueObjectLinksInventory,
    activityStateDeltasInventory,
  ] = await Promise.all([
    buildTableInventory(supabase, "spaces", SPACE_PROBE_COLUMNS_V0),
    buildTableInventory(
      supabase,
      "activity_events",
      ACTIVITY_EVENTS_PROBE_COLUMNS_V0
    ),
    buildTableInventory(supabase, "value_objects", VALUE_OBJECTS_PROBE_COLUMNS_V0),
    buildTableInventory(
      supabase,
      "activity_value_object_links",
      ACTIVITY_VALUE_OBJECT_LINKS_PROBE_COLUMNS_V0
    ),
    buildTableInventory(
      supabase,
      "activity_state_deltas",
      ACTIVITY_STATE_DELTAS_PROBE_COLUMNS_V0
    ),
  ]);

  const appUserMapping = await readAppUserByAuthSubject(
    supabase,
    trustedAuthSubject
  );

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

  const blockers: string[] = [];
  const positiveSignals: string[] = [];

  if (!selectedSpaceIdSha256Prefix) {
    blockers.push("selected_space_scope_required");
  } else {
    positiveSignals.push("selected_space_scope_present");
  }

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

  if (selectedSpaceResolution.outcome !== "resolved_single_space") {
    blockers.push("selected_space_resolution_required");
  } else {
    positiveSignals.push("selected_space_resolved");
  }

  if (actorResolution.outcome !== "resolved_single_actor") {
    blockers.push("single_actor_resolution_required");
  } else {
    positiveSignals.push("single_actor_resolved");
  }

  if (!activityEventsInventory.tableReadable) {
    blockers.push("activity_events_table_not_readable_or_missing_id");
  } else {
    positiveSignals.push("activity_events_table_readable");
  }

  const canAttemptFirstSemanticActivityEventWriteWithExplicitPost =
    blockers.length === 0 &&
    Boolean(appUserMapping.appUserId) &&
    Boolean(selectedSpaceResolution.selectedSpaceId) &&
    Boolean(actorResolution.actorId) &&
    activityEventsInventory.tableReadable;

  return {
    policy: "first_semantic_persistence_write_v0",
    mode: "explicit_first_semantic_persistence_write_route",
    selectedSpaceIdSha256Prefix,
    auth0Session: {
      readAttempted: true,
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
    selectedSpaceResolution: {
      outcome: selectedSpaceResolution.outcome,
      selectedSpaceIdSha256Prefix:
        selectedSpaceResolution.selectedSpaceIdSha256Prefix,
      selectedSpaceOrganizationIdSha256Prefix:
        selectedSpaceResolution.selectedSpaceOrganizationIdSha256Prefix,
      matchCount: selectedSpaceResolution.matchCount,
      sourceColumns: selectedSpaceResolution.sourceColumns,
      errorCode: selectedSpaceResolution.errorCode,
      errorMessage: selectedSpaceResolution.errorMessage,
    },
    actorResolution: {
      outcome: actorResolution.outcome,
      candidateActorCount: actorResolution.candidateActorCount,
      actorIdSha256Prefix: actorResolution.actorIdSha256Prefix,
      actorIdAvailableForFutureWriteGate:
        actorResolution.actorIdAvailableForFutureWriteGate,
      errorCode: actorResolution.errorCode,
      errorMessage: actorResolution.errorMessage,
    },
    targetInventories: {
      activityEvents: activityEventsInventory,
      valueObjects: valueObjectsInventory,
      activityValueObjectLinks: activityValueObjectLinksInventory,
      activityStateDeltas: activityStateDeltasInventory,
    },
    readinessDecision: {
      canAttemptFirstSemanticActivityEventWriteWithExplicitPost,
      semanticWriteGateStillRequiresExplicitPostConfirmation: true,
      firstWriteTarget: "activity_events",
      valueObjectWritesEnabledNow: false,
      activityValueObjectLinkWritesEnabledNow: false,
      stateWritesEnabledNow: false,
      blockers,
      positiveSignals,
    },
    raw: {
      appUserId: appUserMapping.appUserId,
      selectedSpaceId: selectedSpaceResolution.selectedSpaceId,
      selectedSpaceOrganizationId:
        selectedSpaceResolution.selectedSpaceOrganizationId,
      actorId: actorResolution.actorId,
    },
  };
}

function parseWriteBody(body: unknown): ParsedWriteBodyV0 {
  if (!isRecord(body)) {
    return {
      executeSemanticPersistenceWrite: false,
      expectedPolicy: null,
      acknowledgement: null,
      selectedSpaceIdSha256Prefix: null,
      inputText: "",
      inputLanguage: "en",
      durationMinutes: null,
    };
  }

  const inputText =
    readStringProperty(body, "inputText") ??
    "C31-C first semantic persistence write probe";

  return {
    etionMinutes: number | null;
}): Record<string, string | number | null> {
  const inventory = params.readiness.targetInventories.activityEvents;
  const payload: Record<string, string | number | null> = {};
  const now = new Date().toISOString();
  const title = params.inputText.slice(0, 140);

  addIfColumnExists({
    payload,
    inventory,
    column: "actor_id",
    value: params.readiness.raw.actorId,
  });

  addIfColumnExists({
    payload,
    inventory,
    column: "space_id",
    value: params.readiness.raw.selectedSpaceId,
  });

  addIfColumnExists({
    payload,
    inventory,
    column: "app_user_id",
    value: params.readiness.raw.appUserId,
  });

  addIfColumnExists({
    payload,
    inventory,
    column: "user_id",
    value: params.readiness.raw.appUserId,
  });

  addIfColumnExists({
    payload,
    inventory,
    column: "owner_user_id",
    value: params.readiness.raw.appUserId,
  });

  addIfColumnExists({
    payload,
    inventory,
    column: "organization_id",
    value: params.readiness.raw.selectedSpaceOrganizationId,
  });

  for (const column of ["title", "name"]) {
    addIfColumnExists({ payload, inventory, column, value: title });
  }

  for (const column of ["description", "comment", "note", "input_text", "raw_text"]) {
    addIfColumnExists({
      payload,
      inventory,
      column,
      value: params.inputText,
    });
  }

  for (const column of ["source", "source_type"]) {
    addIfColumnExists({
      payload,
      inventory,
      column,
      value: "chat_ai",
    });
  }

  addIfColumnExists({
    payload,
    inventory,
    column: "status",
    value: "completed",
  });

  for (const column of ["type", "activity_type"]) {
    addIfColumnExists({
      payload,
      inventory,
      column,
      value: "semantic_persistence_probe",
    });
  }

  for (const column of ["input_language", "language"]) {
    addIfColumnExists({
      payload,
      inventory,
      column,
      value: params.inputLanguage,
    });
  }

  if (typeof params.durationMinutes === "number") {
    for (const column of ["duration_minutes", "duration_min", "minutes"]) {
      addIfColumnExists({
        payload,
        inventory,
        column,
        value: params.durationMinutes,
      });
    }
  }

  for (const column of ["occurred_at", "started_at", "created_at", "updated_at"]) {
    addIfColumnExists({
      payload,
      inventory,
      column,
      value: now,
    });
  }

  return payload;
}

function publicReadiness(
  readiness: FirstSemanticPersistenceReadinessV0
): Omit<FirstSemanticPersistenceReadinessV0, "raw"> {
  return {
    policy: readiness.policy,
    mode: readiness.mode,
    selectedSpaceIdSha256Prefix: readiness.selectedSpaceIdSha256Prefix,
    auth0Session: readiness.auth0Session,
    appUserMapping: readiness.appUserMapping,
    selectedSpaceResolution: readiness.selectedSpaceResolution,
    actorResolution: readiness.actorResolution,
    targetInventories: readiness.targetInventories,
    readinessDecision: readiness.readinessDecision,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const selectedSpaceIdSha256Prefix = url.searchParams.get(
    "selectedSpaceIdSha256Prefix"
  );

  const readiness = await buildReadiness(selectedSpaceIdSha256Prefix);

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/semantic/first-persistence-write",
    policy: "first_semantic_persistence_write_v0",
    mode: "get_readiness_no_write",
    selectedSpaceIdSha256Prefix,
    readiness: publicReadiness(readiness),
    writes: buildWrites({
      dbReadExecuted: true,
      dbWriteExecuted: false,
      activityEventInserted: false,
    }),
    next: readiness.readinessDecision
      .canAttemptFirstSemanticActivityEventWriteWithExplicitPost
      ? "C31-C may execute first semantic activity_events write with explicit browser POST confirmation."
      : "Do not execute semantic write until readiness is true in browser-authenticated scope.",
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
        endpoint: "/api/activity/semantic/first-persistence-write",
        policy: "first_semantic_persistence_write_v0",
        error: "Invalid JSON body.",
        writes: buildWrites({
          dbReadExecuted: false,
          dbWriteExecuted: false,
          activityEventInserted: false,
        }),
      },
      { status: 400 }
    );
  }

  const parsed = parseWriteBody(body);
  const readiness = await buildReadiness(parsed.selectedSpaceIdSha256Prefix);

  const explicitGateOk =
    parsed.executeSemanticPersistenceWrite === true &&
    parsed.expectedPolicy === "first_semantic_persistence_write_v0" &&
    parsed.acknowledgement ===
      "C8-I-IMPLEMENT-31-C_FIRST_SEMANTIC_PERSISTENCE_WRITE";

  if (!explicitGateOk) {
    return NextResponse.json({
      ok: false,
      endpoint: "/api/activity/semantic/first-persistence-write",
      policy: "first_semantic_persistence_write_v0",
      mode: "post_blocked_missing_explicit_confirmation",
      selectedSpaceIdSha256Prefix: parsed.selectedSpaceIdSha256Prefix,
      readiness: publicReadiness(readiness),
      writeResult: {
        ok: false,
        status: "blocked_missing_explicit_semantic_write_confirmation",
        message:
          "POST requires executeSemanticPersistenceWrite=true, expectedPolicy, and exact acknowledgement.",
        insertedActivityEventIdSha256Prefix: null,
        errorCode: null,
        errorMessage: null,
      },
      writes: buildWrites({
        dbReadExecuted: true,
        dbWriteExecuted: false,
        activityEventInserted: false,
      }),
    });
  }

  if (
    readiness.readinessDecision
      .canAttemptFirstSemanticActivityEventWriteWithExplicitPost !== true
  ) {
    return NextResponse.json({
      ok: false,
      endpoint: "/api/activity/semantic/first-persistence-write",
      policy: "first_semantic_persistence_write_v0",
      mode: "post_blocked_readiness_false",
      selectedSpaceIdSha256Prefix: parsed.selectedSpaceIdSha256Prefix,
      readiness: publicReadiness(readiness),
      writeResult: {
        ok: false,
        status: "blocked_readiness_false",
        message:
          "Semantic write readiness is false. No activity_events insert was attempted.",
        insertedActivityEventIdSha256Prefix: null,
        errorCode: null,
        errorMessage: null,
      },
      writes: buildWrites({
        dbReadExecuted: true,
        dbWriteExecuted: false,
        activityEventInserted: false,
      }),
    });
  }

  const payload = buildActivityEventPayload({
    readiness,
    inputText: parsed.inputText,
    inputLanguage: parsed.inputLanguage,
    durationMinutes: parsed.durationMinutes,
  });

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({
      ok: false,
      endpoint: "/api/activity/semantic/first-persistence-write",
      policy: "first_semantic_persistence_write_v0",
      mode: "post_blocked_empty_payload",
      selectedSpaceIdSha256Prefix: parsed.selectedSpaceIdSha256Prefix,
      readiness: publicReadiness(readiness),
      writeResult: {
        ok: false,
        status: "blocked_empty_activity_event_payload",
        message:
          "No compatible activity_events payload columns were available.",
        insertedActivityEventIdSha256Prefix: null,
        errorCode: null,
        errorMessage: null,
      },
      writes: buildWrites({
        dbReadExecuted: true,
        dbWriteExecuted: false,
        activityEventInserted: false,
      }),
    });
  }

  const insertResult = await (getSupabaseAdminClient().from(
    "activity_events"
  ) as any)
    .insert(payload)
    .select("id")
    .single();

  if (insertResult.error) {
    return NextResponse.json({
      ok: false,
      endpoint: "/api/activity/semantic/first-persistence-write",
      policy: "first_semantic_persistence_write_v0",
      mode: "post_first_semantic_write_attempted_insert_failed",
      selectedSpaceIdSha256Prefix: parsed.selectedSpaceIdSha256Prefix,
      readiness: publicReadiness(readiness),
      writeResult: {
        ok: false,
        status: "activity_event_insert_failed",
        message:
          "activity_events insert was attempted but failed. No value objects, links, or state rows were attempted.",
        insertedActivityEventIdSha256Prefix: null,
        errorCode: insertResult.error.code ?? "unknown",
        errorMessage: sanitizeErrorMessage(insertResult.error.message),
      },
      writes: buildWrites({
        dbReadExecuted: true,
        dbWriteExecuted: true,
        activityEventInserted: false,
      }),
    });
  }

  const insertedActivityEventId = readStringProperty(insertResult.data, "id");

  return NextResponse.json({
    ok: Boolean(insertedActivityEventId),
    endpoint: "/api/activity/semantic/first-persistence-write",
    policy: "first_semantic_persistence_write_v0",
    mode: "post_first_semantic_activity_event_write_completed",
    selectedSpaceIdSha256Prefix: parsed.selectedSpaceIdSha256Prefix,
    readiness: publicReadiness(readiness),
    writeResult: {
      ok: Boolean(insertedActivityEventId),
      status: insertedActivityEventId
        ? "activity_event_inserted"
        : "activity_event_inserted_without_returned_id",
      message: insertedActivityEventId
        ? "First semantic persistence write completed: one activity_events row inserted. Value objects, links, and state rows remain disabled."
        : "Insert returned no id; review before continuing.",
      insertedActivityEventIdSha256Prefix:
        hashDiagnosticValue(insertedActivityEventId),
      errorCode: insertedActivityEventId ? null : "inserted_id_missing",
      errorMessage: insertedActivityEventId
        ? null
        : "activity_events insert returned no id.",
    },
    writes: buildWrites({
      dbReadExecuted: true,
      dbWriteExecuted: true,
      activityEventInserted: Boolean(insertedActivityEventId),
    }),
    next: insertedActivityEventId
      ? "Run C31-D verification: prove inserted activity_events row is readable through scoped actor context."
      : "Stop and inspect returned insert result.",
  });
}
