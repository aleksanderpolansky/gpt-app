import crypto from "crypto";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import { getSupabaseAdminClient } from "../../../../../../lib/supabase/admin";
import { buildC32StableLinkBundle } from "../../../../../../lib/activity/categoryDerivation/c32SemanticPersistenceProofHelpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

const EXPLICIT_LINK_WRITE_CONFIRMATION =
  "CREATE_FIRST_C32_ACTIVITY_VALUE_OBJECT_LINK_NOW";

const SPACE_USER_LINK_COLUMNS = [
  "owner_user_id",
  "app_user_id",
  "user_id",
  "created_by_user_id",
  "created_by",
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

  return typeof fieldValue === "number" ? fieldValue : null;
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

function stableHash(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 24);
}

async function readSessionSafely() {
  let session: unknown = null;
  let sessionReadOk = true;

  try {
    session = await auth0.getSession();
  } catch {
    sessionReadOk = false;
  }

  return {
    session,
    sessionReadOk,
    trustedAuthSubject: readAuthSubjectFromSession(session),
  };
}

async function readJsonBodySafely(request: Request): Promise<JsonRecord> {
  try {
    const value = await request.json();
    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
}

async function mapAppUser(params: {
  supabase: any;
  trustedAuthSubject: string | null;
}) {
  if (!params.trustedAuthSubject) {
    return {
      outcome: "not_attempted_no_session",
      appUserId: null,
      appUserIdSha256Prefix: null,
      rowCount: null,
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
      appUserId: null,
      appUserIdSha256Prefix: null,
      rowCount: null,
      errorCode: error.code ?? "unknown",
      errorMessage: sanitizeErrorMessage(error.message),
    };
  }

  const rows = Array.isArray(data) ? (data as JsonRecord[]) : [];

  if (rows.length === 0) {
    return {
      outcome: "not_found",
      appUserId: null,
      appUserIdSha256Prefix: null,
      rowCount: 0,
      errorCode: null,
      errorMessage: null,
    };
  }

  if (rows.length > 1) {
    return {
      outcome: "duplicate",
      appUserId: null,
      appUserIdSha256Prefix: null,
      rowCount: rows.length,
      errorCode: null,
      errorMessage: null,
    };
  }

  const appUserId = readStringProperty(rows[0], "id");

  return {
    outcome: appUserId ? "mapped" : "query_error",
    appUserId,
    appUserIdSha256Prefix: hashDiagnosticValue(appUserId),
    rowCount: 1,
    errorCode: null,
    errorMessage: appUserId ? null : "Mapped app_users row has no id.",
  };
}

async function resolveSelectedSpace(params: {
  supabase: any;
  appUserId: string | null;
  selectedSpaceIdSha256Prefix: string | null;
}) {
  if (!params.appUserId) {
    return {
      outcome: "not_attempted_no_app_user",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: params.selectedSpaceIdSha256Prefix,
      sourceColumns: [],
      errorCode: null,
      errorMessage: null,
    };
  }

  if (!params.selectedSpaceIdSha256Prefix) {
    return {
      outcome: "missing_selected_space_hash",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: null,
      sourceColumns: [],
      errorCode: null,
      errorMessage: null,
    };
  }

  const matches = new Map<string, { spaceId: string; sourceColumns: string[] }>();

  for (const column of SPACE_USER_LINK_COLUMNS) {
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
  }

  const found = Array.from(matches.values());

  if (found.length === 0) {
    return {
      outcome: "space_not_found",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: params.selectedSpaceIdSha256Prefix,
      sourceColumns: [],
      errorCode: null,
      errorMessage: null,
    };
  }

  if (found.length > 1) {
    return {
      outcome: "multiple_matching_spaces",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: params.selectedSpaceIdSha256Prefix,
      sourceColumns: found.flatMap((item) => item.sourceColumns),
      errorCode: null,
      errorMessage: null,
    };
  }

  return {
    outcome: "resolved_single_space",
    selectedSpaceId: found[0].spaceId,
    selectedSpaceIdSha256Prefix: hashDiagnosticValue(found[0].spaceId),
    sourceColumns: found[0].sourceColumns,
    errorCode: null,
    errorMessage: null,
  };
}

async function resolveActorForSpace(params: {
  supabase: any;
  selectedSpaceId: string | null;
}) {
  if (!params.selectedSpaceId) {
    return {
      outcome: "not_attempted_no_space",
      actorId: null,
      actorIdSha256Prefix: null,
      actorCandidateCount: 0,
      errorCode: null,
      errorMessage: null,
    };
  }

  const { data, error } = await params.supabase
    .from("actor_space_roles")
    .select("actor_id, space_id")
    .eq("space_id", params.selectedSpaceId)
    .limit(20);

  if (error) {
    return {
      outcome: "query_error",
      actorId: null,
      actorIdSha256Prefix: null,
      actorCandidateCount: 0,
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
      actorId: null,
      actorIdSha256Prefix: null,
      actorCandidateCount: 0,
      errorCode: null,
      errorMessage: null,
    };
  }

  if (actorIds.length > 1) {
    return {
      outcome: "multiple_actor_candidates",
      actorId: null,
      actorIdSha256Prefix: null,
      actorCandidateCount: actorIds.length,
      errorCode: null,
      errorMessage: null,
    };
  }

  return {
    outcome: "resolved_single_actor",
    actorId: actorIds[0],
    actorIdSha256Prefix: hashDiagnosticValue(actorIds[0]),
    actorCandidateCount: 1,
    errorCode: null,
    errorMessage: null,
  };
}

async function findActivityEvent(params: {
  supabase: any;
  appUserId: string | null;
  insertedActivityEventIdSha256Prefix: string | null;
}) {
  if (!params.appUserId) {
    return {
      outcome: "missing_app_user",
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
      outcome: "missing_activity_event_hash",
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

  return {
    outcome: "found_single_matching_activity_event",
    activityEventId: id,
    activityEventIdSha256Prefix: hashDiagnosticValue(id),
    title: readStringProperty(match, "title"),
    source: readStringProperty(match, "source"),
    status: readStringProperty(match, "status"),
    durationMinutes: readNumberProperty(match, "duration_minutes"),
    errorCode: null,
    errorMessage: null,
  };
}

async function findExistingValueObject(params: {
  supabase: any;
  appUserId: string | null;
  selectedSpaceId: string | null;
}) {
  if (!params.appUserId || !params.selectedSpaceId) {
    return {
      outcome: "not_attempted_missing_scope",
      existingCount: 0,
      valueObjectId: null,
      valueObjectIdSha256Prefix: null,
      title: null,
      source: null,
      valueType: null,
      status: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  const { data, error } = await params.supabase
    .from("value_objects")
    .select("id, title, source, value_type, status, created_at")
    .eq("app_user_id", params.appUserId)
    .eq("space_id", params.selectedSpaceId)
    .eq("source", "semantic_candidate")
    .eq("title", "Semantic persistence readiness")
    .limit(5);

  if (error) {
    return {
      outcome: "query_error",
      existingCount: 0,
      valueObjectId: null,
      valueObjectIdSha256Prefix: null,
      title: null,
      source: null,
      valueType: null,
      status: null,
      errorCode: error.code ?? "unknown",
      errorMessage: sanitizeErrorMessage(error.message),
    };
  }

  const rows = Array.isArray(data) ? (data as JsonRecord[]) : [];

  if (rows.length === 0) {
    return {
      outcome: "not_found",
      existingCount: 0,
      valueObjectId: null,
      valueObjectIdSha256Prefix: null,
      title: null,
      source: null,
      valueType: null,
      status: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  if (rows.length > 1) {
    return {
      outcome: "multiple_existing_value_objects",
      existingCount: rows.length,
      valueObjectId: null,
      valueObjectIdSha256Prefix: null,
      title: null,
      source: null,
      valueType: null,
      status: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  const row = rows[0];
  const valueObjectId = readStringProperty(row, "id");

  return {
    outcome: "found_single_existing_value_object",
    existingCount: 1,
    valueObjectId,
    valueObjectIdSha256Prefix: hashDiagnosticValue(valueObjectId),
    title: readStringProperty(row, "title"),
    source: readStringProperty(row, "source"),
    valueType: readStringProperty(row, "value_type"),
    status: readStringProperty(row, "status"),
    errorCode: null,
    errorMessage: null,
  };
}

async function findExistingLink(params: {
  supabase: any;
  activityEventId: string | null;
  valueObjectId: string | null;
}) {
  if (!params.activityEventId || !params.valueObjectId) {
    return {
      outcome: "not_attempted_missing_activity_or_value_object",
      existingCount: 0,
      linkId: null,
      linkIdSha256Prefix: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  const { data, error } = await params.supabase
    .from("activity_value_object_links")
    .select("id, activity_event_id, value_object_id, link_type, exposure_type, confidence, created_at")
    .eq("activity_event_id", params.activityEventId)
    .eq("value_object_id", params.valueObjectId)
    .eq("link_type", "semantic_exposure")
    .limit(5);

  if (error) {
    return {
      outcome: "query_error",
      existingCount: 0,
      linkId: null,
      linkIdSha256Prefix: null,
      errorCode: error.code ?? "unknown",
      errorMessage: sanitizeErrorMessage(error.message),
    };
  }

  const rows = Array.isArray(data) ? (data as JsonRecord[]) : [];

  if (rows.length === 0) {
    return {
      outcome: "not_found",
      existingCount: 0,
      linkId: null,
      linkIdSha256Prefix: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  if (rows.length > 1) {
    return {
      outcome: "multiple_existing_links",
      existingCount: rows.length,
      linkId: null,
      linkIdSha256Prefix: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  const linkId = readStringProperty(rows[0], "id");

  return {
    outcome: "found_single_existing_link",
    existingCount: 1,
    linkId,
    linkIdSha256Prefix: hashDiagnosticValue(linkId),
    errorCode: null,
    errorMessage: null,
  };
}

function buildStableLinkBundle(params: {
  activityEventIdSha256Prefix: string | null;
  valueObjectIdSha256Prefix: string | null;
  actorIdSha256Prefix: string | null;
  selectedSpaceIdSha256Prefix: string | null;
}) {
  return buildC32StableLinkBundle(params);
}
function buildReadiness(params: {
  sessionAvailable: boolean;
  appUserMapping: any;
  selectedSpaceResolution: any;
  actorResolution: any;
  activityEventResolution: any;
  valueObjectResolution: any;
  existingLinkResolution: any;
  stableLinkHashMatches: boolean;
}) {
  const checks = {
    browserSessionAvailable: params.sessionAvailable,
    appUserMapped: params.appUserMapping.outcome === "mapped",
    selectedSpaceResolved:
      params.selectedSpaceResolution.outcome === "resolved_single_space",
    actorResolved: params.actorResolution.outcome === "resolved_single_actor",
    activityEventFound:
      params.activityEventResolution.outcome ===
      "found_single_matching_activity_event",
    valueObjectFound:
      params.valueObjectResolution.outcome ===
      "found_single_existing_value_object",
    stableLinkBundleHashConfirmed: params.stableLinkHashMatches === true,
    noDuplicateLinkConflict:
      params.existingLinkResolution.outcome === "not_found" ||
      params.existingLinkResolution.outcome === "found_single_existing_link",
    noValueObjectWritePlanned: true,
    noStateWritePlanned: true,
  };

  return {
    checks,
    passed: Object.values(checks).every((value) => value === true),
  };
}

async function buildRuntimeContext(params: {
  supabase: any;
  trustedAuthSubject: string | null;
  selectedSpaceIdSha256Prefix: string | null;
  insertedActivityEventIdSha256Prefix: string | null;
  sessionAvailable: boolean;
}) {
  const appUserMapping = await mapAppUser({
    supabase: params.supabase,
    trustedAuthSubject: params.trustedAuthSubject,
  });

  const selectedSpaceResolution = await resolveSelectedSpace({
    supabase: params.supabase,
    appUserId: appUserMapping.appUserId,
    selectedSpaceIdSha256Prefix: params.selectedSpaceIdSha256Prefix,
  });

  const actorResolution = await resolveActorForSpace({
    supabase: params.supabase,
    selectedSpaceId: selectedSpaceResolution.selectedSpaceId,
  });

  const activityEventResolution = await findActivityEvent({
    supabase: params.supabase,
    appUserId: appUserMapping.appUserId,
    insertedActivityEventIdSha256Prefix:
      params.insertedActivityEventIdSha256Prefix,
  });

  const valueObjectResolution = await findExistingValueObject({
    supabase: params.supabase,
    appUserId: appUserMapping.appUserId,
    selectedSpaceId: selectedSpaceResolution.selectedSpaceId,
  });

  const existingLinkResolution = await findExistingLink({
    supabase: params.supabase,
    activityEventId: activityEventResolution.activityEventId,
    valueObjectId: valueObjectResolution.valueObjectId,
  });

  const firstLinkBundle = buildStableLinkBundle({
    activityEventIdSha256Prefix:
      activityEventResolution.activityEventIdSha256Prefix,
    valueObjectIdSha256Prefix: valueObjectResolution.valueObjectIdSha256Prefix,
    actorIdSha256Prefix: actorResolution.actorIdSha256Prefix,
    selectedSpaceIdSha256Prefix:
      selectedSpaceResolution.selectedSpaceIdSha256Prefix,
  });

  const secondLinkBundle = buildStableLinkBundle({
    activityEventIdSha256Prefix:
      activityEventResolution.activityEventIdSha256Prefix,
    valueObjectIdSha256Prefix: valueObjectResolution.valueObjectIdSha256Prefix,
    actorIdSha256Prefix: actorResolution.actorIdSha256Prefix,
    selectedSpaceIdSha256Prefix:
      selectedSpaceResolution.selectedSpaceIdSha256Prefix,
  });

  const readiness = buildReadiness({
    sessionAvailable: params.sessionAvailable,
    appUserMapping,
    selectedSpaceResolution,
    actorResolution,
    activityEventResolution,
    valueObjectResolution,
    existingLinkResolution,
    stableLinkHashMatches:
      firstLinkBundle.bundleHash === secondLinkBundle.bundleHash,
  });

  return {
    appUserMapping,
    selectedSpaceResolution,
    actorResolution,
    activityEventResolution,
    valueObjectResolution,
    existingLinkResolution,
    firstLinkBundle,
    secondLinkBundle,
    readiness,
  };
}

function publicContext(context: any) {
  return {
    appUserMapping: {
      outcome: context.appUserMapping.outcome,
      appUserIdSha256Prefix: context.appUserMapping.appUserIdSha256Prefix,
      rowCount: context.appUserMapping.rowCount,
      errorCode: context.appUserMapping.errorCode,
      errorMessage: context.appUserMapping.errorMessage,
    },
    selectedSpaceResolution: {
      outcome: context.selectedSpaceResolution.outcome,
      selectedSpaceIdSha256Prefix:
        context.selectedSpaceResolution.selectedSpaceIdSha256Prefix,
      sourceColumns: context.selectedSpaceResolution.sourceColumns,
      errorCode: context.selectedSpaceResolution.errorCode,
      errorMessage: context.selectedSpaceResolution.errorMessage,
    },
    actorResolution: {
      outcome: context.actorResolution.outcome,
      actorIdSha256Prefix: context.actorResolution.actorIdSha256Prefix,
      actorCandidateCount: context.actorResolution.actorCandidateCount,
      errorCode: context.actorResolution.errorCode,
      errorMessage: context.actorResolution.errorMessage,
    },
    activityEventResolution: {
      outcome: context.activityEventResolution.outcome,
      activityEventIdSha256Prefix:
        context.activityEventResolution.activityEventIdSha256Prefix,
      title: context.activityEventResolution.title,
      source: context.activityEventResolution.source,
      status: context.activityEventResolution.status,
      durationMinutes: context.activityEventResolution.durationMinutes,
      errorCode: context.activityEventResolution.errorCode,
      errorMessage: context.activityEventResolution.errorMessage,
    },
    valueObjectResolution: {
      outcome: context.valueObjectResolution.outcome,
      existingCount: context.valueObjectResolution.existingCount,
      valueObjectIdSha256Prefix:
        context.valueObjectResolution.valueObjectIdSha256Prefix,
      title: context.valueObjectResolution.title,
      source: context.valueObjectResolution.source,
      valueType: context.valueObjectResolution.valueType,
      status: context.valueObjectResolution.status,
      errorCode: context.valueObjectResolution.errorCode,
      errorMessage: context.valueObjectResolution.errorMessage,
    },
    existingLinkResolution: {
      outcome: context.existingLinkResolution.outcome,
      existingCount: context.existingLinkResolution.existingCount,
      linkIdSha256Prefix: context.existingLinkResolution.linkIdSha256Prefix,
      errorCode: context.existingLinkResolution.errorCode,
      errorMessage: context.existingLinkResolution.errorMessage,
    },
    linkBundle: {
      bundleHash: context.firstLinkBundle.bundleHash,
      repeatBundleHash: context.secondLinkBundle.bundleHash,
      stableHashMatches:
        context.firstLinkBundle.bundleHash ===
        context.secondLinkBundle.bundleHash,
      linkCandidate: context.firstLinkBundle.linkCandidate,
    },
    readiness: context.readiness,
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

  const { session, sessionReadOk, trustedAuthSubject } =
    await readSessionSafely();

  const supabase = getSupabaseAdminClient() as any;

  const context = await buildRuntimeContext({
    supabase,
    trustedAuthSubject,
    selectedSpaceIdSha256Prefix,
    insertedActivityEventIdSha256Prefix,
    sessionAvailable: Boolean(session),
  });

  return NextResponse.json({
    ok: true,
    endpoint:
      "/api/activity/semantic/first-activity-value-object-link-write",
    method: "GET",
    policy: "first_activity_value_object_link_explicit_write_gate_v0",
    mode: "readiness_only_no_write",
    explicitLinkWriteConfirmationRequired: EXPLICIT_LINK_WRITE_CONFIRMATION,
    selectedSpaceIdSha256Prefix,
    insertedActivityEventIdSha256Prefix,
    auth0Session: {
      readAttempted: true,
      readOk: sessionReadOk,
      sessionAvailable: Boolean(session),
      trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
      trustedAuthSubjectSha256Prefix: hashDiagnosticValue(trustedAuthSubject),
    },
    result: {
      canAttemptExplicitPost: context.readiness.passed,
      willCreateValueObjectNow: false,
      willCreateStateNow: false,
      note:
        "GET is read-only. First activity_value_object_link can be created only with POST and exact explicitLinkWriteConfirmation.",
    },
    context: publicContext(context),
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
  });
}

export async function POST(request: Request) {
  const body = await readJsonBodySafely(request);

  const selectedSpaceIdSha256Prefix = readStringProperty(
    body,
    "selectedSpaceIdSha256Prefix"
  );

  const insertedActivityEventIdSha256Prefix = readStringProperty(
    body,
    "insertedActivityEventIdSha256Prefix"
  );

  const explicitLinkWriteConfirmation = readStringProperty(
    body,
    "explicitLinkWriteConfirmation"
  );

  const { session, sessionReadOk, trustedAuthSubject } =
    await readSessionSafely();

  const supabase = getSupabaseAdminClient() as any;

  const context = await buildRuntimeContext({
    supabase,
    trustedAuthSubject,
    selectedSpaceIdSha256Prefix,
    insertedActivityEventIdSha256Prefix,
    sessionAvailable: Boolean(session),
  });

  const explicitWriteConfirmed =
    explicitLinkWriteConfirmation === EXPLICIT_LINK_WRITE_CONFIRMATION;

  if (!explicitWriteConfirmed) {
    return NextResponse.json(
      {
        ok: false,
        endpoint:
          "/api/activity/semantic/first-activity-value-object-link-write",
        method: "POST",
        policy: "first_activity_value_object_link_explicit_write_gate_v0",
        mode: "blocked_missing_explicit_confirmation_no_write",
        requiredExplicitLinkWriteConfirmation:
          EXPLICIT_LINK_WRITE_CONFIRMATION,
        receivedExplicitLinkWriteConfirmation: explicitLinkWriteConfirmation,
        auth0Session: {
          readAttempted: true,
          readOk: sessionReadOk,
          sessionAvailable: Boolean(session),
          trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
          trustedAuthSubjectSha256Prefix: hashDiagnosticValue(
            trustedAuthSubject
          ),
        },
        context: publicContext(context),
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
      },
      { status: 400 }
    );
  }

  if (!context.readiness.passed) {
    return NextResponse.json(
      {
        ok: false,
        endpoint:
          "/api/activity/semantic/first-activity-value-object-link-write",
        method: "POST",
        policy: "first_activity_value_object_link_explicit_write_gate_v0",
        mode: "blocked_readiness_failed_no_write",
        auth0Session: {
          readAttempted: true,
          readOk: sessionReadOk,
          sessionAvailable: Boolean(session),
          trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
          trustedAuthSubjectSha256Prefix: hashDiagnosticValue(
            trustedAuthSubject
          ),
        },
        context: publicContext(context),
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
      },
      { status: 409 }
    );
  }

  if (context.existingLinkResolution.outcome === "found_single_existing_link") {
    return NextResponse.json({
      ok: true,
      endpoint:
        "/api/activity/semantic/first-activity-value-object-link-write",
      method: "POST",
      policy: "first_activity_value_object_link_explicit_write_gate_v0",
      mode: "idempotent_existing_link_returned_no_new_write",
      activityValueObjectLinkCreatedNow: false,
      activityValueObjectLinkIdSha256Prefix:
        context.existingLinkResolution.linkIdSha256Prefix,
      context: publicContext(context),
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
    });
  }

  const linkCandidate = context.firstLinkBundle.linkCandidate;

  const insertPayload = {
    activity_event_id: context.activityEventResolution.activityEventId,
    value_object_id: context.valueObjectResolution.valueObjectId,
    actor_id: context.actorResolution.actorId,
    space_id: context.selectedSpaceResolution.selectedSpaceId,
    app_user_id: context.appUserMapping.appUserId,
    organization_id: null,
    link_type: linkCandidate.linkType,
    exposure_type: linkCandidate.exposureType,
    confidence: linkCandidate.confidence,
    evidence: linkCandidate.evidence,
    metadata: {
      ...linkCandidate.metadata,
      createdByPolicy: "first_activity_value_object_link_explicit_write_gate_v0",
      linkBundleHash: context.firstLinkBundle.bundleHash,
    },
  };

  const { data, error } = await supabase
    .from("activity_value_object_links")
    .insert(insertPayload)
    .select("id, activity_event_id, value_object_id, link_type, exposure_type, confidence, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint:
          "/api/activity/semantic/first-activity-value-object-link-write",
        method: "POST",
        policy: "first_activity_value_object_link_explicit_write_gate_v0",
        mode: "insert_failed",
        errorCode: error.code ?? "unknown",
        errorMessage: sanitizeErrorMessage(error.message),
        context: publicContext(context),
        writes: {
          sqlExecuted: false,
          dbReadExecuted: true,
          dbWriteExecuted: false,
          supabaseReadExecuted: true,
          supabaseWriteExecuted: true,
          activityEventInserted: false,
          valueObjectCreated: false,
          activityValueObjectLinkCreated: false,
          stateDeltaCreated: false,
          stateFactCreated: false,
          stateSnapshotCreated: false,
        },
      },
      { status: 500 }
    );
  }

  const insertedLinkId = readStringProperty(data, "id");

  return NextResponse.json({
    ok: true,
    endpoint:
      "/api/activity/semantic/first-activity-value-object-link-write",
    method: "POST",
    policy: "first_activity_value_object_link_explicit_write_gate_v0",
    mode: "first_activity_value_object_link_created_no_value_object_no_state",
    activityValueObjectLinkCreatedNow: true,
    activityValueObjectLinkIdSha256Prefix:
      hashDiagnosticValue(insertedLinkId),
    insertedActivityValueObjectLink: {
      idSha256Prefix: hashDiagnosticValue(insertedLinkId),
      linkType: readStringProperty(data, "link_type"),
      exposureType: readStringProperty(data, "exposure_type"),
      confidence: readNumberProperty(data, "confidence"),
    },
    context: publicContext(context),
    writes: {
      sqlExecuted: false,
      dbReadExecuted: true,
      dbWriteExecuted: true,
      supabaseReadExecuted: true,
      supabaseWriteExecuted: true,
      activityEventInserted: false,
      valueObjectCreated: false,
      activityValueObjectLinkCreated: true,
      stateDeltaCreated: false,
      stateFactCreated: false,
      stateSnapshotCreated: false,
    },
    next: "C32 final verification and transfer report can be prepared.",
  });
}


