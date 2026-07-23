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

const EXPLICIT_WRITE_CONFIRMATION = "CREATE_FIRST_C32_VALUE_OBJECT_NOW";

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
  trustedAuthSubject: string | null;
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

  if (!params.trustedAuthSubject) {
    return {
      outcome: "not_attempted_no_session",
      actorId: null,
      actorIdSha256Prefix: null,
      actorCandidateCount: 0,
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
        actorId: null,
        actorIdSha256Prefix: null,
        actorCandidateCount: 0,
        errorCode: actorRoleError?.code ?? null,
        errorMessage: actorRoleError
          ? sanitizeErrorMessage(actorRoleError.message)
          : null,
      };
    }

    return {
      outcome: "resolved_single_actor",
      actorId: actorContext.actorId,
      actorIdSha256Prefix: hashDiagnosticValue(actorContext.actorId),
      actorCandidateCount: 1,
      errorCode: null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      outcome: "actor_context_error",
      actorId: null,
      actorIdSha256Prefix: null,
      actorCandidateCount: 0,
      errorCode:
        error instanceof ActorContextError ? error.code : "unknown",
      errorMessage: sanitizeErrorMessage(
        error instanceof Error ? error.message : "Actor context failed"
      ),
    };
  }
}

async function findActivityEvent(params: {
  supabase: any;
  appUserId: string | null;
  actorId: string | null;
  insertedActivityEventIdSha256Prefix: string | null;
}) {
  if (!params.appUserId || !params.actorId) {
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
    .eq("acting_as_actor_id", params.actorId)
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

function buildStableSemanticBundle(params: {
  appUserIdSha256Prefix: string | null;
  selectedSpaceIdSha256Prefix: string | null;
  actorIdSha256Prefix: string | null;
  activityEventIdSha256Prefix: string | null;
  activityEventTitle: string | null;
}) {
  const semanticSignature = {
    version: "semantic_signature_v0",
    derivationPolicy: "deterministic_controlled_bundle_no_ai_write_v0",
    sourceActivityEventHash: params.activityEventIdSha256Prefix,
    sourceActivityEventTitle: params.activityEventTitle,
    objectCandidate: {
      title: "Semantic persistence readiness",
      language: "en",
      titleSource: "controlled_bundle_not_single_word",
      description:
        "Readiness object for semantic persistence gates: activity event, unified value object, and activity-to-value-object exposure link.",
    },
    controlledCategories: [
      {
        key: "software_development",
        role: "domain",
        layer: "context",
        source: "internal_controlled_category",
        confidence: 1,
      },
      {
        key: "semantic_persistence",
        role: "object",
        layer: "work_target",
        source: "internal_controlled_category",
        confidence: 1,
      },
      {
        key: "value_object_readiness",
        role: "purpose",
        layer: "implementation_goal",
        source: "internal_controlled_category",
        confidence: 1,
      },
      {
        key: "quality_gate",
        role: "responsibility",
        layer: "verification",
        source: "internal_controlled_category",
        confidence: 1,
      },
      {
        key: "personal_workspace",
        role: "scope",
        layer: "actor_space_context",
        source: "runtime_scope_resolution",
        confidence: 1,
      },
    ],
    roleDutyCarePurpose: {
      role: "system_builder",
      duty: "schema_and_runtime_safety_verification",
      careFunction: "protect_user_data_and_prevent_wrong_scope_write",
      purpose: "prepare_safe_first_personal_value_object_write",
    },
    externalConceptCandidates: [],
    unknownTermCandidates: [],
    stateHooks: [
      {
        key: "implementation_readiness_signal",
        hookOnly: true,
        createsStateFact: false,
        createsStateDelta: false,
        createsStateSnapshot: false,
      },
    ],
    safetyRules: {
      externalConceptIsNotInternalCategory: true,
      categoryDoesNotCreateStateFact: true,
      stateHookDoesNotCreateStateFact: true,
      noStateFactsDeltasOrSnapshots: true,
      valueObjectIsUnifiedNoHardSubtype: true,
      activityEventRemainsSourceOfTruth: true,
      notSingleWordValueObject: true,
    },
    scopeHashes: {
      appUserIdSha256Prefix: params.appUserIdSha256Prefix,
      selectedSpaceIdSha256Prefix: params.selectedSpaceIdSha256Prefix,
      actorIdSha256Prefix: params.actorIdSha256Prefix,
      organizationIdSha256Prefix: null,
    },
  };

  const valueObjectCandidate = {
    title: semanticSignature.objectCandidate.title,
    description: semanticSignature.objectCandidate.description,
    status: "candidate",
    visibility: "private",
    source: "semantic_candidate",
    semanticSignature,
    futureInsertScopePlan: {
      actor_id: "resolved_actor_id",
      space_id: "resolved_space_id",
      app_user_id: "mapped_app_user_id",
      owner_user_id: "mapped_app_user_id",
      organization_id: null,
    },
  };

  const linkCandidate = {
    linkType: "semantic_exposure",
    exposureType: "primary_subject",
    confidence: 1,
    evidence: {
      activityEventIdSha256Prefix: params.activityEventIdSha256Prefix,
      bundlePolicy: semanticSignature.derivationPolicy,
      controlledCategoryKeys: semanticSignature.controlledCategories.map(
        (category) => category.key
      ),
    },
  };

  const bundle = {
    version: "stable_semantic_bundle_v0",
    valueObjectCandidate,
    linkCandidate,
  };

  return {
    bundle,
    bundleHash: stableHash(bundle),
  };
}

async function findExistingValueObject(params: {
  supabase: any;
  appUserId: string | null;
  actorId: string | null;
  selectedSpaceId: string | null;
  valueObjectTitle: string;
}) {
  if (!params.appUserId || !params.actorId || !params.selectedSpaceId) {
    return {
      outcome: "not_attempted_missing_scope",
      existingCount: 0,
      existingValueObjectId: null,
      existingValueObjectIdSha256Prefix: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  const { data, error } = await params.supabase
    .from("value_objects")
    .select("id, title, source, value_type, status, created_at")
    .eq("owner_user_id", params.appUserId)
    .eq("owner_actor_id", params.actorId)
    .eq("app_user_id", params.appUserId)
    .eq("space_id", params.selectedSpaceId)
    .eq("source", "semantic_candidate")
    .eq("title", params.valueObjectTitle)
    .limit(5);

  if (error) {
    return {
      outcome: "query_error",
      existingCount: 0,
      existingValueObjectId: null,
      existingValueObjectIdSha256Prefix: null,
      errorCode: error.code ?? "unknown",
      errorMessage: sanitizeErrorMessage(error.message),
    };
  }

  const rows = Array.isArray(data) ? (data as JsonRecord[]) : [];

  if (rows.length === 0) {
    return {
      outcome: "not_found",
      existingCount: 0,
      existingValueObjectId: null,
      existingValueObjectIdSha256Prefix: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  if (rows.length > 1) {
    return {
      outcome: "multiple_existing_candidates",
      existingCount: rows.length,
      existingValueObjectId: null,
      existingValueObjectIdSha256Prefix: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  const existingValueObjectId = readStringProperty(rows[0], "id");

  return {
    outcome: "found_single_existing_value_object",
    existingCount: 1,
    existingValueObjectId,
    existingValueObjectIdSha256Prefix: hashDiagnosticValue(
      existingValueObjectId
    ),
    errorCode: null,
    errorMessage: null,
  };
}

function buildChecks(params: {
  sessionAvailable: boolean;
  appUserMapping: any;
  selectedSpaceResolution: any;
  actorResolution: any;
  activityEventResolution: any;
  stableHashMatches: boolean;
  existingValueObjectResolution: any;
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
    stableSemanticBundleHashConfirmed: params.stableHashMatches === true,
    noDuplicateConflict:
      params.existingValueObjectResolution.outcome === "not_found" ||
      params.existingValueObjectResolution.outcome ===
        "found_single_existing_value_object",
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
    trustedAuthSubject: params.trustedAuthSubject,
  });

  const activityEventResolution = await findActivityEvent({
    supabase: params.supabase,
    appUserId: appUserMapping.appUserId,
    actorId: actorResolution.actorId,
    insertedActivityEventIdSha256Prefix:
      params.insertedActivityEventIdSha256Prefix,
  });

  const firstBundle = buildStableSemanticBundle({
    appUserIdSha256Prefix: appUserMapping.appUserIdSha256Prefix,
    selectedSpaceIdSha256Prefix:
      selectedSpaceResolution.selectedSpaceIdSha256Prefix,
    actorIdSha256Prefix: actorResolution.actorIdSha256Prefix,
    activityEventIdSha256Prefix:
      activityEventResolution.activityEventIdSha256Prefix,
    activityEventTitle: activityEventResolution.title,
  });

  const secondBundle = buildStableSemanticBundle({
    appUserIdSha256Prefix: appUserMapping.appUserIdSha256Prefix,
    selectedSpaceIdSha256Prefix:
      selectedSpaceResolution.selectedSpaceIdSha256Prefix,
    actorIdSha256Prefix: actorResolution.actorIdSha256Prefix,
    activityEventIdSha256Prefix:
      activityEventResolution.activityEventIdSha256Prefix,
    activityEventTitle: activityEventResolution.title,
  });

  const existingValueObjectResolution = await findExistingValueObject({
    supabase: params.supabase,
    appUserId: appUserMapping.appUserId,
    actorId: actorResolution.actorId,
    selectedSpaceId: selectedSpaceResolution.selectedSpaceId,
    valueObjectTitle: firstBundle.bundle.valueObjectCandidate.title,
  });

  const readiness = buildChecks({
    sessionAvailable: params.sessionAvailable,
    appUserMapping,
    selectedSpaceResolution,
    actorResolution,
    activityEventResolution,
    stableHashMatches: firstBundle.bundleHash === secondBundle.bundleHash,
    existingValueObjectResolution,
  });

  return {
    appUserMapping,
    selectedSpaceResolution,
    actorResolution,
    activityEventResolution,
    firstBundle,
    secondBundle,
    existingValueObjectResolution,
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
    existingValueObjectResolution: {
      outcome: context.existingValueObjectResolution.outcome,
      existingCount: context.existingValueObjectResolution.existingCount,
      existingValueObjectIdSha256Prefix:
        context.existingValueObjectResolution.existingValueObjectIdSha256Prefix,
      errorCode: context.existingValueObjectResolution.errorCode,
      errorMessage: context.existingValueObjectResolution.errorMessage,
    },
    semanticBundle: {
      bundleHash: context.firstBundle.bundleHash,
      repeatBundleHash: context.secondBundle.bundleHash,
      stableHashMatches:
        context.firstBundle.bundleHash === context.secondBundle.bundleHash,
      valueObjectCandidate: context.firstBundle.bundle.valueObjectCandidate,
      linkCandidate: context.firstBundle.bundle.linkCandidate,
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
    endpoint: "/api/activity/semantic/first-value-object-write",
    method: "GET",
    policy: "first_value_object_explicit_write_gate_v0",
    mode: "readiness_only_no_write",
    explicitWriteConfirmationRequired: EXPLICIT_WRITE_CONFIRMATION,
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
      willCreateLinkNow: false,
      willCreateStateNow: false,
      note:
        "GET is read-only. First Value Object can be created only with POST and exact explicitWriteConfirmation.",
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

  const explicitWriteConfirmation = readStringProperty(
    body,
    "explicitWriteConfirmation"
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
    explicitWriteConfirmation === EXPLICIT_WRITE_CONFIRMATION;

  if (!explicitWriteConfirmed) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: "/api/activity/semantic/first-value-object-write",
        method: "POST",
        policy: "first_value_object_explicit_write_gate_v0",
        mode: "blocked_missing_explicit_confirmation_no_write",
        requiredExplicitWriteConfirmation: EXPLICIT_WRITE_CONFIRMATION,
        receivedExplicitWriteConfirmation: explicitWriteConfirmation,
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
        endpoint: "/api/activity/semantic/first-value-object-write",
        method: "POST",
        policy: "first_value_object_explicit_write_gate_v0",
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

  if (
    context.existingValueObjectResolution.outcome ===
    "found_single_existing_value_object"
  ) {
    return NextResponse.json({
      ok: true,
      endpoint: "/api/activity/semantic/first-value-object-write",
      method: "POST",
      policy: "first_value_object_explicit_write_gate_v0",
      mode: "idempotent_existing_value_object_returned_no_new_write",
      valueObjectCreatedNow: false,
      valueObjectIdSha256Prefix:
        context.existingValueObjectResolution.existingValueObjectIdSha256Prefix,
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

  const valueObjectCandidate =
    context.firstBundle.bundle.valueObjectCandidate;

  const insertPayload = {
    title: valueObjectCandidate.title,
    description: valueObjectCandidate.description,
    status: valueObjectCandidate.status,
    visibility: valueObjectCandidate.visibility,
    source: valueObjectCandidate.source,
    value_type: "personal_development",
    semantic_signature: valueObjectCandidate.semanticSignature,
    metadata: {
      createdByPolicy: "first_value_object_explicit_write_gate_v0",
      bundleHash: context.firstBundle.bundleHash,
      sourceActivityEventIdSha256Prefix:
        context.activityEventResolution.activityEventIdSha256Prefix,
      createsActivityValueObjectLinkNow: false,
      createsStateNow: false,
    },
    actor_id: context.actorResolution.actorId,
    owner_actor_id: context.actorResolution.actorId,
    created_by_actor_id: context.actorResolution.actorId,
    space_id: context.selectedSpaceResolution.selectedSpaceId,
    app_user_id: context.appUserMapping.appUserId,
    owner_user_id: context.appUserMapping.appUserId,
    organization_id: null,
  };

  const { data, error } = await supabase
    .from("value_objects")
    .insert(insertPayload)
    .select("id, title, source, value_type, status, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: "/api/activity/semantic/first-value-object-write",
        method: "POST",
        policy: "first_value_object_explicit_write_gate_v0",
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

  const insertedValueObjectId = readStringProperty(data, "id");

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/semantic/first-value-object-write",
    method: "POST",
    policy: "first_value_object_explicit_write_gate_v0",
    mode: "first_value_object_created_no_link_no_state",
    valueObjectCreatedNow: true,
    valueObjectIdSha256Prefix: hashDiagnosticValue(insertedValueObjectId),
    insertedValueObject: {
      idSha256Prefix: hashDiagnosticValue(insertedValueObjectId),
      title: readStringProperty(data, "title"),
      source: readStringProperty(data, "source"),
      valueType: readStringProperty(data, "value_type"),
      status: readStringProperty(data, "status"),
    },
    context: publicContext(context),
    writes: {
      sqlExecuted: false,
      dbReadExecuted: true,
      dbWriteExecuted: true,
      supabaseReadExecuted: true,
      supabaseWriteExecuted: true,
      activityEventInserted: false,
      valueObjectCreated: true,
      activityValueObjectLinkCreated: false,
      stateDeltaCreated: false,
      stateFactCreated: false,
      stateSnapshotCreated: false,
    },
    next: "C32-H/I can prepare first activity_value_object_links write gate.",
  });
}
