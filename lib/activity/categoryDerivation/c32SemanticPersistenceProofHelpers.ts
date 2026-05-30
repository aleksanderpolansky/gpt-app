import crypto from "crypto";

export type C32JsonRecord = Record<string, unknown>;

export type C32SupabaseLike = {
  from: (tableName: string) => any;
};

export type C32ReadSessionPublicSnapshot = {
  readAttempted: true;
  readOk: boolean;
  sessionAvailable: boolean;
  trustedAuthSubjectPresent: boolean;
  trustedAuthSubjectSha256Prefix: string | null;
};

export type C32AppUserMapping =
  | {
      outcome: "not_attempted_missing_auth_subject";
      appUserId: null;
      appUserIdSha256Prefix: null;
      rowCount: 0;
      errorCode: null;
      errorMessage: null;
    }
  | {
      outcome: "query_error";
      appUserId: null;
      appUserIdSha256Prefix: null;
      rowCount: 0;
      errorCode: string;
      errorMessage: string | null;
    }
  | {
      outcome: "not_found";
      appUserId: null;
      appUserIdSha256Prefix: null;
      rowCount: 0;
      errorCode: null;
      errorMessage: null;
    }
  | {
      outcome: "multiple_matches";
      appUserId: null;
      appUserIdSha256Prefix: null;
      rowCount: number;
      errorCode: null;
      errorMessage: null;
    }
  | {
      outcome: "mapped";
      appUserId: string | null;
      appUserIdSha256Prefix: string | null;
      rowCount: 1;
      errorCode: null;
      errorMessage: null;
    };

export type C32SelectedSpaceResolution =
  | {
      outcome: "not_attempted_missing_app_user_or_space_hash";
      selectedSpaceId: null;
      selectedSpaceIdSha256Prefix: null;
      sourceColumns: string[];
      errorCode: null;
      errorMessage: null;
    }
  | {
      outcome: "query_error";
      selectedSpaceId: null;
      selectedSpaceIdSha256Prefix: null;
      sourceColumns: string[];
      errorCode: string;
      errorMessage: string | null;
    }
  | {
      outcome: "not_found";
      selectedSpaceId: null;
      selectedSpaceIdSha256Prefix: null;
      sourceColumns: string[];
      errorCode: null;
      errorMessage: null;
    }
  | {
      outcome: "multiple_matching_spaces";
      selectedSpaceId: null;
      selectedSpaceIdSha256Prefix: null;
      sourceColumns: string[];
      errorCode: null;
      errorMessage: null;
    }
  | {
      outcome: "resolved_single_space";
      selectedSpaceId: string | null;
      selectedSpaceIdSha256Prefix: string | null;
      sourceColumns: string[];
      errorCode: null;
      errorMessage: null;
    };

export type C32ActorResolution =
  | {
      outcome: "not_attempted_missing_space";
      actorId: null;
      actorIdSha256Prefix: null;
      actorCandidateCount: 0;
      errorCode: null;
      errorMessage: null;
    }
  | {
      outcome: "query_error";
      actorId: null;
      actorIdSha256Prefix: null;
      actorCandidateCount: 0;
      errorCode: string;
      errorMessage: string | null;
    }
  | {
      outcome: "not_found";
      actorId: null;
      actorIdSha256Prefix: null;
      actorCandidateCount: 0;
      errorCode: null;
      errorMessage: null;
    }
  | {
      outcome: "multiple_actors_for_space";
      actorId: null;
      actorIdSha256Prefix: null;
      actorCandidateCount: number;
      errorCode: null;
      errorMessage: null;
    }
  | {
      outcome: "resolved_single_actor";
      actorId: string | null;
      actorIdSha256Prefix: string | null;
      actorCandidateCount: 1;
      errorCode: null;
      errorMessage: null;
    };

export type C32ActivityEventResolution =
  | {
      outcome:
        | "not_attempted_missing_app_user_or_activity_hash"
        | "not_found"
        | "multiple_matching_activity_events";
      matchCount: number;
      activityEventId: null;
      activityEventIdSha256Prefix: null;
      title: null;
      source: null;
      status: null;
      durationMinutes: null;
      errorCode: null;
      errorMessage: null;
    }
  | {
      outcome: "query_error";
      matchCount: 0;
      activityEventId: null;
      activityEventIdSha256Prefix: null;
      title: null;
      source: null;
      status: null;
      durationMinutes: null;
      errorCode: string;
      errorMessage: string | null;
    }
  | {
      outcome: "found_single_matching_activity_event";
      matchCount: 1;
      activityEventId: string | null;
      activityEventIdSha256Prefix: string | null;
      title: string | null;
      source: string | null;
      status: string | null;
      durationMinutes: number | null;
      errorCode: null;
      errorMessage: null;
    };

export type C32ValueObjectResolution =
  | {
      outcome:
        | "not_attempted_missing_scope"
        | "not_found"
        | "multiple_existing_value_objects";
      existingCount: number;
      valueObjectId: null;
      valueObjectIdSha256Prefix: null;
      title: null;
      source: null;
      valueType: null;
      status: null;
      errorCode: null;
      errorMessage: null;
    }
  | {
      outcome: "query_error";
      existingCount: 0;
      valueObjectId: null;
      valueObjectIdSha256Prefix: null;
      title: null;
      source: null;
      valueType: null;
      status: null;
      errorCode: string;
      errorMessage: string | null;
    }
  | {
      outcome: "found_single_existing_value_object";
      existingCount: 1;
      valueObjectId: string | null;
      valueObjectIdSha256Prefix: string | null;
      title: string | null;
      source: string | null;
      valueType: string | null;
      status: string | null;
      errorCode: null;
      errorMessage: null;
    };

export type C32LinkResolution =
  | {
      outcome:
        | "not_attempted_missing_activity_or_value_object"
        | "not_found"
        | "multiple_existing_links";
      existingCount: number;
      linkId: null;
      linkIdSha256Prefix: null;
      errorCode: null;
      errorMessage: null;
    }
  | {
      outcome: "query_error";
      existingCount: 0;
      linkId: null;
      linkIdSha256Prefix: null;
      errorCode: string;
      errorMessage: string | null;
    }
  | {
      outcome: "found_single_existing_link";
      existingCount: 1;
      linkId: string | null;
      linkIdSha256Prefix: string | null;
      errorCode: null;
      errorMessage: null;
    };

export type C32StableSemanticBundle = {
  semanticBundle: {
    schemaVersion: "c32-first-value-object-semantic-bundle-v0";
    stablePolicy: "first_value_object_explicit_write_gate_v0";
    categories: Array<{
      canonicalSlug: string;
      semanticLayer: string;
      role: string;
      confidence: number;
      status: "confirmed_for_probe";
    }>;
    valueObjectCandidate: {
      title: "Semantic persistence readiness";
      source: "semantic_candidate";
      valueType: "personal_development";
      status: "candidate";
      visibility: "private";
    };
    evidence: {
      activityEventIdSha256Prefix: string | null;
      actorIdSha256Prefix: string | null;
      selectedSpaceIdSha256Prefix: string | null;
      reason: string;
      noStateFactCreated: true;
      noStateDeltaCreated: true;
      noStateSnapshotCreated: true;
    };
    metadata: {
      source: "c32_first_value_object_gate";
      activityEventRemainsSourceOfTruth: true;
      valueObjectIsUnifiedNoHardSubtype: true;
      categoryDoesNotCreateStateFact: true;
      createsStateNow: false;
    };
  };
  bundleHash: string;
};

export type C32StableLinkBundle = {
  linkCandidate: {
    linkType: "semantic_exposure";
    exposureType: "primary_subject";
    confidence: 1;
    evidence: {
      policy: "first_activity_value_object_link_explicit_write_gate_v0";
      activityEventIdSha256Prefix: string | null;
      valueObjectIdSha256Prefix: string | null;
      actorIdSha256Prefix: string | null;
      selectedSpaceIdSha256Prefix: string | null;
      reason: string;
      noStateFactCreated: true;
      noStateDeltaCreated: true;
      noStateSnapshotCreated: true;
    };
    metadata: {
      source: "c32_first_activity_value_object_link_gate";
      activityEventRemainsSourceOfTruth: true;
      valueObjectIsUnifiedNoHardSubtype: true;
      categoryDoesNotCreateStateFact: true;
      createsStateNow: false;
      createsValueObjectNow: false;
    };
  };
  bundleHash: string;
};

export type C32ValueObjectInsertPayload = {
  title: "Semantic persistence readiness";
  source: "semantic_candidate";
  value_type: "personal_development";
  status: "candidate";
  actor_id: string | null;
  space_id: string | null;
  app_user_id: string | null;
  owner_user_id: string | null;
  organization_id: null;
  visibility: "private";
  semantic_signature: C32StableSemanticBundle["semanticBundle"];
  metadata: C32StableSemanticBundle["semanticBundle"]["metadata"] & {
    createdByPolicy: "first_value_object_explicit_write_gate_v0";
    semanticBundleHash: string;
  };
};

export type C32ActivityValueObjectLinkInsertPayload = {
  activity_event_id: string | null;
  value_object_id: string | null;
  actor_id: string | null;
  space_id: string | null;
  app_user_id: string | null;
  organization_id: null;
  link_type: "semantic_exposure";
  exposure_type: "primary_subject";
  confidence: 1;
  evidence: C32StableLinkBundle["linkCandidate"]["evidence"];
  metadata: C32StableLinkBundle["linkCandidate"]["metadata"] & {
    createdByPolicy: "first_activity_value_object_link_explicit_write_gate_v0";
    linkBundleHash: string;
  };
};

export function sanitizeC32ErrorMessage(
  value: string | null | undefined
): string | null {
  if (!value) {
    return null;
  }

  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [REDACTED]")
    .replace(/eyJ[A-Za-z0-9._-]+/g, "[JWT_REDACTED]")
    .slice(0, 500);
}

export function readC32StringProperty(
  value: unknown,
  key: string
): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as C32JsonRecord;
  const property = record[key];

  return typeof property === "string" ? property : null;
}

export function readC32NumberProperty(
  value: unknown,
  key: string
): number | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as C32JsonRecord;
  const property = record[key];

  return typeof property === "number" && Number.isFinite(property)
    ? property
    : null;
}

export function hashC32DiagnosticValue(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function stableC32JsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableC32JsonStringify(item)).join(",")}]`;
  }

  const record = value as C32JsonRecord;
  const keys = Object.keys(record).sort();

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableC32JsonStringify(record[key])}`)
    .join(",")}}`;
}

export function stableC32Hash(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(stableC32JsonStringify(value))
    .digest("hex");
}

export function readC32AuthSubjectFromSessionUser(user: unknown): string | null {
  return readC32StringProperty(user, "sub");
}

export async function mapC32AppUser(params: {
  supabase: C32SupabaseLike;
  trustedAuthSubject: string | null;
}): Promise<C32AppUserMapping> {
  if (!params.trustedAuthSubject) {
    return {
      outcome: "not_attempted_missing_auth_subject",
      appUserId: null,
      appUserIdSha256Prefix: null,
      rowCount: 0,
      errorCode: null,
      errorMessage: null,
    };
  }

  const { data, error } = await params.supabase
    .from("app_users")
    .select("id, auth0_user_id")
    .eq("auth0_user_id", params.trustedAuthSubject)
    .limit(5);

  if (error) {
    return {
      outcome: "query_error",
      appUserId: null,
      appUserIdSha256Prefix: null,
      rowCount: 0,
      errorCode: error.code ?? "unknown",
      errorMessage: sanitizeC32ErrorMessage(error.message),
    };
  }

  const rows = Array.isArray(data) ? (data as C32JsonRecord[]) : [];

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
      outcome: "multiple_matches",
      appUserId: null,
      appUserIdSha256Prefix: null,
      rowCount: rows.length,
      errorCode: null,
      errorMessage: null,
    };
  }

  const appUserId = readC32StringProperty(rows[0], "id");

  return {
    outcome: "mapped",
    appUserId,
    appUserIdSha256Prefix: hashC32DiagnosticValue(appUserId),
    rowCount: 1,
    errorCode: null,
    errorMessage: null,
  };
}

export async function resolveC32SelectedSpace(params: {
  supabase: C32SupabaseLike;
  appUserId: string | null;
  selectedSpaceIdSha256Prefix: string | null;
}): Promise<C32SelectedSpaceResolution> {
  const sourceColumns = ["id", "app_user_id", "owner_user_id"];

  if (!params.appUserId || !params.selectedSpaceIdSha256Prefix) {
    return {
      outcome: "not_attempted_missing_app_user_or_space_hash",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: null,
      sourceColumns,
      errorCode: null,
      errorMessage: null,
    };
  }

  const { data, error } = await params.supabase
    .from("spaces")
    .select("id, app_user_id, owner_user_id")
    .or(`app_user_id.eq.${params.appUserId},owner_user_id.eq.${params.appUserId}`)
    .limit(50);

  if (error) {
    return {
      outcome: "query_error",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: null,
      sourceColumns,
      errorCode: error.code ?? "unknown",
      errorMessage: sanitizeC32ErrorMessage(error.message),
    };
  }

  const rows = Array.isArray(data) ? (data as C32JsonRecord[]) : [];
  const found = rows.filter((row) => {
    const spaceId = readC32StringProperty(row, "id");
    return hashC32DiagnosticValue(spaceId) === params.selectedSpaceIdSha256Prefix;
  });

  if (found.length === 0) {
    return {
      outcome: "not_found",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: null,
      sourceColumns,
      errorCode: null,
      errorMessage: null,
    };
  }

  if (found.length > 1) {
    return {
      outcome: "multiple_matching_spaces",
      selectedSpaceId: null,
      selectedSpaceIdSha256Prefix: null,
      sourceColumns,
      errorCode: null,
      errorMessage: null,
    };
  }

  const selectedSpaceId = readC32StringProperty(found[0], "id");

  return {
    outcome: "resolved_single_space",
    selectedSpaceId,
    selectedSpaceIdSha256Prefix: hashC32DiagnosticValue(selectedSpaceId),
    sourceColumns,
    errorCode: null,
    errorMessage: null,
  };
}

export async function resolveC32ActorForSpace(params: {
  supabase: C32SupabaseLike;
  selectedSpaceId: string | null;
}): Promise<C32ActorResolution> {
  if (!params.selectedSpaceId) {
    return {
      outcome: "not_attempted_missing_space",
      actorId: null,
      actorIdSha256Prefix: null,
      actorCandidateCount: 0,
      errorCode: null,
      errorMessage: null,
    };
  }

  const { data, error } = await params.supabase
    .from("actor_space_roles")
    .select("actor_id, space_id, role")
    .eq("space_id", params.selectedSpaceId)
    .limit(20);

  if (error) {
    return {
      outcome: "query_error",
      actorId: null,
      actorIdSha256Prefix: null,
      actorCandidateCount: 0,
      errorCode: error.code ?? "unknown",
      errorMessage: sanitizeC32ErrorMessage(error.message),
    };
  }

  const rows = Array.isArray(data) ? (data as C32JsonRecord[]) : [];

  const actorIds = Array.from(
    new Set(
      rows
        .map((row) => readC32StringProperty(row, "actor_id"))
        .filter((value): value is string => Boolean(value))
    )
  );

  if (actorIds.length === 0) {
    return {
      outcome: "not_found",
      actorId: null,
      actorIdSha256Prefix: null,
      actorCandidateCount: 0,
      errorCode: null,
      errorMessage: null,
    };
  }

  if (actorIds.length > 1) {
    return {
      outcome: "multiple_actors_for_space",
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
    actorIdSha256Prefix: hashC32DiagnosticValue(actorIds[0]),
    actorCandidateCount: 1,
    errorCode: null,
    errorMessage: null,
  };
}

export async function findC32ActivityEvent(params: {
  supabase: C32SupabaseLike;
  appUserId: string | null;
  insertedActivityEventIdSha256Prefix: string | null;
}): Promise<C32ActivityEventResolution> {
  if (!params.appUserId || !params.insertedActivityEventIdSha256Prefix) {
    return {
      outcome: "not_attempted_missing_app_user_or_activity_hash",
      matchCount: 0,
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
    .select("id, title, source, status, duration_minutes, created_at")
    .eq("app_user_id", params.appUserId)
    .eq("source", "chat_ai")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return {
      outcome: "query_error",
      matchCount: 0,
      activityEventId: null,
      activityEventIdSha256Prefix: null,
      title: null,
      source: null,
      status: null,
      durationMinutes: null,
      errorCode: error.code ?? "unknown",
      errorMessage: sanitizeC32ErrorMessage(error.message),
    };
  }

  const rows = Array.isArray(data) ? (data as C32JsonRecord[]) : [];
  const matches = rows.filter((row) => {
    const id = readC32StringProperty(row, "id");
    return hashC32DiagnosticValue(id) === params.insertedActivityEventIdSha256Prefix;
  });

  if (matches.length === 0) {
    return {
      outcome: "not_found",
      matchCount: 0,
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
      matchCount: matches.length,
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

  const match = matches[0];
  const activityEventId = readC32StringProperty(match, "id");

  return {
    outcome: "found_single_matching_activity_event",
    matchCount: 1,
    activityEventId,
    activityEventIdSha256Prefix: hashC32DiagnosticValue(activityEventId),
    title: readC32StringProperty(match, "title"),
    source: readC32StringProperty(match, "source"),
    status: readC32StringProperty(match, "status"),
    durationMinutes: readC32NumberProperty(match, "duration_minutes"),
    errorCode: null,
    errorMessage: null,
  };
}

export async function findC32ExistingValueObject(params: {
  supabase: C32SupabaseLike;
  appUserId: string | null;
  selectedSpaceId: string | null;
}): Promise<C32ValueObjectResolution> {
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
      errorMessage: sanitizeC32ErrorMessage(error.message),
    };
  }

  const rows = Array.isArray(data) ? (data as C32JsonRecord[]) : [];

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
  const valueObjectId = readC32StringProperty(row, "id");

  return {
    outcome: "found_single_existing_value_object",
    existingCount: 1,
    valueObjectId,
    valueObjectIdSha256Prefix: hashC32DiagnosticValue(valueObjectId),
    title: readC32StringProperty(row, "title"),
    source: readC32StringProperty(row, "source"),
    valueType: readC32StringProperty(row, "value_type"),
    status: readC32StringProperty(row, "status"),
    errorCode: null,
    errorMessage: null,
  };
}

export async function findC32ExistingActivityValueObjectLink(params: {
  supabase: C32SupabaseLike;
  activityEventId: string | null;
  valueObjectId: string | null;
}): Promise<C32LinkResolution> {
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
      errorMessage: sanitizeC32ErrorMessage(error.message),
    };
  }

  const rows = Array.isArray(data) ? (data as C32JsonRecord[]) : [];

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

  const linkId = readC32StringProperty(rows[0], "id");

  return {
    outcome: "found_single_existing_link",
    existingCount: 1,
    linkId,
    linkIdSha256Prefix: hashC32DiagnosticValue(linkId),
    errorCode: null,
    errorMessage: null,
  };
}

export function buildC32StableSemanticBundle(params: {
  activityEventIdSha256Prefix: string | null;
  actorIdSha256Prefix: string | null;
  selectedSpaceIdSha256Prefix: string | null;
}): C32StableSemanticBundle {
  const semanticBundle: C32StableSemanticBundle["semanticBundle"] = {
    schemaVersion: "c32-first-value-object-semantic-bundle-v0",
    stablePolicy: "first_value_object_explicit_write_gate_v0",
    categories: [
      {
        canonicalSlug: "semantic-persistence-readiness",
        semanticLayer: "domain",
        role: "primary_subject",
        confidence: 1,
        status: "confirmed_for_probe",
      },
      {
        canonicalSlug: "activity-event-source-of-truth",
        semanticLayer: "object",
        role: "source_fact",
        confidence: 1,
        status: "confirmed_for_probe",
      },
      {
        canonicalSlug: "unified-value-object",
        semanticLayer: "object",
        role: "target_projection",
        confidence: 1,
        status: "confirmed_for_probe",
      },
      {
        canonicalSlug: "no-state-write",
        semanticLayer: "responsibility",
        role: "safety_boundary",
        confidence: 1,
        status: "confirmed_for_probe",
      },
      {
        canonicalSlug: "personal-scope",
        semanticLayer: "scope",
        role: "ownership_context",
        confidence: 1,
        status: "confirmed_for_probe",
      },
    ],
    valueObjectCandidate: {
      title: "Semantic persistence readiness",
      source: "semantic_candidate",
      valueType: "personal_development",
      status: "candidate",
      visibility: "private",
    },
    evidence: {
      activityEventIdSha256Prefix: params.activityEventIdSha256Prefix,
      actorIdSha256Prefix: params.actorIdSha256Prefix,
      selectedSpaceIdSha256Prefix: params.selectedSpaceIdSha256Prefix,
      reason:
        "C32 proof bundle connects an existing activity event to the first personal unified Value Object without creating state.",
      noStateFactCreated: true,
      noStateDeltaCreated: true,
      noStateSnapshotCreated: true,
    },
    metadata: {
      source: "c32_first_value_object_gate",
      activityEventRemainsSourceOfTruth: true,
      valueObjectIsUnifiedNoHardSubtype: true,
      categoryDoesNotCreateStateFact: true,
      createsStateNow: false,
    },
  };

  return {
    semanticBundle,
    bundleHash: stableC32Hash(semanticBundle),
  };
}

export function buildC32StableLinkBundle(params: {
  activityEventIdSha256Prefix: string | null;
  valueObjectIdSha256Prefix: string | null;
  actorIdSha256Prefix: string | null;
  selectedSpaceIdSha256Prefix: string | null;
}): C32StableLinkBundle {
  const linkCandidate: C32StableLinkBundle["linkCandidate"] = {
    linkType: "semantic_exposure",
    exposureType: "primary_subject",
    confidence: 1,
    evidence: {
      policy: "first_activity_value_object_link_explicit_write_gate_v0",
      activityEventIdSha256Prefix: params.activityEventIdSha256Prefix,
      valueObjectIdSha256Prefix: params.valueObjectIdSha256Prefix,
      actorIdSha256Prefix: params.actorIdSha256Prefix,
      selectedSpaceIdSha256Prefix: params.selectedSpaceIdSha256Prefix,
      reason:
        "The activity event produced a stable semantic bundle whose primary subject is the existing personal Value Object.",
      noStateFactCreated: true,
      noStateDeltaCreated: true,
      noStateSnapshotCreated: true,
    },
    metadata: {
      source: "c32_first_activity_value_object_link_gate",
      activityEventRemainsSourceOfTruth: true,
      valueObjectIsUnifiedNoHardSubtype: true,
      categoryDoesNotCreateStateFact: true,
      createsStateNow: false,
      createsValueObjectNow: false,
    },
  };

  return {
    linkCandidate,
    bundleHash: stableC32Hash(linkCandidate),
  };
}

export function buildC32ValueObjectInsertPayload(params: {
  appUserId: string | null;
  actorId: string | null;
  selectedSpaceId: string | null;
  semanticBundle: C32StableSemanticBundle;
}): C32ValueObjectInsertPayload {
  return {
    title: "Semantic persistence readiness",
    source: "semantic_candidate",
    value_type: "personal_development",
    status: "candidate",
    actor_id: params.actorId,
    space_id: params.selectedSpaceId,
    app_user_id: params.appUserId,
    owner_user_id: params.appUserId,
    organization_id: null,
    visibility: "private",
    semantic_signature: params.semanticBundle.semanticBundle,
    metadata: {
      ...params.semanticBundle.semanticBundle.metadata,
      createdByPolicy: "first_value_object_explicit_write_gate_v0",
      semanticBundleHash: params.semanticBundle.bundleHash,
    },
  };
}

export function buildC32ActivityValueObjectLinkInsertPayload(params: {
  appUserId: string | null;
  actorId: string | null;
  selectedSpaceId: string | null;
  activityEventId: string | null;
  valueObjectId: string | null;
  linkBundle: C32StableLinkBundle;
}): C32ActivityValueObjectLinkInsertPayload {
  const linkCandidate = params.linkBundle.linkCandidate;

  return {
    activity_event_id: params.activityEventId,
    value_object_id: params.valueObjectId,
    actor_id: params.actorId,
    space_id: params.selectedSpaceId,
    app_user_id: params.appUserId,
    organization_id: null,
    link_type: linkCandidate.linkType,
    exposure_type: linkCandidate.exposureType,
    confidence: linkCandidate.confidence,
    evidence: linkCandidate.evidence,
    metadata: {
      ...linkCandidate.metadata,
      createdByPolicy: "first_activity_value_object_link_explicit_write_gate_v0",
      linkBundleHash: params.linkBundle.bundleHash,
    },
  };
}

export function buildC32ReadinessFromChecks<TChecks extends Record<string, boolean>>(
  checks: TChecks
): { checks: TChecks; passed: boolean } {
  return {
    checks,
    passed: Object.values(checks).every((value) => value === true),
  };
}

export function buildC32NoWriteStatus() {
  return {
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
  };
}

export function buildC32NoDbTouchStatus() {
  return {
    sqlExecuted: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    supabaseReadExecuted: false,
    supabaseWriteExecuted: false,
    activityEventInserted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    stateDeltaCreated: false,
    stateFactCreated: false,
    stateSnapshotCreated: false,
  };
}
