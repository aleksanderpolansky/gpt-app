import crypto from "crypto";
import { NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
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

type Readiness = {
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
  appUserMapping: Omit<AppUserMapping, "appUserId">;
  selectedSpaceResolution: Omit<
    SpaceResolution,
    "selectedSpaceId" | "selectedSpaceOrganizationId"
  >;
  actorResolution: Omit<ActorResolution, "actorId">;
  targetInventories: {
    activityEvents: TableInventory;
    valueObjects: TableInventory;
    activityValueObjectLinks: TableInventory;
    activityStateDeltas: TableInventory;
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

type PublicReadiness = Omit<Readiness, "raw">;

type WriteFlags = {
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

type ParsedBody = {
  executeSemanticPersistenceWrite: boolean;
  expectedPolicy: string | null;
  acknowledgement: string | null;
  selectedSpaceIdSha256Prefix: string | null;
  inputText: string;
  inputLanguage: string;
  durationMinutes: number | null;
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

const ACTIVITY_EVENT_COLUMNS = [
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

const VALUE_OBJECT_COLUMNS = [
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

const ACTIVITY_VALUE_OBJECT_LINK_COLUMNS = [
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

const ACTIVITY_STATE_DELTA_COLUMNS = [
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

function readNumberProperty(value: unknown, key: string): number | null {
  if (!isRecord(value)) {
    return null;
  }

  const fieldValue = value[key];

  return typeof fieldValue === "number" && Number.isFinite(fieldValue)
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
  activityEventInserted: boolean;
}): WriteFlags {
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

function selectColumns(
  inventory: TableInventory,
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

async function mapAppUser(
  supabase: any,
  trustedAuthSubject: string | null
): Promise<AppUserMapping> {
  if (!trustedAuthSubject) {
    return {
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

  const matches = new Map<
    string,
    { spaceId: string; organizationId: string | null; sourceColumns: string[] }
  >();

  const availableUserColumns = SPACE_USER_LINK_COLUMNS.filter((column) =>
    params.spacesInventory.existingColumns.includes(column)
  );

  const columnsToSelect = selectColumns(params.spacesInventory, [
    "id",
    "organization_id",
    ...SPACE_USER_LINK_COLUMNS,
  ]);

  for (const column of availableUserColumns) {
    try {
      const { data, error } = await params.supabase
        .from("spaces")
        .select(columnsToSelect)
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

  const selectedMatches = Array.from(matches.values());

  if (selectedMatches.length === 0) {
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

  if (selectedMatches.length > 1) {
    return {
      outcome: "multiple_matching_spaces",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: params.selectedSpaceIdSha256Prefix,
      selectedSpaceOrganizationId: null,
      selectedSpaceOrganizationIdSha256Prefix: null,
      matchCount: selectedMatches.length,
      sourceColumns: selectedMatches.flatMap((match) => match.sourceColumns),
    };
  }

  const selected = selectedMatches[0];

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

async function resolveActorForSpace(params: {
  supabase: any;
  selectedSpaceId: string | null;
  trustedAuthSubject: string | null;
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

  if (!params.trustedAuthSubject) {
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

  try {
    const actorContext = await resolveActiveActorContext(
      params.trustedAuthSubject
    );
    const { data: actorRole, error: actorRoleError } = await params.supabase
      .from("actor_space_roles")
      .select("actor_id")
      .eq("space_id", params.selectedSpaceId)
      .eq("actor_id", actorContext.actorId)
      .limit(1)
      .maybeSingle();

    if (actorRoleError || !actorRole) {
      return {
        outcome: actorRoleError ? "query_error" : "no_actor_candidate",
        candidateActorCount: 0,
        actorId: null,
        actorIdSha256Prefix: null,
        actorIdAvailableForFutureWriteGate: false,
        errorCode: actorRoleError?.code ?? null,
        errorMessage: actorRoleError
          ? sanitizeErrorMessage(actorRoleError.message)
          : null,
      };
    }

    return {
      outcome: "resolved_single_actor",
      candidateActorCount: 1,
      actorId: actorContext.actorId,
      actorIdSha256Prefix: hashDiagnosticValue(actorContext.actorId),
      actorIdAvailableForFutureWriteGate: true,
      errorCode: null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      outcome: "query_error",
      candidateActorCount: 0,
      actorId: null,
      actorIdSha256Prefix: null,
      actorIdAvailableForFutureWriteGate: false,
      errorCode:
        error instanceof ActorContextError ? error.code : "unknown",
      errorMessage: sanitizeErrorMessage(
        error instanceof Error ? error.message : "Actor context failed"
      ),
    };
  }
}

async function buildReadiness(
  selectedSpaceIdSha256Prefix: string | null
): Promise<Readiness> {
  let session: unknown = null;
  let sessionReadOk = true;

  try {
    session = await auth0.getSession();
  } catch {
    sessionReadOk = false;
  }

  const trustedAuthSubject = readAuthSubjectFromSession(session);
  const supabase = getSupabaseAdminClient() as any;

  const spacesInventory = await buildInventory(
    supabase,
    "spaces",
    SPACE_COLUMNS
  );

  const activityEventsInventory = await buildInventory(
    supabase,
    "activity_events",
    ACTIVITY_EVENT_COLUMNS
  );

  const valueObjectsInventory = await buildInventory(
    supabase,
    "value_objects",
    VALUE_OBJECT_COLUMNS
  );

  const activityValueObjectLinksInventory = await buildInventory(
    supabase,
    "activity_value_object_links",
    ACTIVITY_VALUE_OBJECT_LINK_COLUMNS
  );

  const activityStateDeltasInventory = await buildInventory(
    supabase,
    "activity_state_deltas",
    ACTIVITY_STATE_DELTA_COLUMNS
  );

  const appUserMapping = await mapAppUser(supabase, trustedAuthSubject);

  const selectedSpaceResolution = await resolveSelectedSpace({
    supabase,
    appUserId: appUserMapping.appUserId,
    selectedSpaceIdSha256Prefix,
    spacesInventory,
  });

  const actorResolution = await resolveActorForSpace({
    supabase,
    selectedSpaceId: selectedSpaceResolution.selectedSpaceId,
    trustedAuthSubject,
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

function publicReadiness(readiness: Readiness): PublicReadiness {
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

function parseWriteBody(body: unknown): ParsedBody {
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
    executeSemanticPersistenceWrite:
      body.executeSemanticPersistenceWrite === true,
    expectedPolicy: readStringProperty(body, "expectedPolicy"),
    acknowledgement: readStringProperty(body, "acknowledgement"),
    selectedSpaceIdSha256Prefix: readStringProperty(
      body,
      "selectedSpaceIdSha256Prefix"
    ),
    inputText: inputText.slice(0, 500),
    inputLanguage: readStringProperty(body, "inputLanguage") ?? "en",
    durationMinutes: readNumberProperty(body, "durationMinutes"),
  };
}

function addIfColumnExists(params: {
  payload: Record<string, string | number>;
  inventory: TableInventory;
  column: string;
  value: string | number | null;
}) {
  if (
    params.value !== null &&
    params.value !== undefined &&
    params.inventory.existingColumns.includes(params.column)
  ) {
    params.payload[params.column] = params.value;
  }
}

function buildActivityEventPayload(params: {
  readiness: Readiness;
  inputText: string;
  inputLanguage: string;
  durationMinutes: number | null;
}): Record<string, string | number> {
  const inventory = params.readiness.targetInventories.activityEvents;
  const payload: Record<string, string | number> = {};
  const now = new Date().toISOString();
  const title = params.inputText.slice(0, 140);

  addIfColumnExists({
    payload,
    inventory,
    column: "actor_id",
    value: params.readiness.raw.actorId,
  });

  for (const column of [
    "performed_by_actor_id",
    "acting_as_actor_id",
    "acting_for_actor_id",
  ]) {
    addIfColumnExists({
      payload,
      inventory,
      column,
      value: params.readiness.raw.actorId,
    });
  }

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

  for (const column of [
    "description",
    "comment",
    "note",
    "input_text",
    "raw_text",
  ]) {
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

  for (const column of [
    "occurred_at",
    "started_at",
    "ended_at",
    "created_at",
    "updated_at",
  ]) {
    addIfColumnExists({
      payload,
      inventory,
      column,
      value: now,
    });
  }

  return payload;
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

  const supabase = getSupabaseAdminClient() as any;

  const insertResult = await supabase
    .from("activity_events")
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
