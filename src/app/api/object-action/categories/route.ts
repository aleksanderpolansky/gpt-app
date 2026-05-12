import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type CategoryAdminAction = "archive" | "deactivate" | "activate";

type CategoryEventType = "archived" | "deactivated" | "activated";

type CategoryMutationRequestBody = {
  id?: unknown;
  action?: unknown;
  adminComment?: unknown;
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

type ContextualCategoryRow = {
  id: string;
  context_id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  source_type: string | null;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ContextualCategoryEventRow = {
  id: string;
  contextual_category_id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  event_type: string;
  event_source: string;
  status_before: string | null;
  status_after: string | null;
  is_active_before: boolean | null;
  is_active_after: boolean | null;
  admin_comment: string | null;
  previous_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  metadata_json: Record<string, unknown>;
  public_note: string | null;
  internal_note: string | null;
  previous_hash: string | null;
  record_hash: string | null;
  created_at: string;
};

type LatestCategoryEventHashRow = {
  id: string;
  record_hash: string | null;
  created_at: string;
};

const MUTATION_ADMIN_ROLES = new Set(["owner", "admin", "moderator"]);
const MAX_ADMIN_COMMENT_LENGTH = 2000;

const CATEGORY_SELECT = `
  id,
  context_id,
  parent_id,
  slug,
  name,
  description,
  status,
  source_type,
  sort_order,
  is_active,
  created_at,
  updated_at
`;

const CATEGORY_EVENT_SELECT = `
  id,
  contextual_category_id,
  actor_user_id,
  actor_role,
  event_type,
  event_source,
  status_before,
  status_after,
  is_active_before,
  is_active_after,
  admin_comment,
  previous_values,
  new_values,
  metadata_json,
  public_note,
  internal_note,
  previous_hash,
  record_hash,
  created_at
`;

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

function normalizeCategoryAction(value: unknown): CategoryAdminAction | null {
  const normalizedValue = normalizeStringValue(value);

  if (!normalizedValue) {
    return null;
  }

  const lowerValue = normalizedValue.toLowerCase();

  if (
    lowerValue === "archive" ||
    lowerValue === "deactivate" ||
    lowerValue === "activate"
  ) {
    return lowerValue;
  }

  return null;
}

function normalizeAdminComment(value: unknown) {
  const normalizedValue = normalizeStringValue(value);

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.length > MAX_ADMIN_COMMENT_LENGTH) {
    return null;
  }

  return normalizedValue;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeCategoryId(value: unknown) {
  const normalizedValue = normalizeStringValue(value);

  if (!normalizedValue) {
    return null;
  }

  if (!isUuid(normalizedValue)) {
    return null;
  }

  return normalizedValue;
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

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValue(item));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sortedRecord: Record<string, unknown> = {};

    for (const key of Object.keys(record).sort()) {
      sortedRecord[key] = sortJsonValue(record[key]);
    }

    return sortedRecord;
  }

  return value;
}

function stableJsonStringify(value: unknown) {
  return JSON.stringify(sortJsonValue(value));
}

function createSha256Hash(value: unknown) {
  return crypto
    .createHash("sha256")
    .update(stableJsonStringify(value))
    .digest("hex");
}

function getCategoryEventType(action: CategoryAdminAction): CategoryEventType {
  if (action === "archive") {
    return "archived";
  }

  if (action === "deactivate") {
    return "deactivated";
  }

  return "activated";
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

async function getExistingCategory(categoryId: string): Promise<{
  category: ContextualCategoryRow | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("contextual_categories")
    .select(CATEGORY_SELECT)
    .eq("id", categoryId)
    .limit(1);

  if (error) {
    return {
      category: null,
      errorMessage: error.message,
    };
  }

  const rows = (data as unknown as ContextualCategoryRow[] | null) ?? [];

  return {
    category: rows[0] ?? null,
    errorMessage: null,
  };
}

async function getLatestCategoryEventHash(
  categoryId: string
): Promise<{
  latestEvent: LatestCategoryEventHashRow | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("contextual_category_events")
    .select(
      `
      id,
      record_hash,
      created_at
    `
    )
    .eq("contextual_category_id", categoryId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return {
      latestEvent: null,
      errorMessage: error.message,
    };
  }

  const rows = (data as unknown as LatestCategoryEventHashRow[] | null) ?? [];

  return {
    latestEvent: rows[0] ?? null,
    errorMessage: null,
  };
}

function getMutationPatch(action: CategoryAdminAction) {
  if (action === "archive") {
    return {
      status: "archived",
      is_active: false,
    };
  }

  if (action === "deactivate") {
    return {
      is_active: false,
    };
  }

  return {
    is_active: true,
  };
}

function getActionNote(params: {
  action: CategoryAdminAction;
  category: ContextualCategoryRow;
  adminComment: string | null;
  appUser: AppUserRow;
}) {
  const baseNote = {
    action: params.action,
    categoryId: params.category.id,
    categoryName: params.category.name,
    categorySlug: params.category.slug,
    previousStatus: params.category.status,
    previousIsActive: params.category.is_active,
    reviewedByUserId: params.appUser.id,
    reviewedAt: new Date().toISOString(),
    adminComment: params.adminComment,
    publicDataMutation: true,
    safetyNote:
      "Category admin action changes contextual category availability. It does not delete category history.",
  };

  return baseNote;
}

function buildCategoryEventPayload(params: {
  action: CategoryAdminAction;
  previousCategory: ContextualCategoryRow;
  updatedCategory: ContextualCategoryRow;
  appUser: AppUserRow;
  platformAdmin: PlatformAdminRow;
  adminComment: string | null;
  previousHash: string | null;
  latestEvent: LatestCategoryEventHashRow | null;
}) {
  const eventType = getCategoryEventType(params.action);

  const previousValues = {
    status: params.previousCategory.status,
    is_active: params.previousCategory.is_active,
    updated_at: params.previousCategory.updated_at,
  };

  const newValues = {
    status: params.updatedCategory.status,
    is_active: params.updatedCategory.is_active,
    updated_at: params.updatedCategory.updated_at,
  };

  const metadataJson = {
    action: params.action,
    categoryId: params.previousCategory.id,
    categoryName: params.previousCategory.name,
    categorySlug: params.previousCategory.slug,
    sourceType: params.previousCategory.source_type,
    contextId: params.previousCategory.context_id,
    parentId: params.previousCategory.parent_id,
    sortOrder: params.previousCategory.sort_order,
    publicDataMutation: true,
    previousEventId: params.latestEvent?.id ?? null,
    previousEventCreatedAt: params.latestEvent?.created_at ?? null,
    previousEventRecordHashWasMissing:
      Boolean(params.latestEvent) && !params.latestEvent?.record_hash,
    safetyNote:
      "Contextual category admin mutation. Category record is preserved; visibility/status changed only through admin action.",
  };

  const publicNote =
    params.action === "archive"
      ? "Contextual category was archived by platform admin."
      : params.action === "deactivate"
        ? "Contextual category was deactivated by platform admin."
        : "Contextual category was activated by platform admin.";

  const internalNote =
    params.adminComment ??
    `Contextual category ${params.action} action performed by platform admin.`;

  const stablePayloadForHash = {
    contextual_category_id: params.updatedCategory.id,
    actor_user_id: params.appUser.id,
    actor_role: params.platformAdmin.role,
    event_type: eventType,
    event_source: "admin_ui",
    status_before: params.previousCategory.status,
    status_after: params.updatedCategory.status,
    is_active_before: params.previousCategory.is_active,
    is_active_after: params.updatedCategory.is_active,
    admin_comment: params.adminComment,
    previous_values: previousValues,
    new_values: newValues,
    metadata_json: metadataJson,
    public_note: publicNote,
    internal_note: internalNote,
    previous_hash: params.previousHash,
  };

  const recordHash = createSha256Hash(stablePayloadForHash);

  return {
    eventType,
    previousValues,
    newValues,
    metadataJson,
    publicNote,
    internalNote,
    previousHash: params.previousHash,
    recordHash,
  };
}

async function createCategoryMutationEvent(params: {
  action: CategoryAdminAction;
  previousCategory: ContextualCategoryRow;
  updatedCategory: ContextualCategoryRow;
  appUser: AppUserRow;
  platformAdmin: PlatformAdminRow;
  adminComment: string | null;
}): Promise<{
  event: ContextualCategoryEventRow | null;
  errorMessage: string | null;
}> {
  const { latestEvent, errorMessage: latestEventErrorMessage } =
    await getLatestCategoryEventHash(params.updatedCategory.id);

  if (latestEventErrorMessage) {
    return {
      event: null,
      errorMessage: latestEventErrorMessage,
    };
  }

  const previousHash = latestEvent?.record_hash ?? null;

  const eventPayload = buildCategoryEventPayload({
    ...params,
    previousHash,
    latestEvent,
  });

  const { data, error } = await supabase
    .from("contextual_category_events")
    .insert({
      contextual_category_id: params.updatedCategory.id,
      actor_user_id: params.appUser.id,
      actor_role: params.platformAdmin.role,
      event_type: eventPayload.eventType,
      event_source: "admin_ui",
      status_before: params.previousCategory.status,
      status_after: params.updatedCategory.status,
      is_active_before: params.previousCategory.is_active,
      is_active_after: params.updatedCategory.is_active,
      admin_comment: params.adminComment,
      previous_values: eventPayload.previousValues,
      new_values: eventPayload.newValues,
      metadata_json: eventPayload.metadataJson,
      public_note: eventPayload.publicNote,
      internal_note: eventPayload.internalNote,
      previous_hash: eventPayload.previousHash,
      record_hash: eventPayload.recordHash,
    })
    .select(CATEGORY_EVENT_SELECT)
    .single();

  if (error) {
    return {
      event: null,
      errorMessage: error.message,
    };
  }

  return {
    event: data as unknown as ContextualCategoryEventRow,
    errorMessage: null,
  };
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
      "Platform admin role cannot mutate contextual categories.",
      403
    );
  }

  let body: CategoryMutationRequestBody;

  try {
    body = (await request.json()) as CategoryMutationRequestBody;
  } catch {
    return createValidationErrorResponse("Invalid JSON body.");
  }

  const categoryId = normalizeCategoryId(body.id);

  if (!categoryId) {
    return createValidationErrorResponse("id must be a valid UUID.");
  }

  const action = normalizeCategoryAction(body.action);

  if (!action) {
    return createValidationErrorResponse(
      "action must be archive, deactivate or activate."
    );
  }

  const adminComment = normalizeAdminComment(body.adminComment);

  if (body.adminComment && adminComment === null) {
    return createValidationErrorResponse(
      `adminComment must be ${MAX_ADMIN_COMMENT_LENGTH} characters or shorter.`
    );
  }

  if ((action === "archive" || action === "deactivate") && !adminComment) {
    return createValidationErrorResponse(
      `${action} requires an explicit adminComment.`
    );
  }

  const { category, errorMessage: categoryErrorMessage } =
    await getExistingCategory(categoryId);

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
    return NextResponse.json(
      {
        ok: false,
        error: "Contextual category not found.",
      },
      { status: 404 }
    );
  }

  if (action === "archive" && category.status === "archived") {
    return createValidationErrorResponse("Category is already archived.");
  }

  if (action === "deactivate" && category.is_active === false) {
    return createValidationErrorResponse("Category is already inactive.");
  }

  if (action === "activate" && category.is_active === true) {
    return createValidationErrorResponse("Category is already active.");
  }

  if (action === "activate" && category.status === "archived") {
    return createValidationErrorResponse(
      "Archived category cannot be activated by this endpoint. Create a separate restore flow later."
    );
  }

  const mutationPatch = getMutationPatch(action);
  const adminMetadata = getActionNote({
    action,
    category,
    adminComment,
    appUser,
  });

  const { data, error } = await supabase
    .from("contextual_categories")
    .update(mutationPatch)
    .eq("id", category.id)
    .select(CATEGORY_SELECT)
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

  const updatedCategory = data as unknown as ContextualCategoryRow;

  const { event, errorMessage: auditEventErrorMessage } =
    await createCategoryMutationEvent({
      action,
      previousCategory: category,
      updatedCategory,
      appUser,
      platformAdmin,
      adminComment,
    });

  if (auditEventErrorMessage || !event) {
    return NextResponse.json(
      {
        ok: false,
        error:
          auditEventErrorMessage ??
          "Contextual category was updated, but audit event was not created.",
        categoryMutationSucceeded: true,
        category: updatedCategory,
        warning:
          "The category mutation already happened. Investigate contextual_category_events before retrying the same action.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    category: updatedCategory,
    auditEvent: event,
    moderation: {
      action,
      previousCategory: category,
      updatedCategory,
      admin: {
        appUserId: appUser.id,
        email: appUser.email,
        name: appUser.name,
        role: platformAdmin.role,
      },
      metadata: {
        ...adminMetadata,
        nextStatus: updatedCategory.status,
        nextIsActive: updatedCategory.is_active,
        auditEventId: event.id,
        auditEventType: event.event_type,
        previousHash: event.previous_hash,
        recordHash: event.record_hash,
      },
      note:
        "Contextual category was updated by platform admin and category audit event was recorded. No category record was deleted.",
    },
  });
}