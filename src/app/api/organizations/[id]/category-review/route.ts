import { NextRequest, NextResponse } from "next/server";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const runtime = "nodejs";

type CategoryReviewAction =
  | "confirm_ai_candidate"
  | "remove_current_category"
  | "replace_current_category";

type CategoryReviewRequestBody = {
  action?: unknown;
  contextualCategoryId?: unknown;
  note?: unknown;
};

type CategoryReviewRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type AppUserRow = {
  id: string;
};

type OrganizationRow = {
  id: string;
  owner_actor_id: string | null;
  organization_name: string;
};

type ContextRow = {
  id: string;
  code: string;
};

type ObjectActionIdRow = {
  id: string;
};

type ContextualCategoryRow = {
  id: string;
  context_id: string;
  slug: string;
  name: string;
  status: string;
  is_active: boolean | null;
};

type CurrentClassificationRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  object_type_id: string | null;
  action_type_id: string | null;
  context_id: string;
  contextual_category_id: string | null;
  classification_role: string;
  is_primary: boolean | null;
  status: string;
  source_type: string | null;
  confidence: number | null;
  evidence_json: Record<string, unknown> | null;
  updated_at: string | null;
};

const ORGANIZATION_ENTITY_TYPE = "organization";
const BUSINESS_DIRECTORY_CONTEXT_CODE = "business_directory";
const PRIMARY_CLASSIFICATION_ROLE = "primary";
const OWNER_CONFIRMED_SOURCE_TYPE = "owner_confirmed";
const PUBLIC_CLASSIFICATION_STATUSES = ["approved", "published"] as const;
const MAX_NOTE_LENGTH = 1000;

function normalizeUuid(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      trimmedValue,
    )
  ) {
    return null;
  }

  return trimmedValue;
}

function normalizeAction(value: unknown): CategoryReviewAction | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (
    normalizedValue === "confirm_ai_candidate" ||
    normalizedValue === "remove_current_category" ||
    normalizedValue === "replace_current_category"
  ) {
    return normalizedValue;
  }

  return null;
}

function normalizeNote(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return trimmedValue.slice(0, MAX_NOTE_LENGTH);
}

function createErrorResponse(message: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status },
  );
}

function toPlainEvidenceJson(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function appendCategoryReviewEvent(input: {
  evidenceJson: Record<string, unknown> | null;
  action: CategoryReviewAction;
  reviewState: string;
  appUserId: string;
  note: string | null;
  nowIso: string;
  previousContextualCategoryId?: string | null;
  nextContextualCategoryId?: string | null;
}) {
  const baseEvidence = toPlainEvidenceJson(input.evidenceJson);
  const existingEvents = Array.isArray(baseEvidence.category_review_events)
    ? baseEvidence.category_review_events.filter(
        (event): event is Record<string, unknown> =>
          Boolean(event) && typeof event === "object" && !Array.isArray(event),
      )
    : [];

  const nextEvent = {
    action: input.action,
    review_state: input.reviewState,
    actor_type: "organization_owner",
    app_user_id: input.appUserId,
    note: input.note,
    happened_at: input.nowIso,
    previous_contextual_category_id:
      input.previousContextualCategoryId ?? null,
    next_contextual_category_id: input.nextContextualCategoryId ?? null,
  };

  return {
    ...baseEvidence,
    review_state: input.reviewState,
    last_owner_review_action: input.action,
    last_owner_reviewed_by_user_id: input.appUserId,
    last_owner_reviewed_at: input.nowIso,
    category_review_events: [...existingEvents.slice(-19), nextEvent],
  };
}

async function getCurrentActorContext(): Promise<{
  actorContext: Awaited<ReturnType<typeof resolveActiveActorContext>> | null;
  errorMessage: string | null;
  status: number;
}> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      actorContext: null,
      errorMessage: "Not authenticated.",
      status: 401,
    };
  }

  try {
    return {
      actorContext: await resolveActiveActorContext(session.user.sub),
      errorMessage: null,
      status: 200,
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        actorContext: null,
        errorMessage: error.message,
        status: error.status,
      };
    }

    return {
      actorContext: null,
      errorMessage:
        error instanceof Error
          ? error.message
          : "Could not resolve active actor context.",
      status: 500,
    };
  }
}

async function getOwnedOrganization(input: {
  organizationId: string;
  actorId: string;
}): Promise<{
  organization: OrganizationRow | null;
  errorMessage: string | null;
  status: number;
}> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, owner_actor_id, organization_name")
    .eq("id", input.organizationId)
    .maybeSingle();

  if (error) {
    return {
      organization: null,
      errorMessage: error.message,
      status: 500,
    };
  }

  if (!data) {
    return {
      organization: null,
      errorMessage: "Organization not found.",
      status: 404,
    };
  }

  const organization = data as OrganizationRow;

  if (organization.owner_actor_id !== input.actorId) {
    return {
      organization: null,
      errorMessage: "Only the active organization owner can review its category.",
      status: 403,
    };
  }

  return {
    organization,
    errorMessage: null,
    status: 200,
  };
}

async function getBusinessDirectoryContext(): Promise<{
  context: ContextRow | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("contexts")
    .select("id, code")
    .eq("code", BUSINESS_DIRECTORY_CONTEXT_CODE)
    .single();

  if (error || !data) {
    return {
      context: null,
      errorMessage: error?.message ?? "business_directory context not found.",
    };
  }

  return {
    context: data as ContextRow,
    errorMessage: null,
  };
}

async function getOptionalObjectActionIds() {
  const [objectTypeResult, actionTypeResult] = await Promise.all([
    supabase
      .from("object_types")
      .select("id")
      .eq("code", ORGANIZATION_ENTITY_TYPE)
      .maybeSingle(),
    supabase
      .from("action_types")
      .select("id")
      .eq("code", "classify")
      .maybeSingle(),
  ]);

  const objectType = objectTypeResult.data as ObjectActionIdRow | null;
  const actionType = actionTypeResult.data as ObjectActionIdRow | null;

  return {
    objectTypeId: objectType?.id ?? null,
    actionTypeId: actionType?.id ?? null,
  };
}

async function getCurrentPrimaryClassification(input: {
  organizationId: string;
  contextId: string;
}): Promise<CurrentClassificationRow | null> {
  const { data, error } = await supabase
    .from("entity_classifications")
    .select(
      `
      id,
      entity_type,
      entity_id,
      object_type_id,
      action_type_id,
      context_id,
      contextual_category_id,
      classification_role,
      is_primary,
      status,
      source_type,
      confidence,
      evidence_json,
      updated_at
    `,
    )
    .eq("entity_type", ORGANIZATION_ENTITY_TYPE)
    .eq("entity_id", input.organizationId)
    .eq("context_id", input.contextId)
    .eq("classification_role", PRIMARY_CLASSIFICATION_ROLE)
    .eq("is_primary", true)
    .in("status", [...PUBLIC_CLASSIFICATION_STATUSES])
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data as CurrentClassificationRow[] | null) ?? [];

  return rows[0] ?? null;
}

async function getApprovedContextualCategory(input: {
  contextualCategoryId: string;
  contextId: string;
}): Promise<{
  category: ContextualCategoryRow | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("contextual_categories")
    .select("id, context_id, slug, name, status, is_active")
    .eq("id", input.contextualCategoryId)
    .eq("context_id", input.contextId)
    .eq("is_active", true)
    .in("status", [...PUBLIC_CLASSIFICATION_STATUSES])
    .maybeSingle();

  if (error) {
    return {
      category: null,
      errorMessage: error.message,
    };
  }

  if (!data) {
    return {
      category: null,
      errorMessage:
        "Target category was not found or is not approved/published in business_directory.",
    };
  }

  return {
    category: data as ContextualCategoryRow,
    errorMessage: null,
  };
}

async function getClassificationForCategory(input: {
  organizationId: string;
  contextId: string;
  contextualCategoryId: string;
}): Promise<CurrentClassificationRow | null> {
  const { data, error } = await supabase
    .from("entity_classifications")
    .select(
      `
      id,
      entity_type,
      entity_id,
      object_type_id,
      action_type_id,
      context_id,
      contextual_category_id,
      classification_role,
      is_primary,
      status,
      source_type,
      confidence,
      evidence_json,
      updated_at
    `,
    )
    .eq("entity_type", ORGANIZATION_ENTITY_TYPE)
    .eq("entity_id", input.organizationId)
    .eq("context_id", input.contextId)
    .eq("classification_role", PRIMARY_CLASSIFICATION_ROLE)
    .eq("contextual_category_id", input.contextualCategoryId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data as CurrentClassificationRow[] | null) ?? [];

  return rows[0] ?? null;
}

async function confirmCurrentCategory(input: {
  currentClassification: CurrentClassificationRow;
  appUser: AppUserRow;
  note: string | null;
  nowIso: string;
}) {
  const evidenceJson = appendCategoryReviewEvent({
    evidenceJson: input.currentClassification.evidence_json,
    action: "confirm_ai_candidate",
    reviewState: "owner_confirmed",
    appUserId: input.appUser.id,
    note: input.note,
    nowIso: input.nowIso,
    previousContextualCategoryId:
      input.currentClassification.contextual_category_id,
    nextContextualCategoryId: input.currentClassification.contextual_category_id,
  });

  const { data, error } = await supabase
    .from("entity_classifications")
    .update({
      status: "approved",
      source_type: OWNER_CONFIRMED_SOURCE_TYPE,
      evidence_json: evidenceJson,
      is_primary: true,
      updated_at: input.nowIso,
    })
    .eq("id", input.currentClassification.id)
    .select("id, contextual_category_id, status, source_type, evidence_json")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function removeCurrentCategory(input: {
  currentClassification: CurrentClassificationRow;
  appUser: AppUserRow;
  note: string | null;
  nowIso: string;
}) {
  const evidenceJson = appendCategoryReviewEvent({
    evidenceJson: input.currentClassification.evidence_json,
    action: "remove_current_category",
    reviewState: "owner_removed",
    appUserId: input.appUser.id,
    note: input.note,
    nowIso: input.nowIso,
    previousContextualCategoryId:
      input.currentClassification.contextual_category_id,
    nextContextualCategoryId: null,
  });

  const { data, error } = await supabase
    .from("entity_classifications")
    .update({
      status: "archived",
      is_primary: false,
      evidence_json: evidenceJson,
      updated_at: input.nowIso,
    })
    .eq("id", input.currentClassification.id)
    .select("id, contextual_category_id, status, source_type, evidence_json")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function replaceCurrentCategory(input: {
  organizationId: string;
  context: ContextRow;
  currentClassification: CurrentClassificationRow | null;
  targetCategory: ContextualCategoryRow;
  appUser: AppUserRow;
  note: string | null;
  nowIso: string;
}) {
  const objectActionIds = await getOptionalObjectActionIds();

  if (
    input.currentClassification &&
    input.currentClassification.contextual_category_id &&
    input.currentClassification.contextual_category_id !== input.targetCategory.id
  ) {
    const archivedEvidenceJson = appendCategoryReviewEvent({
      evidenceJson: input.currentClassification.evidence_json,
      action: "replace_current_category",
      reviewState: "owner_replaced",
      appUserId: input.appUser.id,
      note: input.note,
      nowIso: input.nowIso,
      previousContextualCategoryId:
        input.currentClassification.contextual_category_id,
      nextContextualCategoryId: input.targetCategory.id,
    });

    const { error: archiveError } = await supabase
      .from("entity_classifications")
      .update({
        status: "archived",
        is_primary: false,
        evidence_json: archivedEvidenceJson,
        updated_at: input.nowIso,
      })
      .eq("id", input.currentClassification.id);

    if (archiveError) {
      throw new Error(archiveError.message);
    }
  }

  const existingTarget = await getClassificationForCategory({
    organizationId: input.organizationId,
    contextId: input.context.id,
    contextualCategoryId: input.targetCategory.id,
  });

  const targetEvidenceJson = appendCategoryReviewEvent({
    evidenceJson: existingTarget?.evidence_json ?? null,
    action: "replace_current_category",
    reviewState: "owner_confirmed",
    appUserId: input.appUser.id,
    note: input.note,
    nowIso: input.nowIso,
    previousContextualCategoryId:
      input.currentClassification?.contextual_category_id ?? null,
    nextContextualCategoryId: input.targetCategory.id,
  });

  const classificationValues = {
    object_type_id:
      existingTarget?.object_type_id ??
      input.currentClassification?.object_type_id ??
      objectActionIds.objectTypeId,
    action_type_id:
      existingTarget?.action_type_id ??
      input.currentClassification?.action_type_id ??
      objectActionIds.actionTypeId,
    context_id: input.context.id,
    contextual_category_id: input.targetCategory.id,
    classification_role: PRIMARY_CLASSIFICATION_ROLE,
    is_primary: true,
    status: "approved",
    source_type: OWNER_CONFIRMED_SOURCE_TYPE,
    confidence: 1,
    classified_by_user_id: input.appUser.id,
    evidence_json: targetEvidenceJson,
    updated_at: input.nowIso,
  };

  const { data, error } = existingTarget
    ? await supabase
        .from("entity_classifications")
        .update(classificationValues)
        .eq("id", existingTarget.id)
        .select("id, contextual_category_id, status, source_type, evidence_json")
        .single()
    : await supabase
        .from("entity_classifications")
        .insert({
          entity_type: ORGANIZATION_ENTITY_TYPE,
          entity_id: input.organizationId,
          ...classificationValues,
        })
        .select("id, contextual_category_id, status, source_type, evidence_json")
        .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function PATCH(
  request: NextRequest,
  context: CategoryReviewRouteContext,
) {
  const resolvedParams = await context.params;
  const organizationId = normalizeUuid(resolvedParams.id);

  if (!organizationId) {
    return createErrorResponse("organization id must be a valid UUID.");
  }

  let body: CategoryReviewRequestBody;

  try {
    body = (await request.json()) as CategoryReviewRequestBody;
  } catch {
    return createErrorResponse("Invalid JSON body.");
  }

  const action = normalizeAction(body.action);

  if (!action) {
    return createErrorResponse(
      "action must be confirm_ai_candidate, remove_current_category or replace_current_category.",
    );
  }

  const note = normalizeNote(body.note);

  if (body.note && note === null) {
    return createErrorResponse("note must be a non-empty string.");
  }

  const {
    actorContext,
    errorMessage: authErrorMessage,
    status: authStatus,
  } = await getCurrentActorContext();

  if (authErrorMessage || !actorContext) {
    return createErrorResponse(
      authErrorMessage ?? "Not authenticated.",
      authStatus,
    );
  }

  const appUser: AppUserRow = {
    id: actorContext.appUserId,
  };

  const {
    organization,
    errorMessage: organizationErrorMessage,
    status: organizationStatus,
  } = await getOwnedOrganization({
    organizationId,
    actorId: actorContext.actorId,
  });

  if (organizationErrorMessage || !organization) {
    return createErrorResponse(
      organizationErrorMessage ?? "Organization not found.",
      organizationStatus,
    );
  }

  const { context: businessDirectoryContext, errorMessage: contextErrorMessage } =
    await getBusinessDirectoryContext();

  if (contextErrorMessage || !businessDirectoryContext) {
    return createErrorResponse(
      contextErrorMessage ?? "business_directory context not found.",
      500,
    );
  }

  const nowIso = new Date().toISOString();

  try {
    const currentClassification = await getCurrentPrimaryClassification({
      organizationId,
      contextId: businessDirectoryContext.id,
    });

    if (
      (action === "confirm_ai_candidate" ||
        action === "remove_current_category") &&
      !currentClassification
    ) {
      return createErrorResponse(
        "Current approved primary category was not found for this organization.",
        404,
      );
    }

    if (action === "confirm_ai_candidate" && currentClassification) {
      const updatedClassification = await confirmCurrentCategory({
        currentClassification,
        appUser,
        note,
        nowIso,
      });

      return NextResponse.json({
        ok: true,
        action,
        organizationId,
        organizationName: organization.organization_name,
        actingAs: {
          actorId: actorContext.actorId,
          actorType: actorContext.actorType,
          profileId: actorContext.profile.profileId,
        },
        categoryReview: {
          reviewState: "owner_confirmed",
          publicDataMutation: true,
          semanticCloudVisible: true,
          previousContextualCategoryId:
            currentClassification.contextual_category_id,
          nextContextualCategoryId:
            currentClassification.contextual_category_id,
          updatedClassification,
        },
      });
    }

    if (action === "remove_current_category" && currentClassification) {
      const updatedClassification = await removeCurrentCategory({
        currentClassification,
        appUser,
        note,
        nowIso,
      });

      return NextResponse.json({
        ok: true,
        action,
        organizationId,
        organizationName: organization.organization_name,
        actingAs: {
          actorId: actorContext.actorId,
          actorType: actorContext.actorType,
          profileId: actorContext.profile.profileId,
        },
        categoryReview: {
          reviewState: "owner_removed",
          publicDataMutation: true,
          semanticCloudVisible: false,
          previousContextualCategoryId:
            currentClassification.contextual_category_id,
          nextContextualCategoryId: null,
          updatedClassification,
        },
      });
    }

    const targetContextualCategoryId = normalizeUuid(body.contextualCategoryId);

    if (!targetContextualCategoryId) {
      return createErrorResponse(
        "contextualCategoryId must be a valid UUID for replace_current_category.",
      );
    }

    const { category: targetCategory, errorMessage: categoryErrorMessage } =
      await getApprovedContextualCategory({
        contextualCategoryId: targetContextualCategoryId,
        contextId: businessDirectoryContext.id,
      });

    if (categoryErrorMessage || !targetCategory) {
      return createErrorResponse(
        categoryErrorMessage ??
          "Target category was not found in business_directory.",
        404,
      );
    }

    const updatedClassification = await replaceCurrentCategory({
      organizationId,
      context: businessDirectoryContext,
      currentClassification,
      targetCategory,
      appUser,
      note,
      nowIso,
    });

    return NextResponse.json({
      ok: true,
      action,
      organizationId,
      organizationName: organization.organization_name,
      actingAs: {
        actorId: actorContext.actorId,
        actorType: actorContext.actorType,
        profileId: actorContext.profile.profileId,
      },
      categoryReview: {
        reviewState: "owner_confirmed",
        publicDataMutation: true,
        semanticCloudVisible: true,
        previousContextualCategoryId:
          currentClassification?.contextual_category_id ?? null,
        nextContextualCategoryId: targetCategory.id,
        targetCategory: {
          id: targetCategory.id,
          slug: targetCategory.slug,
          name: targetCategory.name,
        },
        updatedClassification,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error instanceof Error
        ? error.message
        : "Unknown organization category review error.",
      500,
    );
  }
}
