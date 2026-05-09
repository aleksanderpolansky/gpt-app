import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";
import {
  analyzeObjectActionSuggestion,
  type ObjectActionExistingCategoryInput,
} from "../../../../../lib/objectAction/suggestionAnalysis";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type SuggestionRequestBody = {
  userText?: unknown;
  locale?: unknown;
  contextCode?: unknown;
  entityType?: unknown;
  entityId?: unknown;
  requestSource?: unknown;
  proposedObjectText?: unknown;
  proposedActionText?: unknown;
  proposedCategoryText?: unknown;
};

type SuggestionModerationRequestBody = {
  id?: unknown;
  action?: unknown;
  adminComment?: unknown;
  newCategoryName?: unknown;
  newCategorySlug?: unknown;
  newCategoryDescription?: unknown;
};

type ContextRow = {
  id: string;
  code: string;
  status: string;
  is_active: boolean;
};

type AppUserRow = {
  id: string;
  auth0_sub: string;
  email: string | null;
  name: string | null;
};

type PlatformAdminRow = {
  id: string;
  app_user_id: string;
  role: string;
  status: string;
};

type SuggestionRequestRow = {
  id: string;
  user_text: string;
  locale: string;
  context_code: string;
  resolved_context_id: string | null;
  entity_type: string;
  entity_id: string | null;
  request_source: string;
  source_type: string;
  created_by_user_id: string | null;
  proposed_object_text: string | null;
  proposed_action_text: string | null;
  proposed_category_text: string | null;
  ai_status: string | null;
  ai_confidence: number | null;
  ai_model: string | null;
  ai_prompt_version: string | null;
  ai_suggested_object_text: string | null;
  ai_suggested_action_text: string | null;
  ai_suggested_category_text: string | null;
  ai_suggested_object_type_id: string | null;
  ai_suggested_action_type_id: string | null;
  ai_suggested_contextual_category_id: string | null;
  matched_existing_category_id: string | null;
  ai_analysis_json: Record<string, unknown> | null;
  ai_error_message: string | null;
  status: string;
  admin_decision: string | null;
  admin_comment: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ExistingSuggestionRow = SuggestionRequestRow;

type ContextualCategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

type SuggestionAuditEventHashRow = {
  id: string;
  record_hash: string | null;
  created_at: string;
};

type SuggestionStatusFilter =
  | "all"
  | "draft"
  | "suggested"
  | "needs_review"
  | "approved"
  | "merged"
  | "rejected"
  | "archived";

type SuggestionStatusChangingAction = "reject" | "archive";
type SuggestionModerationAction =
  | SuggestionStatusChangingAction
  | "analyze"
  | "approve_existing_match"
  | "approve_new_category";

type SuggestionAuditEventType =
  | "created"
  | "ai_analyzed"
  | "rejected"
  | "archived"
  | "approve_existing_match"
  | "approve_new_category";

type SuggestionAuditEventSource =
  | "admin_ui"
  | "api"
  | "system"
  | "ai"
  | "import";

type CreateSuggestionAuditEventInput = {
  suggestionRequestId: string;
  appUser?: AppUserRow | null;
  platformAdmin?: PlatformAdminRow | null;
  actorRole?: string | null;
  eventType: SuggestionAuditEventType;
  eventSource?: SuggestionAuditEventSource;
  statusBefore: string | null;
  statusAfter: string;
  aiStatusBefore: string | null;
  aiStatusAfter: string | null;
  adminDecision: string | null;
  matchedExistingCategoryId?: string | null;
  createdContextualCategoryId?: string | null;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadataJson?: Record<string, unknown>;
  publicNote?: string | null;
  internalNote?: string | null;
};

type SuggestedNewCategoryData = {
  name: string;
  slug: string;
  description: string | null;
  source: "admin_explicit" | "ai_suggested";
};

const DEFAULT_LOCALE = "ru";
const DEFAULT_CONTEXT_CODE = "business_directory";
const DEFAULT_ENTITY_TYPE = "general";
const DEFAULT_REQUEST_SOURCE = "api";
const DEFAULT_SUGGESTION_STATUS_FILTER: SuggestionStatusFilter = "needs_review";
const MAX_ADMIN_COMMENT_LENGTH = 2000;

const UNSAFE_GENERIC_CATEGORY_SLUGS = new Set([
  "other",
  "general",
  "review",
  "unknown",
  "misc",
  "miscellaneous",
  "uncategorized",
  "category",
  "service",
  "services",
]);

const SUGGESTION_REQUEST_SELECT = `
  id,
  user_text,
  locale,
  context_code,
  resolved_context_id,
  entity_type,
  entity_id,
  request_source,
  source_type,
  created_by_user_id,
  proposed_object_text,
  proposed_action_text,
  proposed_category_text,
  ai_status,
  ai_confidence,
  ai_model,
  ai_prompt_version,
  ai_suggested_object_text,
  ai_suggested_action_text,
  ai_suggested_category_text,
  ai_suggested_object_type_id,
  ai_suggested_action_type_id,
  ai_suggested_contextual_category_id,
  matched_existing_category_id,
  ai_analysis_json,
  ai_error_message,
  status,
  admin_decision,
  admin_comment,
  reviewed_by_user_id,
  reviewed_at,
  created_at,
  updated_at
`;

const ALLOWED_ENTITY_TYPES = new Set([
  "organization",
  "offer",
  "certificate",
  "purchase_confirmation",
  "personal_activity",
  "health_activity",
  "learning_activity",
  "user_profile",
  "general",
]);

const ALLOWED_REQUEST_SOURCES = new Set([
  "directory_category_picker",
  "organization_profile",
  "organization_onboarding",
  "offer_form",
  "admin_panel",
  "api",
  "import",
  "other",
]);

const ALLOWED_SUGGESTION_STATUS_FILTERS = new Set<SuggestionStatusFilter>([
  "all",
  "draft",
  "suggested",
  "needs_review",
  "approved",
  "merged",
  "rejected",
  "archived",
]);

const ALLOWED_MODERATION_ACTIONS = new Set<SuggestionModerationAction>([
  "reject",
  "archive",
  "analyze",
  "approve_existing_match",
  "approve_new_category",
]);

const AI_ANALYSIS_ALLOWED_STATUSES = new Set([
  "draft",
  "suggested",
  "needs_review",
]);

const APPROVE_EXISTING_MATCH_ALLOWED_STATUSES = new Set([
  "draft",
  "suggested",
  "needs_review",
]);

const APPROVE_NEW_CATEGORY_ALLOWED_STATUSES = new Set([
  "draft",
  "suggested",
  "needs_review",
]);

const APPROVE_NEW_CATEGORY_ALLOWED_AI_STATUSES = new Set([
  "new_category_suggested",
  "low_confidence",
]);

const MUTATION_ADMIN_ROLES = new Set(["owner", "admin", "moderator"]);

function normalizeStringValue(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return trimmedValue;
}

function normalizeOptionalStringValue(value: unknown) {
  const normalizedValue = normalizeStringValue(value);

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue;
}

function normalizeCodeValue(value: unknown, fallbackValue: string) {
  const normalizedValue = normalizeStringValue(value);

  if (!normalizedValue) {
    return fallbackValue;
  }

  return normalizedValue.toLowerCase();
}

function normalizeLocale(value: unknown) {
  const normalizedValue = normalizeStringValue(value);

  if (!normalizedValue) {
    return DEFAULT_LOCALE;
  }

  return normalizedValue.toLowerCase();
}

function normalizeEntityType(value: unknown) {
  const normalizedValue = normalizeCodeValue(value, DEFAULT_ENTITY_TYPE);

  if (!ALLOWED_ENTITY_TYPES.has(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

function normalizeRequestSource(value: unknown) {
  const normalizedValue = normalizeCodeValue(value, DEFAULT_REQUEST_SOURCE);

  if (!ALLOWED_REQUEST_SOURCES.has(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

function normalizeSuggestionStatusFilter(
  value: string | null
): SuggestionStatusFilter {
  const normalizedValue = normalizeStringValue(value);

  if (!normalizedValue) {
    return DEFAULT_SUGGESTION_STATUS_FILTER;
  }

  const lowerValue = normalizedValue.toLowerCase() as SuggestionStatusFilter;

  if (!ALLOWED_SUGGESTION_STATUS_FILTERS.has(lowerValue)) {
    return DEFAULT_SUGGESTION_STATUS_FILTER;
  }

  return lowerValue;
}

function normalizeModerationAction(value: unknown) {
  const normalizedValue = normalizeStringValue(value);

  if (!normalizedValue) {
    return null;
  }

  const lowerValue = normalizedValue.toLowerCase() as SuggestionModerationAction;

  if (!ALLOWED_MODERATION_ACTIONS.has(lowerValue)) {
    return null;
  }

  return lowerValue;
}

function normalizeLimit(value: string | null) {
  const parsedValue = Number(value ?? "50");

  if (!Number.isFinite(parsedValue)) {
    return 50;
  }

  return Math.min(Math.max(Math.trunc(parsedValue), 1), 100);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeEntityId(value: unknown) {
  const normalizedValue = normalizeStringValue(value);

  if (!normalizedValue) {
    return null;
  }

  if (!isUuid(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

function normalizeSuggestionId(value: unknown) {
  const normalizedValue = normalizeStringValue(value);

  if (!normalizedValue) {
    return null;
  }

  if (!isUuid(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

function normalizeAdminComment(value: unknown) {
  const normalizedValue = normalizeOptionalStringValue(value);

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.length > MAX_ADMIN_COMMENT_LENGTH) {
    return null;
  }

  return normalizedValue;
}

function normalizeCategorySlug(value: unknown) {
  const normalizedValue = normalizeStringValue(value);

  if (!normalizedValue) {
    return null;
  }

  const slug = normalizedValue
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");

  return slug || null;
}

function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableJsonValue(item));
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const sortedRecord: Record<string, unknown> = {};

    for (const key of Object.keys(record).sort()) {
      sortedRecord[key] = stableJsonValue(record[key]);
    }

    return sortedRecord;
  }

  return value;
}

function stableStringify(value: unknown) {
  return JSON.stringify(stableJsonValue(value));
}

function sha256Hex(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function getStatusForModerationAction(
  action: SuggestionStatusChangingAction
): "rejected" | "archived" {
  if (action === "archive") {
    return "archived";
  }

  return "rejected";
}

function getAuditEventTypeForModerationAction(
  action: SuggestionStatusChangingAction
): "rejected" | "archived" {
  if (action === "archive") {
    return "archived";
  }

  return "rejected";
}

function getMatchedExistingCategoryId(suggestion: ExistingSuggestionRow) {
  return (
    suggestion.matched_existing_category_id ??
    suggestion.ai_suggested_contextual_category_id
  );
}

function isSuggestionEligibleForAiAnalysis(suggestion: ExistingSuggestionRow) {
  return AI_ANALYSIS_ALLOWED_STATUSES.has(suggestion.status);
}

function isSuggestionEligibleForApproveExistingMatch(
  suggestion: ExistingSuggestionRow
) {
  return APPROVE_EXISTING_MATCH_ALLOWED_STATUSES.has(suggestion.status);
}

function isSuggestionEligibleForApproveNewCategory(
  suggestion: ExistingSuggestionRow
) {
  return APPROVE_NEW_CATEGORY_ALLOWED_STATUSES.has(suggestion.status);
}

function isAiStatusEligibleForApproveNewCategory(
  suggestion: ExistingSuggestionRow
) {
  if (!suggestion.ai_status) {
    return false;
  }

  return APPROVE_NEW_CATEGORY_ALLOWED_AI_STATUSES.has(suggestion.ai_status);
}

function getRecord(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getJsonString(record: Record<string, unknown> | null, key: string) {
  if (!record) {
    return null;
  }

  return normalizeOptionalStringValue(record[key]);
}

function createSuggestionSnapshot(suggestion: SuggestionRequestRow) {
  return {
    id: suggestion.id,
    userText: suggestion.user_text,
    locale: suggestion.locale,
    contextCode: suggestion.context_code,
    entityType: suggestion.entity_type,
    entityId: suggestion.entity_id,
    requestSource: suggestion.request_source,
    sourceType: suggestion.source_type,
    status: suggestion.status,
    adminDecision: suggestion.admin_decision,
    adminComment: suggestion.admin_comment,
    reviewedByUserId: suggestion.reviewed_by_user_id,
    reviewedAt: suggestion.reviewed_at,
    aiStatus: suggestion.ai_status,
    aiConfidence: suggestion.ai_confidence,
    aiModel: suggestion.ai_model,
    aiPromptVersion: suggestion.ai_prompt_version,
    aiSuggestedObjectText: suggestion.ai_suggested_object_text,
    aiSuggestedActionText: suggestion.ai_suggested_action_text,
    aiSuggestedCategoryText: suggestion.ai_suggested_category_text,
    aiSuggestedContextualCategoryId:
      suggestion.ai_suggested_contextual_category_id,
    matchedExistingCategoryId: suggestion.matched_existing_category_id,
    aiErrorMessage: suggestion.ai_error_message,
    updatedAt: suggestion.updated_at,
  };
}

function getSuggestedNewCategoryData(
  suggestion: ExistingSuggestionRow,
  body: SuggestionModerationRequestBody
): SuggestedNewCategoryData | null {
  const explicitName = normalizeOptionalStringValue(body.newCategoryName);
  const explicitSlug = normalizeCategorySlug(
    body.newCategorySlug ?? body.newCategoryName
  );
  const explicitDescription = normalizeOptionalStringValue(
    body.newCategoryDescription
  );

  if (explicitName || explicitSlug || explicitDescription) {
    if (!explicitName || !explicitSlug) {
      return null;
    }

    return {
      name: explicitName,
      slug: explicitSlug,
      description: explicitDescription,
      source: "admin_explicit",
    };
  }

  const analysisRecord = getRecord(suggestion.ai_analysis_json);

  const categoryName =
    normalizeOptionalStringValue(suggestion.ai_suggested_category_text) ??
    getJsonString(analysisRecord, "categoryText") ??
    normalizeOptionalStringValue(suggestion.proposed_category_text);

  if (!categoryName) {
    return null;
  }

  const rawCategorySlug =
    getJsonString(analysisRecord, "categorySlug") ?? categoryName;

  const categorySlug = normalizeCategorySlug(rawCategorySlug);

  if (!categorySlug) {
    return null;
  }

  return {
    name: categoryName,
    slug: categorySlug,
    description: null,
    source: "ai_suggested",
  };
}

async function getLatestSuggestionAuditEventHash(
  suggestionRequestId: string
): Promise<{
  previousHash: string | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("object_action_suggestion_events")
    .select(
      `
      id,
      record_hash,
      created_at
    `
    )
    .eq("suggestion_request_id", suggestionRequestId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return {
      previousHash: null,
      errorMessage: error.message,
    };
  }

  const rows = (data as unknown as SuggestionAuditEventHashRow[] | null) ?? [];

  return {
    previousHash: rows[0]?.record_hash ?? null,
    errorMessage: null,
  };
}

async function createObjectActionSuggestionAuditEvent(
  input: CreateSuggestionAuditEventInput
) {
  const {
    previousHash,
    errorMessage: previousHashErrorMessage,
  } = await getLatestSuggestionAuditEventHash(input.suggestionRequestId);

  if (previousHashErrorMessage) {
    return previousHashErrorMessage;
  }

  const eventCreatedAt = new Date().toISOString();

  const eventPayload = {
    suggestion_request_id: input.suggestionRequestId,
    actor_user_id: input.appUser?.id ?? null,
    actor_role: input.actorRole ?? input.platformAdmin?.role ?? null,
    event_type: input.eventType,
    event_source: input.eventSource ?? "admin_ui",
    status_before: input.statusBefore,
    status_after: input.statusAfter,
    ai_status_before: input.aiStatusBefore,
    ai_status_after: input.aiStatusAfter,
    admin_decision: input.adminDecision,
    matched_existing_category_id: input.matchedExistingCategoryId ?? null,
    created_contextual_category_id: input.createdContextualCategoryId ?? null,
    previous_values: input.previousValues ?? null,
    new_values: input.newValues ?? null,
    metadata_json: input.metadataJson ?? {},
    public_note: input.publicNote ?? null,
    internal_note: input.internalNote ?? null,
    previous_hash: previousHash,
    created_at: eventCreatedAt,
  };

  const recordHash = sha256Hex(eventPayload);

  const { error } = await supabase
    .from("object_action_suggestion_events")
    .insert({
      ...eventPayload,
      record_hash: recordHash,
    });

  if (error) {
    return error.message;
  }

  return null;
}

function createAuditErrorResponse(
  auditErrorMessage: string,
  suggestionRequest: SuggestionRequestRow
) {
  return NextResponse.json(
    {
      ok: false,
      error: `Suggestion request mutation succeeded, but audit event creation failed: ${auditErrorMessage}`,
      suggestionRequest,
    },
    { status: 500 }
  );
}

async function getResolvedContext(contextCode: string) {
  const { data, error } = await supabase
    .from("contexts")
    .select(
      `
      id,
      code,
      status,
      is_active
    `
    )
    .eq("code", contextCode)
    .eq("is_active", true)
    .in("status", ["approved", "published"])
    .limit(1);

  if (error) {
    return {
      context: null,
      errorMessage: error.message,
    };
  }

  const contextRows = (data as unknown as ContextRow[] | null) ?? [];

  return {
    context: contextRows[0] ?? null,
    errorMessage: null,
  };
}

async function getExistingCategoriesForSuggestionAnalysis(
  contextCode: string
): Promise<{
  categories: ObjectActionExistingCategoryInput[];
  errorMessage: string | null;
}> {
  const { context, errorMessage: contextErrorMessage } =
    await getResolvedContext(contextCode);

  if (contextErrorMessage) {
    return {
      categories: [],
      errorMessage: contextErrorMessage,
    };
  }

  if (!context) {
    return {
      categories: [],
      errorMessage: "contextCode was not found.",
    };
  }

  const { data, error } = await supabase
    .from("contextual_categories")
    .select(
      `
      id,
      slug,
      name,
      description
    `
    )
    .eq("context_id", context.id)
    .eq("is_active", true)
    .in("status", ["approved", "published"])
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(100);

  if (error) {
    return {
      categories: [],
      errorMessage: error.message,
    };
  }

  const categoryRows = (data as unknown as ContextualCategoryRow[] | null) ?? [];

  return {
    categories: categoryRows.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
    })),
    errorMessage: null,
  };
}

async function getContextualCategoryForSuggestion(
  contextCode: string,
  categoryId: string
): Promise<{
  category: ContextualCategoryRow | null;
  errorMessage: string | null;
}> {
  const { context, errorMessage: contextErrorMessage } =
    await getResolvedContext(contextCode);

  if (contextErrorMessage) {
    return {
      category: null,
      errorMessage: contextErrorMessage,
    };
  }

  if (!context) {
    return {
      category: null,
      errorMessage: "contextCode was not found.",
    };
  }

  const { data, error } = await supabase
    .from("contextual_categories")
    .select(
      `
      id,
      slug,
      name,
      description
    `
    )
    .eq("id", categoryId)
    .eq("context_id", context.id)
    .eq("is_active", true)
    .in("status", ["approved", "published"])
    .limit(1);

  if (error) {
    return {
      category: null,
      errorMessage: error.message,
    };
  }

  const categoryRows = (data as unknown as ContextualCategoryRow[] | null) ?? [];

  return {
    category: categoryRows[0] ?? null,
    errorMessage: null,
  };
}

async function getContextualCategoryBySlug(
  contextId: string,
  slug: string
): Promise<{
  category: ContextualCategoryRow | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("contextual_categories")
    .select(
      `
      id,
      slug,
      name,
      description
    `
    )
    .eq("context_id", contextId)
    .ilike("slug", slug)
    .limit(1);

  if (error) {
    return {
      category: null,
      errorMessage: error.message,
    };
  }

  const categoryRows = (data as unknown as ContextualCategoryRow[] | null) ?? [];

  return {
    category: categoryRows[0] ?? null,
    errorMessage: null,
  };
}

async function getOptionalCurrentAppUser(): Promise<{
  appUser: AppUserRow | null;
  errorMessage: string | null;
}> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      appUser: null,
      errorMessage: null,
    };
  }

  const { data, error } = await supabase
    .from("app_users")
    .select(
      `
      id,
      auth0_sub,
      email,
      name
    `
    )
    .eq("auth0_sub", session.user.sub)
    .limit(1);

  if (error) {
    return {
      appUser: null,
      errorMessage: error.message,
    };
  }

  const appUserRows = (data as unknown as AppUserRow[] | null) ?? [];

  if (!appUserRows[0]) {
    return {
      appUser: null,
      errorMessage: "Authenticated Auth0 user is not linked to app_users.",
    };
  }

  return {
    appUser: appUserRows[0],
    errorMessage: null,
  };
}

async function getCurrentAppUser(): Promise<{
  appUser: AppUserRow | null;
  errorMessage: string | null;
  status: number;
}> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      appUser: null,
      errorMessage: "Not authenticated.",
      status: 401,
    };
  }

  const { data, error } = await supabase
    .from("app_users")
    .select(
      `
      id,
      auth0_sub,
      email,
      name
    `
    )
    .eq("auth0_sub", session.user.sub)
    .limit(1);

  if (error) {
    return {
      appUser: null,
      errorMessage: error.message,
      status: 500,
    };
  }

  const appUserRows = (data as unknown as AppUserRow[] | null) ?? [];

  if (!appUserRows[0]) {
    return {
      appUser: null,
      errorMessage: "App user not found.",
      status: 403,
    };
  }

  return {
    appUser: appUserRows[0],
    errorMessage: null,
    status: 200,
  };
}

async function requirePlatformAdmin(): Promise<{
  appUser: AppUserRow | null;
  platformAdmin: PlatformAdminRow | null;
  errorMessage: string | null;
  status: number;
}> {
  const {
    appUser,
    errorMessage: appUserErrorMessage,
    status: appUserStatus,
  } = await getCurrentAppUser();

  if (appUserErrorMessage || !appUser) {
    return {
      appUser: null,
      platformAdmin: null,
      errorMessage: appUserErrorMessage ?? "App user not found.",
      status: appUserStatus,
    };
  }

  const { data, error } = await supabase
    .from("platform_admins")
    .select(
      `
      id,
      app_user_id,
      role,
      status
    `
    )
    .eq("app_user_id", appUser.id)
    .eq("status", "active")
    .limit(1);

  if (error) {
    return {
      appUser,
      platformAdmin: null,
      errorMessage: error.message,
      status: 500,
    };
  }

  const platformAdminRows =
    (data as unknown as PlatformAdminRow[] | null) ?? [];

  if (!platformAdminRows[0]) {
    return {
      appUser,
      platformAdmin: null,
      errorMessage: "Platform admin access required.",
      status: 403,
    };
  }

  return {
    appUser,
    platformAdmin: platformAdminRows[0],
    errorMessage: null,
    status: 200,
  };
}

async function getExistingSuggestionRequest(suggestionId: string): Promise<{
  suggestion: ExistingSuggestionRow | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("object_action_suggestion_requests")
    .select(SUGGESTION_REQUEST_SELECT)
    .eq("id", suggestionId)
    .limit(1);

  if (error) {
    return {
      suggestion: null,
      errorMessage: error.message,
    };
  }

  const rows = (data as unknown as ExistingSuggestionRow[] | null) ?? [];

  return {
    suggestion: rows[0] ?? null,
    errorMessage: null,
  };
}

function createValidationErrorResponse(message: string) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status: 400 }
  );
}

function createAuthErrorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

async function analyzeSuggestionRequest(
  suggestion: ExistingSuggestionRow,
  appUser: AppUserRow,
  platformAdmin: PlatformAdminRow
) {
  if (!isSuggestionEligibleForAiAnalysis(suggestion)) {
    return createValidationErrorResponse(
      `AI analysis can only run for draft, suggested or needs_review suggestions. Current status: ${suggestion.status}.`
    );
  }

  const {
    categories,
    errorMessage: categoriesErrorMessage,
  } = await getExistingCategoriesForSuggestionAnalysis(suggestion.context_code);

  if (categoriesErrorMessage) {
    return NextResponse.json(
      {
        ok: false,
        error: categoriesErrorMessage,
      },
      { status: 500 }
    );
  }

  const analysis = await analyzeObjectActionSuggestion({
    userText: suggestion.user_text,
    locale: suggestion.locale,
    contextCode: suggestion.context_code,
    existingCategories: categories,
  });

  const analyzedAt = new Date().toISOString();

  const analysisJson = {
    promptVersion: analysis.aiPromptVersion,
    model: analysis.aiModel,
    analyzedAt,
    contextCode: suggestion.context_code,
    locale: suggestion.locale,
    existingCategoriesConsidered: categories.length,
    aiStatus: analysis.aiStatus,
    objectText: analysis.objectText,
    actionText: analysis.actionText,
    categoryText: analysis.categoryText,
    categorySlug: analysis.categorySlug,
    confidence: analysis.confidence,
    matchedExistingCategoryId: analysis.matchedExistingCategoryId,
    rationale: analysis.rationale,
    riskNotes: analysis.riskNotes,
    rawAnalysisJson: analysis.rawAnalysisJson,
    safetyNote:
      "AI analysis is advisory only. It does not create, approve, publish or merge Object-Action Rubricator data.",
  };

  const { data, error } = await supabase
    .from("object_action_suggestion_requests")
    .update({
      ai_status: analysis.aiStatus,
      ai_confidence: analysis.confidence,
      ai_model: analysis.aiModel,
      ai_prompt_version: analysis.aiPromptVersion,
      ai_suggested_object_text: analysis.objectText,
      ai_suggested_action_text: analysis.actionText,
      ai_suggested_category_text: analysis.categoryText,
      ai_suggested_contextual_category_id: analysis.matchedExistingCategoryId,
      matched_existing_category_id: analysis.matchedExistingCategoryId,
      ai_analysis_json: analysisJson,
      ai_error_message: analysis.errorMessage,
    })
    .eq("id", suggestion.id)
    .select(SUGGESTION_REQUEST_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  const updatedSuggestion = data as unknown as SuggestionRequestRow;

  const auditErrorMessage = await createObjectActionSuggestionAuditEvent({
    suggestionRequestId: suggestion.id,
    appUser,
    platformAdmin,
    eventType: "ai_analyzed",
    statusBefore: suggestion.status,
    statusAfter: updatedSuggestion.status,
    aiStatusBefore: suggestion.ai_status,
    aiStatusAfter: updatedSuggestion.ai_status,
    adminDecision: null,
    matchedExistingCategoryId: updatedSuggestion.matched_existing_category_id,
    previousValues: createSuggestionSnapshot(suggestion),
    newValues: createSuggestionSnapshot(updatedSuggestion),
    metadataJson: {
      action: "analyze",
      analyzedAt,
      aiStatus: analysis.aiStatus,
      confidence: analysis.confidence,
      model: analysis.aiModel,
      promptVersion: analysis.aiPromptVersion,
      existingCategoriesConsidered: categories.length,
      matchedExistingCategoryId: analysis.matchedExistingCategoryId,
      errorMessage: analysis.errorMessage,
      publicDataMutation: false,
      safetyNote:
        "AI analysis is advisory only. It does not create, approve, publish or merge Object-Action Rubricator data.",
    },
    internalNote: analysis.errorMessage
      ? `AI analysis failed: ${analysis.errorMessage}`
      : `AI analysis completed with status ${analysis.aiStatus}.`,
  });

  if (auditErrorMessage) {
    return createAuditErrorResponse(auditErrorMessage, updatedSuggestion);
  }

  return NextResponse.json({
    ok: true,
    suggestionRequest: updatedSuggestion,
    aiAnalysis: {
      aiStatus: analysis.aiStatus,
      confidence: analysis.confidence,
      objectText: analysis.objectText,
      actionText: analysis.actionText,
      categoryText: analysis.categoryText,
      categorySlug: analysis.categorySlug,
      matchedExistingCategoryId: analysis.matchedExistingCategoryId,
      rationale: analysis.rationale,
      riskNotes: analysis.riskNotes,
      errorMessage: analysis.errorMessage,
      model: analysis.aiModel,
      promptVersion: analysis.aiPromptVersion,
      existingCategoriesConsidered: categories.length,
      analyzedAt,
    },
  });
}

async function approveExistingMatchSuggestionRequest(
  suggestion: ExistingSuggestionRow,
  appUser: AppUserRow,
  platformAdmin: PlatformAdminRow,
  adminComment: string | null
) {
  if (!isSuggestionEligibleForApproveExistingMatch(suggestion)) {
    return createValidationErrorResponse(
      `approve_existing_match can only run for draft, suggested or needs_review suggestions. Current status: ${suggestion.status}.`
    );
  }

  if (suggestion.ai_status !== "matched_existing") {
    return createValidationErrorResponse(
      `approve_existing_match requires ai_status=matched_existing. Current ai_status: ${
        suggestion.ai_status ?? "null"
      }.`
    );
  }

  const matchedExistingCategoryId = getMatchedExistingCategoryId(suggestion);

  if (!matchedExistingCategoryId || !isUuid(matchedExistingCategoryId)) {
    return createValidationErrorResponse(
      "approve_existing_match requires a valid matched_existing_category_id."
    );
  }

  const {
    category,
    errorMessage: categoryErrorMessage,
  } = await getContextualCategoryForSuggestion(
    suggestion.context_code,
    matchedExistingCategoryId
  );

  if (categoryErrorMessage) {
    return NextResponse.json(
      {
        ok: false,
        error: categoryErrorMessage,
      },
      { status: 500 }
    );
  }

  if (!category) {
    return createValidationErrorResponse(
      "Matched existing category was not found in the same active published context."
    );
  }

  const nowIso = new Date().toISOString();
  const finalAdminComment =
    adminComment ??
    `Merged with existing category: ${category.name} (${category.slug}).`;

  const { data, error } = await supabase
    .from("object_action_suggestion_requests")
    .update({
      status: "merged",
      admin_decision: "approve_existing_match",
      admin_comment: finalAdminComment,
      reviewed_by_user_id: appUser.id,
      reviewed_at: nowIso,
      matched_existing_category_id: category.id,
      ai_suggested_contextual_category_id: category.id,
    })
    .eq("id", suggestion.id)
    .select(SUGGESTION_REQUEST_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  const updatedSuggestion = data as unknown as SuggestionRequestRow;

  const auditErrorMessage = await createObjectActionSuggestionAuditEvent({
    suggestionRequestId: suggestion.id,
    appUser,
    platformAdmin,
    eventType: "approve_existing_match",
    statusBefore: suggestion.status,
    statusAfter: updatedSuggestion.status,
    aiStatusBefore: suggestion.ai_status,
    aiStatusAfter: updatedSuggestion.ai_status,
    adminDecision: "approve_existing_match",
    matchedExistingCategoryId: category.id,
    previousValues: createSuggestionSnapshot(suggestion),
    newValues: createSuggestionSnapshot(updatedSuggestion),
    metadataJson: {
      action: "approve_existing_match",
      reviewedAt: nowIso,
      matchedExistingCategoryId: category.id,
      matchedExistingCategoryName: category.name,
      matchedExistingCategorySlug: category.slug,
      publicDataMutation: false,
      safetyNote:
        "Suggestion request was merged with an existing category. No new public category was created.",
    },
    internalNote: finalAdminComment,
  });

  if (auditErrorMessage) {
    return createAuditErrorResponse(auditErrorMessage, updatedSuggestion);
  }

  return NextResponse.json({
    ok: true,
    suggestionRequest: updatedSuggestion,
    moderation: {
      action: "approve_existing_match",
      previousStatus: suggestion.status,
      nextStatus: "merged",
      reviewedByUserId: appUser.id,
      reviewedAt: nowIso,
      matchedExistingCategoryId: category.id,
      matchedExistingCategoryName: category.name,
      matchedExistingCategorySlug: category.slug,
      publicDataMutation: false,
      note:
        "Suggestion request was merged with an existing category. No new public category was created.",
    },
  });
}

async function approveNewCategorySuggestionRequest(
  suggestion: ExistingSuggestionRow,
  appUser: AppUserRow,
  platformAdmin: PlatformAdminRow,
  adminComment: string | null,
  body: SuggestionModerationRequestBody
) {
  if (!isSuggestionEligibleForApproveNewCategory(suggestion)) {
    return createValidationErrorResponse(
      `approve_new_category can only run for draft, suggested or needs_review suggestions. Current status: ${suggestion.status}.`
    );
  }

  if (!isAiStatusEligibleForApproveNewCategory(suggestion)) {
    return createValidationErrorResponse(
      `approve_new_category requires ai_status=new_category_suggested or low_confidence. Current ai_status: ${
        suggestion.ai_status ?? "null"
      }.`
    );
  }

  if (suggestion.ai_status === "low_confidence" && !adminComment) {
    return createValidationErrorResponse(
      "approve_new_category for low_confidence AI analysis requires an explicit adminComment."
    );
  }

  const explicitNewCategoryName = normalizeOptionalStringValue(
    body.newCategoryName
  );
  const explicitNewCategorySlug = normalizeCategorySlug(body.newCategorySlug);

  if (
    suggestion.ai_status === "low_confidence" &&
    (!explicitNewCategoryName || !explicitNewCategorySlug)
  ) {
    return createValidationErrorResponse(
      "approve_new_category for low_confidence AI analysis requires explicit newCategoryName and newCategorySlug."
    );
  }

  const suggestedCategory = getSuggestedNewCategoryData(suggestion, body);

  if (!suggestedCategory) {
    return createValidationErrorResponse(
      "approve_new_category requires a non-empty category name and URL-safe category slug."
    );
  }

  if (UNSAFE_GENERIC_CATEGORY_SLUGS.has(suggestedCategory.slug)) {
    return createValidationErrorResponse(
      `approve_new_category rejected unsafe generic slug "${suggestedCategory.slug}". Provide explicit newCategoryName and newCategorySlug with a specific category name.`
    );
  }

  const { context, errorMessage: contextErrorMessage } =
    await getResolvedContext(suggestion.context_code);

  if (contextErrorMessage) {
    return NextResponse.json(
      {
        ok: false,
        error: contextErrorMessage,
      },
      { status: 500 }
    );
  }

  if (!context) {
    return createValidationErrorResponse("contextCode was not found.");
  }

  const {
    category: existingCategoryWithSameSlug,
    errorMessage: existingCategoryErrorMessage,
  } = await getContextualCategoryBySlug(context.id, suggestedCategory.slug);

  if (existingCategoryErrorMessage) {
    return NextResponse.json(
      {
        ok: false,
        error: existingCategoryErrorMessage,
      },
      { status: 500 }
    );
  }

  if (existingCategoryWithSameSlug) {
    return createValidationErrorResponse(
      `A contextual category with slug "${suggestedCategory.slug}" already exists in this context. Use approve_existing_match or choose another slug later.`
    );
  }

  const nowIso = new Date().toISOString();
  const finalAdminComment =
    adminComment ??
    `Approved new category: ${suggestedCategory.name} (${suggestedCategory.slug}).`;

  const { data: createdCategoryData, error: createCategoryError } =
    await supabase
      .from("contextual_categories")
      .insert({
        context_id: context.id,
        parent_id: null,
        slug: suggestedCategory.slug,
        name: suggestedCategory.name,
        description: suggestedCategory.description,
        status: "approved",
        source_type: "owner_confirmed",
        sort_order: 100,
        is_active: true,
      })
      .select(
        `
        id,
        slug,
        name,
        description
      `
      )
      .single();

  if (createCategoryError) {
    return NextResponse.json(
      {
        ok: false,
        error: createCategoryError.message,
      },
      { status: 500 }
    );
  }

  const createdCategory =
    createdCategoryData as unknown as ContextualCategoryRow;

  const { data, error } = await supabase
    .from("object_action_suggestion_requests")
    .update({
      status: "approved",
      admin_decision: "approve",
      admin_comment: finalAdminComment,
      reviewed_by_user_id: appUser.id,
      reviewed_at: nowIso,
      ai_suggested_contextual_category_id: createdCategory.id,
      matched_existing_category_id: null,
      ai_suggested_category_text: createdCategory.name,
    })
    .eq("id", suggestion.id)
    .select(SUGGESTION_REQUEST_SELECT)
    .single();

  if (error) {
    await supabase
      .from("contextual_categories")
      .update({
        status: "archived",
        is_active: false,
      })
      .eq("id", createdCategory.id);

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        compensation:
          "New contextual category was archived because suggestion request update failed.",
      },
      { status: 500 }
    );
  }

  const updatedSuggestion = data as unknown as SuggestionRequestRow;

  const auditErrorMessage = await createObjectActionSuggestionAuditEvent({
    suggestionRequestId: suggestion.id,
    appUser,
    platformAdmin,
    eventType: "approve_new_category",
    statusBefore: suggestion.status,
    statusAfter: updatedSuggestion.status,
    aiStatusBefore: suggestion.ai_status,
    aiStatusAfter: updatedSuggestion.ai_status,
    adminDecision: "approve",
    matchedExistingCategoryId: null,
    createdContextualCategoryId: createdCategory.id,
    previousValues: createSuggestionSnapshot(suggestion),
    newValues: createSuggestionSnapshot(updatedSuggestion),
    metadataJson: {
      action: "approve_new_category",
      reviewedAt: nowIso,
      createdContextualCategoryId: createdCategory.id,
      createdContextualCategoryName: createdCategory.name,
      createdContextualCategorySlug: createdCategory.slug,
      newCategorySource: suggestedCategory.source,
      contextId: context.id,
      publicDataMutation: true,
      safetyNote:
        "A new contextual category was created only after explicit platform admin approval.",
    },
    internalNote: finalAdminComment,
  });

  if (auditErrorMessage) {
    return createAuditErrorResponse(auditErrorMessage, updatedSuggestion);
  }

  return NextResponse.json({
    ok: true,
    suggestionRequest: updatedSuggestion,
    moderation: {
      action: "approve_new_category",
      previousStatus: suggestion.status,
      nextStatus: "approved",
      reviewedByUserId: appUser.id,
      reviewedAt: nowIso,
      createdContextualCategoryId: createdCategory.id,
      createdContextualCategoryName: createdCategory.name,
      createdContextualCategorySlug: createdCategory.slug,
      newCategorySource: suggestedCategory.source,
      publicDataMutation: true,
      note:
        "New contextual category was created after explicit platform admin approval.",
    },
  });
}

export async function GET(request: NextRequest) {
  const {
    appUser,
    platformAdmin,
    errorMessage: adminErrorMessage,
    status: adminStatus,
  } = await requirePlatformAdmin();

  if (adminErrorMessage || !appUser || !platformAdmin) {
    return createAuthErrorResponse(
      adminErrorMessage ?? "Platform admin access required.",
      adminStatus
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const statusFilter = normalizeSuggestionStatusFilter(
    searchParams.get("status")
  );
  const limit = normalizeLimit(searchParams.get("limit"));

  let query = supabase
    .from("object_action_suggestion_requests")
    .select(SUGGESTION_REQUEST_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    suggestionRequests: data ?? [],
    count: data?.length ?? 0,
    filters: {
      status: statusFilter,
      limit,
    },
    admin: {
      appUserId: appUser.id,
      email: appUser.email,
      name: appUser.name,
      role: platformAdmin.role,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const {
    appUser,
    platformAdmin,
    errorMessage: adminErrorMessage,
    status: adminStatus,
  } = await requirePlatformAdmin();

  if (adminErrorMessage || !appUser || !platformAdmin) {
    return createAuthErrorResponse(
      adminErrorMessage ?? "Platform admin access required.",
      adminStatus
    );
  }

  if (!MUTATION_ADMIN_ROLES.has(platformAdmin.role)) {
    return createAuthErrorResponse(
      "Platform admin role cannot mutate suggestion requests.",
      403
    );
  }

  let body: SuggestionModerationRequestBody;

  try {
    body = (await request.json()) as SuggestionModerationRequestBody;
  } catch {
    return createValidationErrorResponse("Invalid JSON body.");
  }

  const suggestionId = normalizeSuggestionId(body.id);

  if (!suggestionId) {
    return createValidationErrorResponse("id must be a valid UUID.");
  }

  const action = normalizeModerationAction(body.action);

  if (!action) {
    return createValidationErrorResponse(
      "action must be reject, archive, analyze, approve_existing_match or approve_new_category."
    );
  }

  const {
    suggestion,
    errorMessage: existingSuggestionErrorMessage,
  } = await getExistingSuggestionRequest(suggestionId);

  if (existingSuggestionErrorMessage) {
    return NextResponse.json(
      {
        ok: false,
        error: existingSuggestionErrorMessage,
      },
      { status: 500 }
    );
  }

  if (!suggestion) {
    return NextResponse.json(
      {
        ok: false,
        error: "Suggestion request not found.",
      },
      { status: 404 }
    );
  }

  if (action === "analyze") {
    return analyzeSuggestionRequest(suggestion, appUser, platformAdmin);
  }

  const adminComment = normalizeAdminComment(body.adminComment);

  if (body.adminComment && adminComment === null) {
    return createValidationErrorResponse(
      `adminComment must be ${MAX_ADMIN_COMMENT_LENGTH} characters or shorter.`
    );
  }

  if (action === "approve_existing_match") {
    return approveExistingMatchSuggestionRequest(
      suggestion,
      appUser,
      platformAdmin,
      adminComment
    );
  }

  if (action === "approve_new_category") {
    return approveNewCategorySuggestionRequest(
      suggestion,
      appUser,
      platformAdmin,
      adminComment,
      body
    );
  }

  if (suggestion.status === "approved" || suggestion.status === "merged") {
    return createValidationErrorResponse(
      "Approved or merged suggestion requests cannot be rejected or archived by this endpoint."
    );
  }

  const nextStatus = getStatusForModerationAction(action);
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("object_action_suggestion_requests")
    .update({
      status: nextStatus,
      admin_decision: action,
      admin_comment: adminComment,
      reviewed_by_user_id: appUser.id,
      reviewed_at: nowIso,
    })
    .eq("id", suggestion.id)
    .select(SUGGESTION_REQUEST_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  const updatedSuggestion = data as unknown as SuggestionRequestRow;
  const auditEventType = getAuditEventTypeForModerationAction(action);

  const auditErrorMessage = await createObjectActionSuggestionAuditEvent({
    suggestionRequestId: suggestion.id,
    appUser,
    platformAdmin,
    eventType: auditEventType,
    statusBefore: suggestion.status,
    statusAfter: updatedSuggestion.status,
    aiStatusBefore: suggestion.ai_status,
    aiStatusAfter: updatedSuggestion.ai_status,
    adminDecision: action,
    matchedExistingCategoryId: updatedSuggestion.matched_existing_category_id,
    previousValues: createSuggestionSnapshot(suggestion),
    newValues: createSuggestionSnapshot(updatedSuggestion),
    metadataJson: {
      action,
      reviewedAt: nowIso,
      publicDataMutation: false,
      safetyNote:
        "Reject and archive actions only change the suggestion request status. They do not create or publish Object-Action Rubricator data.",
    },
    internalNote: adminComment ?? `${action} action by platform admin.`,
  });

  if (auditErrorMessage) {
    return createAuditErrorResponse(auditErrorMessage, updatedSuggestion);
  }

  return NextResponse.json({
    ok: true,
    suggestionRequest: updatedSuggestion,
    moderation: {
      action,
      previousStatus: suggestion.status,
      nextStatus,
      reviewedByUserId: appUser.id,
      reviewedAt: nowIso,
    },
  });
}

export async function POST(request: NextRequest) {
  let body: SuggestionRequestBody;

  try {
    body = (await request.json()) as SuggestionRequestBody;
  } catch {
    return createValidationErrorResponse("Invalid JSON body.");
  }

  const userText = normalizeStringValue(body.userText);

  if (!userText) {
    return createValidationErrorResponse("userText is required.");
  }

  if (userText.length > 4000) {
    return createValidationErrorResponse(
      "userText must be 4000 characters or shorter."
    );
  }

  const locale = normalizeLocale(body.locale);

  if (locale.length > 20) {
    return createValidationErrorResponse(
      "locale must be 20 characters or shorter."
    );
  }

  const contextCode = normalizeCodeValue(
    body.contextCode,
    DEFAULT_CONTEXT_CODE
  );

  const entityType = normalizeEntityType(body.entityType);

  if (!entityType) {
    return createValidationErrorResponse("Unsupported entityType.");
  }

  const entityId = normalizeEntityId(body.entityId);

  if (body.entityId && !entityId) {
    return createValidationErrorResponse("entityId must be a valid UUID.");
  }

  const requestSource = normalizeRequestSource(body.requestSource);

  if (!requestSource) {
    return createValidationErrorResponse("Unsupported requestSource.");
  }

  const { appUser, errorMessage: optionalUserErrorMessage } =
    await getOptionalCurrentAppUser();

  const { context, errorMessage: contextErrorMessage } =
    await getResolvedContext(contextCode);

  if (contextErrorMessage) {
    return NextResponse.json(
      {
        ok: false,
        error: contextErrorMessage,
      },
      { status: 500 }
    );
  }

  if (!context) {
    return createValidationErrorResponse("contextCode was not found.");
  }

  const proposedObjectText = normalizeOptionalStringValue(
    body.proposedObjectText
  );
  const proposedActionText = normalizeOptionalStringValue(
    body.proposedActionText
  );
  const proposedCategoryText = normalizeOptionalStringValue(
    body.proposedCategoryText
  );

  const { data, error } = await supabase
    .from("object_action_suggestion_requests")
    .insert({
      user_text: userText,
      locale,
      context_code: context.code,
      resolved_context_id: context.id,
      entity_type: entityType,
      entity_id: entityId,
      request_source: requestSource,
      source_type: "user_submitted",
      created_by_user_id: appUser?.id ?? null,
      proposed_object_text: proposedObjectText,
      proposed_action_text: proposedActionText,
      proposed_category_text: proposedCategoryText,
      ai_status: "not_requested",
      ai_analysis_json: {},
      status: "needs_review",
    })
    .select(SUGGESTION_REQUEST_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  const createdSuggestion = data as unknown as SuggestionRequestRow;

  const auditErrorMessage = await createObjectActionSuggestionAuditEvent({
    suggestionRequestId: createdSuggestion.id,
    appUser,
    actorRole: appUser ? "submitter" : "anonymous",
    eventType: "created",
    eventSource: "api",
    statusBefore: null,
    statusAfter: createdSuggestion.status,
    aiStatusBefore: null,
    aiStatusAfter: createdSuggestion.ai_status,
    adminDecision: null,
    matchedExistingCategoryId: null,
    createdContextualCategoryId: null,
    previousValues: null,
    newValues: createSuggestionSnapshot(createdSuggestion),
    metadataJson: {
      action: "created",
      createdAt: createdSuggestion.created_at,
      contextId: context.id,
      contextCode: context.code,
      requestSource,
      sourceType: "user_submitted",
      entityType,
      entityId,
      locale,
      actorResolution: appUser ? "app_user" : "anonymous",
      optionalUserErrorMessage,
      publicDataMutation: false,
      safetyNote:
        "Suggestion request was created as a moderation request only. It does not create, approve, publish or merge Object-Action Rubricator data.",
    },
    internalNote: "Suggestion request created.",
  });

  if (auditErrorMessage) {
    return createAuditErrorResponse(auditErrorMessage, createdSuggestion);
  }

  return NextResponse.json(
    {
      ok: true,
      suggestionRequest: createdSuggestion,
    },
    { status: 201 }
  );
}