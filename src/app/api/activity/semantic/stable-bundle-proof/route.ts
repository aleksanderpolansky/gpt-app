import crypto from "crypto";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import { getSupabaseAdminClient } from "../../../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

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

  const activityEventResolution = await findActivityEvent({
    supabase,
    appUserId: appUserMapping.appUserId,
    insertedActivityEventIdSha256Prefix,
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

  const categories =
    firstBundle.bundle.valueObjectCandidate.semanticSignature
      .controlledCategories;

  const categoryRoles = new Set(categories.map((category) => category.role));

  const checks = {
    browserSessionAvailable: Boolean(session),
    appUserMapped: appUserMapping.outcome === "mapped",
    selectedSpaceResolved:
      selectedSpaceResolution.outcome === "resolved_single_space",
    actorResolved: actorResolution.outcome === "resolved_single_actor",
    activityEventFound:
      activityEventResolution.outcome ===
      "found_single_matching_activity_event",
    deterministicBundleHashStable:
      firstBundle.bundleHash === secondBundle.bundleHash,
    bundleHasAtLeastFiveControlledCategories: categories.length >= 5,
    bundleHasObjectRole: categoryRoles.has("object"),
    bundleHasPurposeRole: categoryRoles.has("purpose"),
    bundleHasResponsibilityRole: categoryRoles.has("responsibility"),
    bundleHasScopeRole: categoryRoles.has("scope"),
    externalConceptCandidatesEmpty:
      firstBundle.bundle.valueObjectCandidate.semanticSignature
        .externalConceptCandidates.length === 0,
    unknownTermCandidatesEmpty:
      firstBundle.bundle.valueObjectCandidate.semanticSignature
        .unknownTermCandidates.length === 0,
    noStateFactsDeltasOrSnapshots:
      firstBundle.bundle.valueObjectCandidate.semanticSignature.safetyRules
        .noStateFactsDeltasOrSnapshots === true,
    stateHooksAreHookOnly:
      firstBundle.bundle.valueObjectCandidate.semanticSignature.stateHooks.every(
        (hook) =>
          hook.hookOnly === true &&
          hook.createsStateFact === false &&
          hook.createsStateDelta === false &&
          hook.createsStateSnapshot === false
      ),
    notSingleWordValueObject:
      firstBundle.bundle.valueObjectCandidate.title.trim().split(/\s+/).length >
      1,
    futurePersonalScopePlanAvailable:
      firstBundle.bundle.valueObjectCandidate.futureInsertScopePlan.actor_id ===
        "resolved_actor_id" &&
      firstBundle.bundle.valueObjectCandidate.futureInsertScopePlan.space_id ===
        "resolved_space_id" &&
      firstBundle.bundle.valueObjectCandidate.futureInsertScopePlan.app_user_id ===
        "mapped_app_user_id" &&
      firstBundle.bundle.valueObjectCandidate.futureInsertScopePlan
        .owner_user_id === "mapped_app_user_id",
    noDbWrite: true,
  };

  const passed = Object.values(checks).every((value) => value === true);

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/semantic/stable-bundle-proof",
    policy: "stable_semantic_bundle_proof_v0",
    mode: "read_only_deterministic_semantic_bundle_no_write",
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
      appUserIdSha256Prefix: appUserMapping.appUserIdSha256Prefix,
      rowCount: appUserMapping.rowCount,
      errorCode: appUserMapping.errorCode,
      errorMessage: appUserMapping.errorMessage,
    },
    selectedSpaceResolution: {
      outcome: selectedSpaceResolution.outcome,
      selectedSpaceIdSha256Prefix:
        selectedSpaceResolution.selectedSpaceIdSha256Prefix,
      sourceColumns: selectedSpaceResolution.sourceColumns,
      errorCode: selectedSpaceResolution.errorCode,
      errorMessage: selectedSpaceResolution.errorMessage,
    },
    actorResolution: {
      outcome: actorResolution.outcome,
      actorIdSha256Prefix: actorResolution.actorIdSha256Prefix,
      actorCandidateCount: actorResolution.actorCandidateCount,
      errorCode: actorResolution.errorCode,
      errorMessage: actorResolution.errorMessage,
    },
    activityEventResolution: {
      outcome: activityEventResolution.outcome,
      activityEventIdSha256Prefix:
        activityEventResolution.activityEventIdSha256Prefix,
      title: activityEventResolution.title,
      source: activityEventResolution.source,
      status: activityEventResolution.status,
      durationMinutes: activityEventResolution.durationMinutes,
      errorCode: activityEventResolution.errorCode,
      errorMessage: activityEventResolution.errorMessage,
    },
    result: {
      passed,
      checks,
      bundleHash: firstBundle.bundleHash,
      repeatBundleHash: secondBundle.bundleHash,
      stableHashMatches: firstBundle.bundleHash === secondBundle.bundleHash,
      controlledCategoryCount: categories.length,
      controlledCategoryRoles: Array.from(categoryRoles),
      bundle: firstBundle.bundle,
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
    next: passed
      ? "C32-D/E explicit first VO write route can be prepared."
      : "Stop: stable semantic bundle proof did not pass.",
  });
}
