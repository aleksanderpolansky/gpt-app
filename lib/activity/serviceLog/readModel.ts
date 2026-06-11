import { auth0 } from "../../auth0";
import { supabase } from "../../supabase";
import { ACTIVITY_PROCESSING_SERVICE_LOG_TABLE } from "./types";
import type {
  ServiceLogApiError,
  ServiceLogApiErrorCode,
  ServiceLogAuthenticatedUserResult,
  ServiceLogCandidateCounts,
  ServiceLogDiagnosticBadge,
  ServiceLogPrivacyBadge,
  ServiceLogReadFailure,
  ServiceLogReadResult,
  ServiceLogRunDetail,
  ServiceLogRunDetailResponse,
  ServiceLogRunFilters,
  ServiceLogRunListItem,
  ServiceLogRunListResponse,
  ServiceLogRunPermissions,
  ServiceLogWriteBadge,
} from "./apiTypes";

type ServiceLogDbRow = Record<string, unknown>;

type ServiceLogCursor = {
  readonly createdAt: string;
  readonly id: string;
};

type ServiceLogRunListInput = {
  readonly actorAppUserId: string;
  readonly filters: ServiceLogRunFilters;
  readonly requestId?: string;
};

type ServiceLogRunDetailInput = {
  readonly actorAppUserId: string;
  readonly id: string;
  readonly requestId?: string;
};

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MASKED = "[masked]";
const MASKED_PRIVATE = "[masked-private]";
const MASKED_SENSITIVE = "[masked-sensitive]";

const ALLOWED_FILTER_PARAMS = new Set([
  "limit",
  "cursor",
  "stageKey",
  "stageStatus",
  "sourceSurface",
  "sourceRoute",
  "sourceComponent",
  "isPreview",
  "isWriteAttempted",
  "activityEventCreated",
  "visibleInServiceLog",
  "privacyScope",
  "diagnostic",
]);

const SERVICE_LOG_LIST_SELECT_FIELDS = [
  "id",
  "created_at",
  "updated_at",
  "request_id",
  "correlation_id",
  "client_event_id",
  "source_surface",
  "source_route",
  "source_component",
  "http_method",
  "stage_key",
  "stage_status",
  "processor_name",
  "processor_version",
  "raw_text_publicly_visible",
  "message_visibility_scope",
  "privacy_scope",
  "contains_sensitive_data",
  "public_safe",
  "ai_output_publicly_visible",
  "visible_in_service_log",
  "is_preview",
  "is_write_attempted",
  "activity_event_created",
  "activity_event_id",
  "category_candidates_json",
  "metric_candidates_json",
  "value_object_candidates_json",
  "exposure_candidates_json",
  "state_delta_candidates_json",
  "review_action_candidates_json",
  "safety_warnings_json",
  "warning_messages_json",
  "debug_payload_json",
  "evidence_json",
].join(",");

const SERVICE_LOG_DETAIL_SELECT_FIELDS = [
  SERVICE_LOG_LIST_SELECT_FIELDS,
  "raw_message_text",
  "activity_template_id",
  "entity_classification_ids_json",
  "value_object_ids_json",
  "event_link_ids_json",
  "aggregate_ids_json",
  "metric_summary_json",
  "quantity_summary_json",
  "quality_score_json",
].join(",");

function makeSuccess<T>(data: T): ServiceLogReadResult<T> {
  return {
    ok: true,
    data,
  };
}

function makeFailure(
  status: 400 | 401 | 404 | 500,
  code: ServiceLogApiErrorCode,
  safeMessage: string,
  internalMessage?: string,
  requestId?: string,
): ServiceLogReadFailure {
  return {
    ok: false,
    status,
    error: {
      error: safeMessage,
      code,
      ...(requestId ? { requestId } : {}),
    },
    ...(internalMessage ? { internalMessage } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(row: ServiceLogDbRow, key: string): string | null {
  const value = row[key];

  if (typeof value === "string") {
    return value;
  }

  return null;
}

function readRequiredString(
  row: ServiceLogDbRow,
  key: string,
  fallback: string,
): string {
  return readString(row, key) ?? fallback;
}

function readBoolean(
  row: ServiceLogDbRow,
  key: string,
  fallback: boolean,
): boolean {
  const value = row[key];

  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

function readJsonArray(row: ServiceLogDbRow, key: string): readonly unknown[] {
  const value = row[key];

  if (Array.isArray(value)) {
    return value;
  }

  return [];
}

function readJsonObject(
  row: ServiceLogDbRow,
  key: string,
): Record<string, unknown> {
  const value = row[key];

  if (isRecord(value)) {
    return value;
  }

  return {};
}

function getArrayLength(value: unknown): number {
  if (Array.isArray(value)) {
    return value.length;
  }

  return 0;
}

function hasNonEmptyObject(value: unknown): boolean {
  return isRecord(value) && Object.keys(value).length > 0;
}

function normalizeOneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength);
}

function readAuthSubjectFromSession(session: unknown): string | null {
  if (!isRecord(session)) {
    return null;
  }

  const user = session.user;

  if (!isRecord(user)) {
    return null;
  }

  const sub = user.sub;

  if (typeof sub !== "string" || sub.trim().length === 0) {
    return null;
  }

  return sub;
}

function safeStringParam(
  searchParams: URLSearchParams,
  key: string,
  maxLength = 160,
): ServiceLogReadResult<string | null> {
  const value = searchParams.get(key);

  if (value === null || value.trim().length === 0) {
    return makeSuccess(null);
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    return makeFailure(
      400,
      "INVALID_QUERY",
      `Invalid query parameter: ${key}.`,
      `Parameter ${key} exceeds ${maxLength} characters.`,
    );
  }

  return makeSuccess(trimmed);
}

function strictBooleanParam(
  searchParams: URLSearchParams,
  key: string,
): ServiceLogReadResult<boolean | null> {
  const value = searchParams.get(key);

  if (value === null || value.trim().length === 0) {
    return makeSuccess(null);
  }

  if (value === "true") {
    return makeSuccess(true);
  }

  if (value === "false") {
    return makeSuccess(false);
  }

  return makeFailure(
    400,
    "INVALID_QUERY",
    `Invalid boolean query parameter: ${key}.`,
    `Expected true or false for ${key}, got ${value}.`,
  );
}

function parseLimit(searchParams: URLSearchParams): ServiceLogReadResult<number> {
  const value = searchParams.get("limit");

  if (value === null || value.trim().length === 0) {
    return makeSuccess(DEFAULT_LIMIT);
  }

  if (!/^\d+$/.test(value)) {
    return makeFailure(
      400,
      "INVALID_QUERY",
      "Invalid limit query parameter.",
      `Limit is not an integer: ${value}.`,
    );
  }

  const parsed = Number.parseInt(value, 10);

  if (parsed < 1 || parsed > MAX_LIMIT) {
    return makeFailure(
      400,
      "INVALID_QUERY",
      "Invalid limit query parameter.",
      `Limit must be between 1 and ${MAX_LIMIT}.`,
    );
  }

  return makeSuccess(parsed);
}

function parseVisibleInServiceLog(
  searchParams: URLSearchParams,
): ServiceLogReadResult<boolean> {
  const parsed = strictBooleanParam(searchParams, "visibleInServiceLog");

  if (!parsed.ok) {
    return parsed;
  }

  return makeSuccess(parsed.data ?? true);
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(paddingLength);

  return Buffer.from(padded, "base64").toString("utf8");
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
}

function decodeCursor(cursor: string): ServiceLogCursor | null {
  try {
    const decoded = decodeBase64Url(cursor);
    const parsed = JSON.parse(decoded) as unknown;

    if (!isRecord(parsed)) {
      return null;
    }

    const createdAt = parsed.createdAt;
    const id = parsed.id;

    if (typeof createdAt !== "string" || typeof id !== "string") {
      return null;
    }

    if (createdAt.trim().length === 0 || id.trim().length === 0) {
      return null;
    }

    return {
      createdAt,
      id,
    };
  } catch {
    return null;
  }
}

function encodeCursor(row: ServiceLogDbRow | null): string | null {
  if (!row) {
    return null;
  }

  const createdAt = readString(row, "created_at");
  const id = readString(row, "id");

  if (!createdAt || !id) {
    return null;
  }

  return encodeBase64Url(
    JSON.stringify({
      createdAt,
      id,
    }),
  );
}

function parseServiceLogRunFiltersFromUrl(
  requestUrl: string,
): ServiceLogReadResult<ServiceLogRunFilters> {
  const url = new URL(requestUrl);
  const unknownParams = Array.from(url.searchParams.keys()).filter(
    (key) => !ALLOWED_FILTER_PARAMS.has(key),
  );

  if (unknownParams.length > 0) {
    return makeFailure(
      400,
      "INVALID_QUERY",
      "Unknown service-log query parameter.",
      `Unknown params: ${unknownParams.join(", ")}.`,
    );
  }

  const limit = parseLimit(url.searchParams);
  const cursor = safeStringParam(url.searchParams, "cursor", 500);
  const stageKey = safeStringParam(url.searchParams, "stageKey");
  const stageStatus = safeStringParam(url.searchParams, "stageStatus");
  const sourceSurface = safeStringParam(url.searchParams, "sourceSurface");
  const sourceRoute = safeStringParam(url.searchParams, "sourceRoute", 240);
  const sourceComponent = safeStringParam(url.searchParams, "sourceComponent");
  const isPreview = strictBooleanParam(url.searchParams, "isPreview");
  const isWriteAttempted = strictBooleanParam(
    url.searchParams,
    "isWriteAttempted",
  );
  const activityEventCreated = strictBooleanParam(
    url.searchParams,
    "activityEventCreated",
  );
  const visibleInServiceLog = parseVisibleInServiceLog(url.searchParams);
  const privacyScope = safeStringParam(url.searchParams, "privacyScope");
  const diagnostic = strictBooleanParam(url.searchParams, "diagnostic");

  const results = [
    limit,
    cursor,
    stageKey,
    stageStatus,
    sourceSurface,
    sourceRoute,
    sourceComponent,
    isPreview,
    isWriteAttempted,
    activityEventCreated,
    visibleInServiceLog,
    privacyScope,
    diagnostic,
  ];

  const failure = results.find((result) => !result.ok);

  if (failure && !failure.ok) {
    return failure;
  }

  const cursorValue = cursor.ok ? cursor.data : null;

  if (cursorValue && !decodeCursor(cursorValue)) {
    return makeFailure(
      400,
      "INVALID_QUERY",
      "Invalid cursor query parameter.",
      "Cursor could not be decoded.",
    );
  }

  return makeSuccess({
    limit: limit.ok ? limit.data : DEFAULT_LIMIT,
    cursor: cursorValue,
    stageKey: stageKey.ok ? stageKey.data : null,
    stageStatus: stageStatus.ok ? stageStatus.data : null,
    sourceSurface: sourceSurface.ok ? sourceSurface.data : null,
    sourceRoute: sourceRoute.ok ? sourceRoute.data : null,
    sourceComponent: sourceComponent.ok ? sourceComponent.data : null,
    isPreview: isPreview.ok ? isPreview.data : null,
    isWriteAttempted: isWriteAttempted.ok ? isWriteAttempted.data : null,
    activityEventCreated: activityEventCreated.ok
      ? activityEventCreated.data
      : null,
    visibleInServiceLog: visibleInServiceLog.ok
      ? visibleInServiceLog.data
      : true,
    privacyScope: privacyScope.ok ? privacyScope.data : null,
    diagnostic: diagnostic.ok ? diagnostic.data : null,
  });
}

export async function resolveServiceLogAuthenticatedUser(): Promise<ServiceLogAuthenticatedUserResult> {
  const session = await auth0.getSession();
  const authSubject = readAuthSubjectFromSession(session);

  if (!authSubject) {
    return {
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      safeMessage: "You must be signed in to view the private service log.",
    };
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("id, auth0_sub")
    .eq("auth0_sub", authSubject)
    .maybeSingle();

  const rawAppUserData: unknown = data;

  if (error) {
    return {
      ok: false,
      status: 401,
      code: "APP_USER_MAPPING_MISSING",
      safeMessage: "Authenticated app user mapping is unavailable.",
      internalMessage: error.message,
    };
  }

  if (!isRecord(rawAppUserData) || typeof rawAppUserData.id !== "string") {
    return {
      ok: false,
      status: 401,
      code: "APP_USER_MAPPING_MISSING",
      safeMessage: "Authenticated app user mapping is unavailable.",
      internalMessage: "app_users mapping not found for auth subject.",
    };
  }

  return {
    ok: true,
    appUserId: rawAppUserData.id,
    authSubject,
  };
}

function computeServiceLogCandidateCounts(
  row: ServiceLogDbRow,
): ServiceLogCandidateCounts {
  return {
    categories: getArrayLength(row.category_candidates_json),
    metrics: getArrayLength(row.metric_candidates_json),
    valueObjects: getArrayLength(row.value_object_candidates_json),
    exposures: getArrayLength(row.exposure_candidates_json),
    stateDeltas: getArrayLength(row.state_delta_candidates_json),
    reviewActions: getArrayLength(row.review_action_candidates_json),
  };
}

function computeServiceLogPrivacyBadges(
  row: ServiceLogDbRow,
): readonly ServiceLogPrivacyBadge[] {
  const badges: ServiceLogPrivacyBadge[] = [];
  const privacyScope = readRequiredString(row, "privacy_scope", "private");
  const normalizedPrivacyScope = privacyScope.toLowerCase();

  if (
    normalizedPrivacyScope !== "public" &&
    normalizedPrivacyScope !== "public_safe"
  ) {
    badges.push("private");
  }

  if (readBoolean(row, "contains_sensitive_data", false)) {
    badges.push("sensitive");
  }

  if (!readBoolean(row, "public_safe", false)) {
    badges.push("public-blocked");
  }

  if (!readBoolean(row, "raw_text_publicly_visible", false)) {
    badges.push("raw-masked");
  }

  if (!readBoolean(row, "ai_output_publicly_visible", false)) {
    badges.push("ai-output-private");
  }

  return badges;
}

function computeServiceLogWriteBadge(row: ServiceLogDbRow): ServiceLogWriteBadge {
  const isPreview = readBoolean(row, "is_preview", true);
  const isWriteAttempted = readBoolean(row, "is_write_attempted", false);
  const activityEventCreated = readBoolean(
    row,
    "activity_event_created",
    false,
  );
  const activityEventId = readString(row, "activity_event_id");

  if (activityEventCreated && activityEventId) {
    return "activity-created";
  }

  if (isWriteAttempted) {
    return "write-attempted";
  }

  if (isPreview && !isWriteAttempted) {
    return "preview-only";
  }

  return "no-activity-created";
}

function containsDiagnosticSignal(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();

  return (
    normalized.includes("debug") ||
    normalized.includes("test") ||
    normalized.includes("diagnostic") ||
    normalized.includes("smoke") ||
    normalized.includes("checkpoint")
  );
}

function computeServiceLogDiagnosticBadge(
  row: ServiceLogDbRow,
): ServiceLogDiagnosticBadge {
  const reasons: string[] = [];

  if (containsDiagnosticSignal(readString(row, "stage_key"))) {
    reasons.push("stage_key");
  }

  if (containsDiagnosticSignal(readString(row, "source_route"))) {
    reasons.push("source_route");
  }

  if (containsDiagnosticSignal(readString(row, "source_component"))) {
    reasons.push("source_component");
  }

  if (hasNonEmptyObject(row.debug_payload_json)) {
    reasons.push("debug_payload_json");
  }

  if (hasNonEmptyObject(row.evidence_json)) {
    reasons.push("evidence_json");
  }

  return {
    isDiagnostic: reasons.length > 0,
    reasons,
  };
}

function computeRawMessagePreviewMasked(row: ServiceLogDbRow): string | null {
  const rawMessageText = readString(row, "raw_message_text");

  if (!rawMessageText || rawMessageText.trim().length === 0) {
    return null;
  }

  if (readBoolean(row, "contains_sensitive_data", false)) {
    return MASKED_SENSITIVE;
  }

  if (!readBoolean(row, "public_safe", false)) {
    return MASKED_PRIVATE;
  }

  if (!readBoolean(row, "raw_text_publicly_visible", false)) {
    return MASKED;
  }

  return truncate(normalizeOneLine(rawMessageText), 160);
}

function computeHasWarnings(row: ServiceLogDbRow): boolean {
  return (
    getArrayLength(row.safety_warnings_json) > 0 ||
    getArrayLength(row.warning_messages_json) > 0
  );
}

function computeDisplaySummary(row: ServiceLogDbRow): string {
  const stageKey = readRequiredString(row, "stage_key", "unknown-stage");
  const sourceRoute = readString(row, "source_route");
  const sourceSurface = readRequiredString(row, "source_surface", "unknown");
  const processorVersion = readRequiredString(
    row,
    "processor_version",
    "unknown-version",
  );

  return `${stageKey} · ${sourceRoute ?? sourceSurface} · ${processorVersion}`;
}

function toServiceLogRunListItem(row: ServiceLogDbRow): ServiceLogRunListItem {
  return {
    id: readRequiredString(row, "id", ""),
    createdAt: readRequiredString(row, "created_at", ""),
    updatedAt: readRequiredString(row, "updated_at", ""),
    stageKey: readRequiredString(row, "stage_key", "unknown-stage"),
    stageStatus: readRequiredString(row, "stage_status", "warning"),
    sourceSurface: readRequiredString(row, "source_surface", "unknown"),
    sourceRoute: readString(row, "source_route"),
    sourceComponent: readString(row, "source_component"),
    httpMethod: readString(row, "http_method"),
    processorName: readRequiredString(row, "processor_name", "unknown"),
    processorVersion: readRequiredString(row, "processor_version", "unknown"),
    requestId: readString(row, "request_id"),
    correlationId: readString(row, "correlation_id"),
    clientEventId: readString(row, "client_event_id"),
    isPreview: readBoolean(row, "is_preview", true),
    isWriteAttempted: readBoolean(row, "is_write_attempted", false),
    activityEventCreated: readBoolean(row, "activity_event_created", false),
    activityEventId: readString(row, "activity_event_id"),
    visibleInServiceLog: readBoolean(row, "visible_in_service_log", true),
    privacyScope: readRequiredString(row, "privacy_scope", "private"),
    containsSensitiveData: readBoolean(row, "contains_sensitive_data", false),
    publicSafe: readBoolean(row, "public_safe", false),
    rawTextPubliclyVisible: readBoolean(
      row,
      "raw_text_publicly_visible",
      false,
    ),
    aiOutputPubliclyVisible: readBoolean(
      row,
      "ai_output_publicly_visible",
      false,
    ),
    candidateCounts: computeServiceLogCandidateCounts(row),
    privacyBadges: computeServiceLogPrivacyBadges(row),
    writeBadge: computeServiceLogWriteBadge(row),
    diagnosticBadge: computeServiceLogDiagnosticBadge(row),
    hasWarnings: computeHasWarnings(row),
    hasDebugPayload: hasNonEmptyObject(row.debug_payload_json),
    hasEvidence: hasNonEmptyObject(row.evidence_json),
    displaySummary: computeDisplaySummary(row),
    rawMessagePreviewMasked: computeRawMessagePreviewMasked(row),
  };
}

function computeDetailPermissions(): ServiceLogRunPermissions {
  return {
    canViewRawText: true,
    canViewDebugPayload: true,
    canViewEvidence: true,
  };
}

function toServiceLogRunDetail(
  row: ServiceLogDbRow,
  permissions: ServiceLogRunPermissions,
): ServiceLogRunDetail {
  return {
    ...toServiceLogRunListItem(row),
    rawMessageText: permissions.canViewRawText
      ? readString(row, "raw_message_text")
      : null,
    categoryCandidatesJson: readJsonArray(row, "category_candidates_json"),
    metricCandidatesJson: readJsonArray(row, "metric_candidates_json"),
    valueObjectCandidatesJson: readJsonArray(
      row,
      "value_object_candidates_json",
    ),
    exposureCandidatesJson: readJsonArray(row, "exposure_candidates_json"),
    stateDeltaCandidatesJson: readJsonArray(
      row,
      "state_delta_candidates_json",
    ),
    reviewActionCandidatesJson: readJsonArray(
      row,
      "review_action_candidates_json",
    ),
    entityClassificationIdsJson: readJsonArray(
      row,
      "entity_classification_ids_json",
    ),
    valueObjectIdsJson: readJsonArray(row, "value_object_ids_json"),
    eventLinkIdsJson: readJsonArray(row, "event_link_ids_json"),
    aggregateIdsJson: readJsonArray(row, "aggregate_ids_json"),
    metricSummaryJson: readJsonObject(row, "metric_summary_json"),
    quantitySummaryJson: readJsonObject(row, "quantity_summary_json"),
    qualityScoreJson: readJsonObject(row, "quality_score_json"),
    safetyWarningsJson: readJsonArray(row, "safety_warnings_json"),
    warningMessagesJson: readJsonArray(row, "warning_messages_json"),
    debugPayloadJson: permissions.canViewDebugPayload
      ? readJsonObject(row, "debug_payload_json")
      : null,
    evidenceJson: permissions.canViewEvidence
      ? readJsonObject(row, "evidence_json")
      : null,
  };
}

function filterRowsByDiagnostic(
  rows: readonly ServiceLogDbRow[],
  diagnostic: boolean | null,
): readonly ServiceLogDbRow[] {
  if (diagnostic === null) {
    return rows;
  }

  return rows.filter(
    (row) => computeServiceLogDiagnosticBadge(row).isDiagnostic === diagnostic,
  );
}

export async function listServiceLogRunsForCurrentUser(
  input: ServiceLogRunListInput,
): Promise<ServiceLogReadResult<ServiceLogRunListResponse>> {
  const cursor = input.filters.cursor
    ? decodeCursor(input.filters.cursor)
    : null;

  let query = supabase
    .from(ACTIVITY_PROCESSING_SERVICE_LOG_TABLE)
    .select(SERVICE_LOG_LIST_SELECT_FIELDS)
    .eq("user_id", input.actorAppUserId)
    .eq("visible_in_service_log", input.filters.visibleInServiceLog)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(input.filters.limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor.createdAt);
  }

  if (input.filters.stageKey) {
    query = query.eq("stage_key", input.filters.stageKey);
  }

  if (input.filters.stageStatus) {
    query = query.eq("stage_status", input.filters.stageStatus);
  }

  if (input.filters.sourceSurface) {
    query = query.eq("source_surface", input.filters.sourceSurface);
  }

  if (input.filters.sourceRoute) {
    query = query.ilike("source_route", `%${input.filters.sourceRoute}%`);
  }

  if (input.filters.sourceComponent) {
    query = query.ilike(
      "source_component",
      `%${input.filters.sourceComponent}%`,
    );
  }

  if (input.filters.isPreview !== null) {
    query = query.eq("is_preview", input.filters.isPreview);
  }

  if (input.filters.isWriteAttempted !== null) {
    query = query.eq("is_write_attempted", input.filters.isWriteAttempted);
  }

  if (input.filters.activityEventCreated !== null) {
    query = query.eq(
      "activity_event_created",
      input.filters.activityEventCreated,
    );
  }

  if (input.filters.privacyScope) {
    query = query.eq("privacy_scope", input.filters.privacyScope);
  }

  const { data, error } = await query;

  if (error) {
    return makeFailure(
      500,
      "INTERNAL_ERROR",
      "Service-log list failed to load.",
      error.message,
      input.requestId,
    );
  }

  const rawData: unknown = data;
  const dataRows: readonly ServiceLogDbRow[] = Array.isArray(rawData)
    ? rawData.filter(isRecord)
    : [];

  const filteredRows = filterRowsByDiagnostic(
    dataRows,
    input.filters.diagnostic,
  );

  const pageRows = filteredRows.slice(0, input.filters.limit);
  const hasMore = dataRows.length > input.filters.limit;
  const nextCursor = hasMore
    ? encodeCursor(pageRows[pageRows.length - 1] ?? null)
    : null;

  return makeSuccess({
    items: pageRows.map((row) => toServiceLogRunListItem(row)),
    nextCursor,
    appliedFilters: input.filters,
    warnings:
      input.filters.diagnostic === null
        ? []
        : [
            "Diagnostic filtering is derived after read from stage/source/debug/evidence signals.",
          ],
  });
}

export async function getServiceLogRunDetailForCurrentUser(
  input: ServiceLogRunDetailInput,
): Promise<ServiceLogReadResult<ServiceLogRunDetailResponse>> {
  if (!/^[0-9a-fA-F-]{32,36}$/.test(input.id)) {
    return makeFailure(
      400,
      "INVALID_ID",
      "Invalid service-log row id.",
      "Detail id failed local format validation.",
      input.requestId,
    );
  }

  const { data, error } = await supabase
    .from(ACTIVITY_PROCESSING_SERVICE_LOG_TABLE)
    .select(SERVICE_LOG_DETAIL_SELECT_FIELDS)
    .eq("id", input.id)
    .eq("user_id", input.actorAppUserId)
    .maybeSingle();

  const rawDetailData: unknown = data;

  if (error) {
    return makeFailure(
      500,
      "INTERNAL_ERROR",
      "Service-log detail failed to load.",
      error.message,
      input.requestId,
    );
  }

  if (!isRecord(rawDetailData)) {
    return makeFailure(
      404,
      "NOT_FOUND",
      "Service-log row not found.",
      "No owned service-log row matched requested id.",
      input.requestId,
    );
  }

  const permissions = computeDetailPermissions();

  return makeSuccess({
    item: toServiceLogRunDetail(rawDetailData, permissions),
    permissions,
    warnings: [],
  });
}

export async function listServiceLogRunsFromRequest(
  request: Request,
): Promise<ServiceLogReadResult<ServiceLogRunListResponse>> {
  const actor = await resolveServiceLogAuthenticatedUser();

  if (!actor.ok) {
    return makeFailure(
      actor.status,
      actor.code,
      actor.safeMessage,
      actor.internalMessage,
    );
  }

  const filters = parseServiceLogRunFiltersFromUrl(request.url);

  if (!filters.ok) {
    return filters;
  }

  return listServiceLogRunsForCurrentUser({
    actorAppUserId: actor.appUserId,
    filters: filters.data,
  });
}

export function toServiceLogApiErrorResponse(
  failure: ServiceLogReadFailure,
): ServiceLogApiError {
  return failure.error;
}
