import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";
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

type ExistingSuggestionRow = {
  id: string;
  status: string;
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

type SuggestionModerationAction = "reject" | "archive";

const DEFAULT_LOCALE = "ru";
const DEFAULT_CONTEXT_CODE = "business_directory";
const DEFAULT_ENTITY_TYPE = "general";
const DEFAULT_REQUEST_SOURCE = "api";
const DEFAULT_SUGGESTION_STATUS_FILTER: SuggestionStatusFilter = "needs_review";
const MAX_ADMIN_COMMENT_LENGTH = 2000;

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

function getStatusForModerationAction(
  action: SuggestionModerationAction
): "rejected" | "archived" {
  if (action === "archive") {
    return "archived";
  }

  return "rejected";
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
    .select(
      `
      id,
      status
    `
    )
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
    .select(
      `
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
    `
    )
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
      "action must be either reject or archive."
    );
  }

  const adminComment = normalizeAdminComment(body.adminComment);

  if (body.adminComment && adminComment === null) {
    return createValidationErrorResponse(
      `adminComment must be ${MAX_ADMIN_COMMENT_LENGTH} characters or shorter.`
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
    .select(
      `
      id,
      user_text,
      locale,
      context_code,
      entity_type,
      entity_id,
      request_source,
      ai_status,
      status,
      admin_decision,
      admin_comment,
      reviewed_by_user_id,
      reviewed_at,
      created_at,
      updated_at
    `
    )
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

  return NextResponse.json({
    ok: true,
    suggestionRequest: data,
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
      proposed_object_text: proposedObjectText,
      proposed_action_text: proposedActionText,
      proposed_category_text: proposedCategoryText,
      ai_status: "not_requested",
      ai_analysis_json: {},
      status: "needs_review",
    })
    .select(
      `
      id,
      user_text,
      locale,
      context_code,
      resolved_context_id,
      entity_type,
      entity_id,
      request_source,
      ai_status,
      status,
      created_at
    `
    )
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

  return NextResponse.json(
    {
      ok: true,
      suggestionRequest: data,
    },
    { status: 201 }
  );
}