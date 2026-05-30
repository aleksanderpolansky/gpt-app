import crypto from "crypto";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../../../../lib/auth0";
import { getSupabaseAdminClient } from "../../../../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

const SPACE_USER_LINK_COLUMNS = [
  "app_user_id",
  "user_id",
  "owner_user_id",
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

async function mapAppUser(params: {
  supabase: any;
  trustedAuthSubject: string | null;
}): Promise<{
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
}> {
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
}): Promise<{
  outcome:
    | "not_attempted_no_app_user"
    | "missing_selected_space_scope"
    | "resolved_single_space"
    | "space_not_found"
    | "multiple_matching_spaces";
  selectedSpaceId: string | null;
  selectedSpaceIdSha256Prefix: string | null;
  selectedSpaceOrganizationIdSha256Prefix: string | null;
  matchCount: number | null;
  sourceColumns: string[];
}> {
  if (!params.appUserId) {
    return {
      outcome: "not_attempted_no_app_user",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: params.selectedSpaceIdSha256Prefix,
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
      selectedSpaceOrganizationIdSha256Prefix: null,
      matchCount: null,
      sourceColumns: [],
    };
  }

  const matches = new Map<
    string,
    {
      spaceId: string;
      organizationId: string | null;
      sourceColumns: string[];
    }
  >();

  for (const column of SPACE_USER_LINK_COLUMNS) {
    try {
      const { data, error } = await params.supabase
        .from("spaces")
        .select("id, organization_id")
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
}): Promise<{
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
}> {
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
}): Promise<{
  outcome:
    | "missing_app_user"
    | "missing_inserted_hash"
    | "found_single_matching_activity_event"
    | "not_found"
    | "multiple_matching_activity_events"
    | "query_error";
  candidateCount: number | null;
  matchedActivityEventIdSha256Prefix: string | null;
  latestCandidateCreatedAt: string | null;
  title: string | null;
  source: string | null;
  status: string | null;
  durationMinutes: number | null;
  errorCode: string | null;
  errorMessage: string | null;
}> {
  if (!params.appUserId) {
    return {
      outcome: "missing_app_user",
      candidateCount: null,
      matchedActivityEventIdSha256Prefix: null,
      latestCandidateCreatedAt: null,
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
      matchedActivityEventIdSha256Prefix: null,
      latestCandidateCreatedAt: null,
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
    .select("id, user_id, title, input_text, source, status, duration_minutes, created_at, updated_at")
    .eq("user_id", params.appUserId)
    .eq("source", "chat_ai")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return {
      outcome: "query_error",
      candidateCount: null,
      matchedActivityEventIdSha256Prefix: null,
      latestCandidateCreatedAt: null,
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
      matchedActivityEventIdSha256Prefix: null,
      latestCandidateCreatedAt: readStringProperty(rows[0], "created_at"),
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
      matchedActivityEventIdSha256Prefix: params.insertedActivityEventIdSha256Prefix,
      latestCandidateCreatedAt: readStringProperty(matches[0], "created_at"),
      title: null,
      source: null,
      status: null,
      durationMinutes: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  const match = matches[0];
  const duration = match.duration_minutes;

  return {
    outcome: "found_single_matching_activity_event",
    candidateCount: 1,
    matchedActivityEventIdSha256Prefix: hashDiagnosticValue(
      readStringProperty(match, "id")
    ),
    latestCandidateCreatedAt: readStringProperty(match, "created_at"),
    title: readStringProperty(match, "title"),
    source: readStringProperty(match, "source"),
    status: readStringProperty(match, "status"),
    durationMinutes: typeof duration === "number" ? duration : null,
    errorCode: null,
    errorMessage: null,
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

  const appUserMapping = await mapAppUser({
    supabase,
    trustedAuthSubject,
  });

  const selectedSpaceResolution = await resolveSelectedSpace({
    supabase,
    appUserId: appUserMapping.appUserId,
    selectedSpaceIdSha256Prefix,
  });

  const actorResolution = await resolveActorForSpace({
    supabase,
    selectedSpaceId: selectedSpaceResolution.selectedSpaceId,
  });

  const insertedActivityEventResolution = await findInsertedActivityEvent({
    supabase,
    appUserId: appUserMapping.appUserId,
    insertedActivityEventIdSha256Prefix,
  });

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

  if (
    insertedActivityEventResolution.outcome !==
    "found_single_matching_activity_event"
  ) {
    blockers.push("inserted_activity_event_not_found_for_app_user");
  } else {
    positiveSignals.push("inserted_activity_event_found_for_app_user");
  }

  const verificationPassed = blockers.length === 0;

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/semantic/first-persistence-write/verify",
    policy: "first_semantic_activity_event_verification_v0",
    mode: "read_only_verify_first_semantic_activity_event",
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
    actorResolution,
    insertedActivityEventResolution,
    verificationDecision: {
      verificationPassed,
      blockers,
      positiveSignals,
      verifiedScope:
        "Auth0 session -> app_user -> selected space -> single actor -> activity_events.user_id -> inserted activity_event hash",
      directActorOrSpaceColumnsOnActivityEventsAvailable: false,
      note:
        "Current activity_events table does not expose actor_id/space_id columns, so verification is user_id-scoped with selected-space and actor readiness context.",
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
    next: verificationPassed
      ? "C31 can be fixed as complete for first semantic activity_events persistence. Next step may add value-object/link persistence gate."
      : "Stop and inspect verification blockers before any further semantic writes.",
  });
}
