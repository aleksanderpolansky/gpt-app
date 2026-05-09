import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type CategoryAdminAction = "archive" | "deactivate" | "activate";

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

  return NextResponse.json({
    ok: true,
    category: updatedCategory,
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
      },
      note:
        "Contextual category was updated by platform admin. No category record was deleted.",
    },
  });
}