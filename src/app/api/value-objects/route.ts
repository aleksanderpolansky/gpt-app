import { NextResponse } from "next/server";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../lib/actor-context";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";
import {
  isValueObjectLeafKindV2,
  isValueObjectStructuralKindV2,
  type ValueObjectLeafKindV2,
  type ValueObjectStructuralKindV2,
} from "@/types/reality-core/reality-core-contracts-v2";

export const dynamic = "force-dynamic";

type UsageScope = "private" | "commercial";

type AppUserRow = {
  id: string;
  auth0_sub?: string | null;
};

type ActorRow = {
  id: string;
  actor_type?: string | null;
};

type OrganizationRow = {
  id: string;
  organization_name: string | null;
  organization_type: string | null;
  status: string | null;
  owner_actor_id: string | null;
};

type CurrentUserContext =
  | {
      appUser: AppUserRow;
      personActor: ActorRow;
      errorResponse: null;
    }
  | {
      appUser: null;
      personActor: null;
      errorResponse: NextResponse;
    };

type OrganizationAccessResult =
  | {
      organization: OrganizationRow;
      errorResponse: null;
    }
  | {
      organization: null;
      errorResponse: NextResponse;
    };

type ValueObjectRequestBody = {
  usageScope?: unknown;
  creationMode?: unknown;
  parentValueObjectId?: unknown;
  organizationId?: unknown;
  valueType?: unknown;
  title?: unknown;
  description?: unknown;
  unitType?: unknown;
  defaultPrice?: unknown;
  defaultCurrency?: unknown;
  defaultDurationMinutes?: unknown;
  isMarketplaceSellable?: unknown;
  isFreePossible?: unknown;
  commercialUsage?: unknown;
  branchTypeCode?: unknown;
  objectKind?: unknown;
  locale?: unknown;
};

function normalizeRequiredString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function normalizeOptionalString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function normalizeOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function normalizeUsageScope(value: unknown): UsageScope | null {
  if (value === "private" || value === "commercial") {
    return value;
  }

  return null;
}

function normalizeCommercialUsage(value: unknown): string {
  const normalized = normalizeOptionalString(value);

  if (
    normalized === "catalog_info" ||
    normalized === "certificate_base" ||
    normalized === "both"
  ) {
    return normalized;
  }

  return "none";
}

function normalizeDraftCreationMode(value: unknown): boolean {
  const normalized = normalizeOptionalString(value);

  return (
    normalized === "draft" ||
    normalized === "manual_draft" ||
    normalized === "draft_first"
  );
}

function normalizeRootDraftCreationMode(value: unknown): boolean {
  return normalizeOptionalString(value) === "root_draft_v3";
}

function normalizeLeafDraftCreationMode(value: unknown): boolean {
  return normalizeOptionalString(value) === "leaf_draft_v3";
}

function normalizeIntermediateDraftCreationMode(value: unknown): boolean {
  return normalizeOptionalString(value) === "intermediate_draft_v3";
}

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalized,
  )
    ? normalized
    : null;
}

function normalizeBranchTypeCode(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return /^[a-z][a-z0-9_]{1,79}$/.test(normalized)
    ? normalized
    : null;
}

function normalizeStructuralObjectKind(
  value: unknown,
): ValueObjectStructuralKindV2 | null {
  if (value === undefined || value === null || value === "") {
    return "other";
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return isValueObjectStructuralKindV2(normalized) ? normalized : null;
}

function normalizeLeafObjectKind(
  value: unknown,
): ValueObjectLeafKindV2 | null {
  if (value === undefined || value === null || value === "") {
    return "activity_pattern";
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return isValueObjectLeafKindV2(normalized) ? normalized : null;
}

function normalizeLocale(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  return ["en", "pl", "ru", "uk", "de", "es", "cs"].includes(normalized)
    ? normalized
    : null;
}

function buildValueObjectDetailUrl(id: string, locale: string | null) {
  const pathname = `/value-objects/${id}`;

  if (!locale || locale === "en") {
    return pathname;
  }

  return `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function getDraftDefaults(usageScope: UsageScope) {
  if (usageScope === "commercial") {
    return {
      title: "Новый коммерческий ценный объект",
      valueType: "service",
    };
  }

  return {
    title: "Новый частный ценный объект",
    valueType: "personal_value_object",
  };
}

function buildValueObjectEditUrl(id: string) {
  return `/value-objects/${id}/edit`;
}

async function getCurrentUserContext(): Promise<CurrentUserContext> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      appUser: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      ),
    };
  }

  try {
    const actorContext = await resolveActiveActorContext(session.user.sub);

    return {
      appUser: {
        id: actorContext.appUserId,
        auth0_sub: session.user.sub,
      },
      personActor: {
        id: actorContext.actorId,
        actor_type: actorContext.actorType,
      },
      errorResponse: null,
    };
  } catch (error) {
    if (error instanceof ActorContextError) {
      return {
        appUser: null,
        personActor: null,
        errorResponse: NextResponse.json(
          {
            error: error.message,
            errorCode: error.code,
          },
          { status: error.status },
        ),
      };
    }

    return {
      appUser: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: "Could not resolve active actor context" },
        { status: 500 },
      ),
    };
  }
}

async function verifyOrganizationAccess(
  activeActorId: string,
  organizationId: string,
): Promise<OrganizationAccessResult> {
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, organization_name, organization_type, status, owner_actor_id")
    .eq("id", organizationId)
    .eq("owner_actor_id", activeActorId)
    .single();

  if (organizationError || !organization) {
    return {
      organization: null,
      errorResponse: NextResponse.json(
        { error: "Organization not found or access denied" },
        { status: 403 },
      ),
    };
  }

  return {
    organization,
    errorResponse: null,
  };
}

export async function GET() {
  const { appUser, personActor, errorResponse } =
    await getCurrentUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  const { data: valueObjects, error: valueObjectsError } = await supabase
    .from("value_objects")
    .select(
      `
      *,
      organizations (
        id,
        organization_name,
        organization_type,
        status
      )
    `,
    )
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
    .order("created_at", { ascending: false });

  if (valueObjectsError) {
    return NextResponse.json(
      { error: valueObjectsError.message },
      { status: 500 },
    );
  }

  const observationValueObjects = (valueObjects ?? []).filter((valueObject) => {
    const metadata =
      valueObject &&
      typeof valueObject === "object" &&
      valueObject.metadata_json &&
      typeof valueObject.metadata_json === "object" &&
      !Array.isArray(valueObject.metadata_json)
        ? (valueObject.metadata_json as Record<string, unknown>)
        : null;

    return (
      metadata?.system_hidden_from_observation_ui !== true &&
      metadata?.system_root_code !== "products_services"
    );
  });

  return NextResponse.json({
    ok: true,
    valueObjects: observationValueObjects,
  });
}

async function createRootDraftValueObject(
  body: ValueObjectRequestBody,
  appUser: AppUserRow,
  personActor: ActorRow,
) {
  const title = normalizeRequiredString(body.title);
  const description = normalizeOptionalString(body.description);
  const branchTypeCode = normalizeBranchTypeCode(body.branchTypeCode);
  const objectKind = normalizeStructuralObjectKind(body.objectKind);
  const locale = normalizeLocale(body.locale);

  if (!title || title.length > 180) {
    return NextResponse.json(
      { error: "title is required and must be 180 characters or fewer" },
      { status: 400 },
    );
  }

  if (description && description.length > 4000) {
    return NextResponse.json(
      { error: "description must be 4000 characters or fewer" },
      { status: 400 },
    );
  }

  if (!branchTypeCode) {
    return NextResponse.json(
      { error: "A valid branchTypeCode is required" },
      { status: 400 },
    );
  }

  if (!objectKind) {
    return NextResponse.json(
      {
        error:
          "A valid structural objectKind is required; leaf-only kinds are not allowed",
      },
      { status: 400 },
    );
  }

  const { data: branchType, error: branchTypeError } = await supabase
    .from("value_object_branch_types")
    .select("branch_type_code, status")
    .eq("branch_type_code", branchTypeCode)
    .eq("status", "active")
    .maybeSingle();

  if (branchTypeError) {
    return NextResponse.json(
      { error: branchTypeError.message },
      { status: 500 },
    );
  }

  if (!branchType) {
    return NextResponse.json(
      { error: "Selected branch type is not active" },
      { status: 400 },
    );
  }

  const { data: valueObject, error: valueObjectError } = await supabase
    .from("value_objects")
    .insert({
      owner_actor_id: personActor.id,
      created_by_actor_id: personActor.id,
      actor_id: personActor.id,
      app_user_id: appUser.id,
      owner_user_id: appUser.id,
      organization_id: null,
      usage_scope: "private",
      value_type: objectKind,
      object_kind: objectKind,
      node_role_code: "structural",
      branch_type_code: branchTypeCode,
      root_value_object_id: null,
      parent_value_object_id: null,
      instance_of_value_object_id: null,
      title,
      description,
      unit_type: null,
      default_price: null,
      default_currency: null,
      default_duration_minutes: null,
      is_marketplace_sellable: false,
      is_free_possible: false,
      commercial_usage: "none",
      visibility: "private",
      privacy_level: "private",
      sensitivity_level: "standard",
      source: "manual",
      status: "draft",
      identity_attributes_json: {},
      metadata_json: {
        authoring_contract: "reality-model-v3-p6-root",
      },
    })
    .select(
      `
      id,
      title,
      description,
      object_kind,
      node_role_code,
      branch_type_code,
      root_value_object_id,
      parent_value_object_id,
      status,
      visibility,
      privacy_level,
      sensitivity_level,
      created_at,
      updated_at
    `,
    )
    .single();

  if (valueObjectError) {
    return NextResponse.json(
      {
        error: valueObjectError.message,
        errorCode: valueObjectError.code ?? null,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "root_draft_v3",
    valueObject,
    redirectUrl: buildValueObjectDetailUrl(valueObject.id, locale),
  });
}


async function getOwnedStructuralParent(
  parentValueObjectId: string,
  appUser: AppUserRow,
  personActor: ActorRow,
) {
  const { data: parentData, error: parentError } = await supabase
    .from("value_objects")
    .select(
      `
      id,
      title,
      object_kind,
      node_role_code,
      branch_type_code,
      root_value_object_id,
      parent_value_object_id,
      status
    `,
    )
    .eq("id", parentValueObjectId)
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
    .maybeSingle();

  if (parentError) {
    return {
      parent: null,
      branchTypeCode: null,
      rootValueObjectId: null,
      errorResponse: NextResponse.json(
        { error: parentError.message },
        { status: 500 },
      ),
    };
  }

  if (!parentData) {
    return {
      parent: null,
      branchTypeCode: null,
      rootValueObjectId: null,
      errorResponse: NextResponse.json(
        { error: "Parent observation object not found or access denied" },
        { status: 404 },
      ),
    };
  }

  const branchTypeCode = normalizeBranchTypeCode(
    parentData.branch_type_code,
  );
  const rootValueObjectId = normalizeUuid(
    parentData.root_value_object_id,
  );
  const parentIsEligible =
    parentData.node_role_code === "structural" &&
    isValueObjectStructuralKindV2(parentData.object_kind) &&
    branchTypeCode !== null &&
    rootValueObjectId !== null &&
    (parentData.status === "draft" || parentData.status === "active");

  if (!parentIsEligible) {
    return {
      parent: null,
      branchTypeCode: null,
      rootValueObjectId: null,
      errorResponse: NextResponse.json(
        {
          error:
            "Children can be created only under an owned active or draft structural observation object",
        },
        { status: 400 },
      ),
    };
  }

  return {
    parent: parentData,
    branchTypeCode,
    rootValueObjectId,
    errorResponse: null,
  };
}

async function createIntermediateDraftValueObject(
  body: ValueObjectRequestBody,
  appUser: AppUserRow,
  personActor: ActorRow,
) {
  const parentValueObjectId = normalizeUuid(body.parentValueObjectId);
  const title = normalizeRequiredString(body.title);
  const description = normalizeOptionalString(body.description);
  const objectKind = normalizeStructuralObjectKind(body.objectKind);
  const locale = normalizeLocale(body.locale);

  if (!parentValueObjectId) {
    return NextResponse.json(
      { error: "A valid parentValueObjectId is required" },
      { status: 400 },
    );
  }

  if (!title || title.length > 180) {
    return NextResponse.json(
      { error: "title is required and must be 180 characters or fewer" },
      { status: 400 },
    );
  }

  if (description && description.length > 4000) {
    return NextResponse.json(
      { error: "description must be 4000 characters or fewer" },
      { status: 400 },
    );
  }

  if (!objectKind) {
    return NextResponse.json(
      {
        error:
          "A valid structural objectKind is required; leaf-only kinds are not allowed",
      },
      { status: 400 },
    );
  }

  const {
    parent,
    branchTypeCode,
    rootValueObjectId,
    errorResponse,
  } = await getOwnedStructuralParent(
    parentValueObjectId,
    appUser,
    personActor,
  );

  if (errorResponse || !parent || !branchTypeCode || !rootValueObjectId) {
    return (
      errorResponse ??
      NextResponse.json(
        { error: "Structural parent resolution failed" },
        { status: 500 },
      )
    );
  }

  const { data: valueObject, error: valueObjectError } = await supabase
    .from("value_objects")
    .insert({
      owner_actor_id: personActor.id,
      created_by_actor_id: personActor.id,
      actor_id: personActor.id,
      app_user_id: appUser.id,
      owner_user_id: appUser.id,
      organization_id: null,
      usage_scope: "private",
      value_type: objectKind,
      object_kind: objectKind,
      node_role_code: "structural",
      branch_type_code: branchTypeCode,
      root_value_object_id: rootValueObjectId,
      parent_value_object_id: parent.id,
      instance_of_value_object_id: null,
      title,
      description,
      unit_type: null,
      default_price: null,
      default_currency: null,
      default_duration_minutes: null,
      is_marketplace_sellable: false,
      is_free_possible: false,
      commercial_usage: "none",
      visibility: "private",
      privacy_level: "private",
      sensitivity_level: "standard",
      source: "manual",
      status: "draft",
      identity_attributes_json: {},
      metadata_json: {
        authoring_contract: "reality-model-v3-p6-intermediate",
        parent_object_id: parent.id,
        root_object_id: rootValueObjectId,
      },
    })
    .select(
      `
      id,
      title,
      description,
      object_kind,
      node_role_code,
      branch_type_code,
      root_value_object_id,
      parent_value_object_id,
      status,
      visibility,
      privacy_level,
      sensitivity_level,
      created_at,
      updated_at
    `,
    )
    .single();

  if (valueObjectError) {
    return NextResponse.json(
      {
        error: valueObjectError.message,
        errorCode: valueObjectError.code ?? null,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "intermediate_draft_v3",
    valueObject,
    parent: {
      id: parent.id,
      title: parent.title,
      branchTypeCode,
      rootValueObjectId,
    },
    redirectUrl: buildValueObjectDetailUrl(valueObject.id, locale),
  });
}

async function createLeafDraftValueObject(
  body: ValueObjectRequestBody,
  appUser: AppUserRow,
  personActor: ActorRow,
) {
  const parentValueObjectId = normalizeUuid(body.parentValueObjectId);
  const title = normalizeRequiredString(body.title);
  const description = normalizeOptionalString(body.description);
  const objectKind = normalizeLeafObjectKind(body.objectKind);
  const locale = normalizeLocale(body.locale);

  if (!parentValueObjectId) {
    return NextResponse.json(
      { error: "A valid parentValueObjectId is required" },
      { status: 400 },
    );
  }

  if (!objectKind) {
    return NextResponse.json(
      {
        error:
          "A valid leaf objectKind is required: activity_pattern, product_type or service_type",
      },
      { status: 400 },
    );
  }

  if (!title || title.length > 180) {
    return NextResponse.json(
      { error: "title is required and must be 180 characters or fewer" },
      { status: 400 },
    );
  }

  if (description && description.length > 4000) {
    return NextResponse.json(
      { error: "description must be 4000 characters or fewer" },
      { status: 400 },
    );
  }

  const {
    parent,
    branchTypeCode,
    rootValueObjectId,
    errorResponse,
  } = await getOwnedStructuralParent(
    parentValueObjectId,
    appUser,
    personActor,
  );

  if (errorResponse || !parent || !branchTypeCode || !rootValueObjectId) {
    return (
      errorResponse ??
      NextResponse.json(
        { error: "Structural parent resolution failed" },
        { status: 500 },
      )
    );
  }

  const { data: valueObject, error: valueObjectError } = await supabase
    .from("value_objects")
    .insert({
      owner_actor_id: personActor.id,
      created_by_actor_id: personActor.id,
      actor_id: personActor.id,
      app_user_id: appUser.id,
      owner_user_id: appUser.id,
      organization_id: null,
      usage_scope: "private",
      value_type: objectKind,
      object_kind: objectKind,
      node_role_code: "activity_leaf",
      branch_type_code: branchTypeCode,
      root_value_object_id: rootValueObjectId,
      parent_value_object_id: parent.id,
      instance_of_value_object_id: null,
      title,
      description,
      unit_type: null,
      default_price: null,
      default_currency: null,
      default_duration_minutes: null,
      is_marketplace_sellable: false,
      is_free_possible: false,
      commercial_usage: "none",
      visibility: "private",
      privacy_level: "private",
      sensitivity_level: "standard",
      source: "manual",
      status: "draft",
      identity_attributes_json: {},
      metadata_json: {
        authoring_contract: "pgc2-product-service-leaf-v1",
        leaf_object_kind: objectKind,
        parent_object_id: parent.id,
        root_object_id: rootValueObjectId,
      },
    })
    .select(
      `
      id,
      title,
      description,
      object_kind,
      node_role_code,
      branch_type_code,
      root_value_object_id,
      parent_value_object_id,
      status,
      visibility,
      privacy_level,
      sensitivity_level,
      created_at,
      updated_at
    `,
    )
    .single();

  if (valueObjectError) {
    return NextResponse.json(
      {
        error: valueObjectError.message,
        errorCode: valueObjectError.code ?? null,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "leaf_draft_v3",
    valueObject,
    parent: {
      id: parent.id,
      title: parent.title,
      branchTypeCode,
      rootValueObjectId,
    },
    redirectUrl: buildValueObjectDetailUrl(valueObject.id, locale),
  });
}

async function createDraftValueObject(
  body: ValueObjectRequestBody,
  appUser: AppUserRow,
  personActor: ActorRow,
  usageScope: UsageScope,
) {
  const defaults = getDraftDefaults(usageScope);
  const organizationId = normalizeOptionalString(body.organizationId);
  const valueType = normalizeOptionalString(body.valueType) ?? defaults.valueType;
  const title = normalizeOptionalString(body.title) ?? defaults.title;
  const description = normalizeOptionalString(body.description);
  const unitType = normalizeOptionalString(body.unitType);
  const defaultPrice = normalizeOptionalNumber(body.defaultPrice);
  const defaultCurrency = normalizeOptionalString(body.defaultCurrency);
  const defaultDurationMinutes = normalizeOptionalNumber(
    body.defaultDurationMinutes,
  );
  const isMarketplaceSellable =
    usageScope === "commercial" ? normalizeBoolean(body.isMarketplaceSellable) : false;
  const isFreePossible = normalizeBoolean(body.isFreePossible);
  const commercialUsage =
    usageScope === "commercial" ? normalizeCommercialUsage(body.commercialUsage) : "none";

  let organization: OrganizationRow | null = null;

  if (usageScope === "commercial") {
    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required for commercial Value Object drafts" },
        { status: 400 },
      );
    }

    const {
      organization: verifiedOrganization,
      errorResponse: organizationAccessErrorResponse,
    } = await verifyOrganizationAccess(personActor.id, organizationId);

    if (organizationAccessErrorResponse) {
      return organizationAccessErrorResponse;
    }

    organization = verifiedOrganization;
  }

  const { data: valueObject, error: valueObjectError } = await supabase
    .from("value_objects")
    .insert({
      owner_actor_id: personActor.id,
      created_by_actor_id: personActor.id,
      actor_id: personActor.id,
      app_user_id: appUser.id,
      owner_user_id: appUser.id,
      organization_id: organization?.id ?? null,
      usage_scope: usageScope,
      value_type: valueType,
      title,
      description,
      unit_type: unitType,
      default_price: defaultPrice,
      default_currency: defaultCurrency,
      default_duration_minutes: defaultDurationMinutes,
      is_marketplace_sellable: isMarketplaceSellable,
      is_free_possible: isFreePossible,
      commercial_usage: commercialUsage,
      visibility: "private",
      source: "manual",
      status: "draft",
    })
    .select(
      `
      *,
      organizations (
        id,
        organization_name,
        organization_type,
        status
      )
    `,
    )
    .single();

  if (valueObjectError) {
    return NextResponse.json(
      { error: valueObjectError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "draft_first",
    valueObject,
    redirectUrl: buildValueObjectEditUrl(valueObject.id),
  });
}

async function createLegacyCommercialValueObject(
  body: ValueObjectRequestBody,
  appUser: AppUserRow,
  personActor: ActorRow,
) {
  const organizationId = normalizeRequiredString(body.organizationId);
  const valueType = normalizeRequiredString(body.valueType);
  const title = normalizeRequiredString(body.title);
  const description = normalizeOptionalString(body.description);
  const unitType = normalizeOptionalString(body.unitType);
  const defaultPrice = normalizeOptionalNumber(body.defaultPrice);
  const defaultCurrency = normalizeOptionalString(body.defaultCurrency);
  const defaultDurationMinutes = normalizeOptionalNumber(
    body.defaultDurationMinutes,
  );
  const isMarketplaceSellable = normalizeBoolean(body.isMarketplaceSellable);
  const isFreePossible = normalizeBoolean(body.isFreePossible);

  if (!organizationId || !valueType || !title) {
    return NextResponse.json(
      { error: "organizationId, valueType and title are required" },
      { status: 400 },
    );
  }

  const { organization, errorResponse: organizationAccessErrorResponse } =
    await verifyOrganizationAccess(personActor.id, organizationId);

  if (organizationAccessErrorResponse) {
    return organizationAccessErrorResponse;
  }

  const { data: valueObject, error: valueObjectError } = await supabase
    .from("value_objects")
    .insert({
      owner_actor_id: personActor.id,
      created_by_actor_id: personActor.id,
      actor_id: personActor.id,
      app_user_id: appUser.id,
      owner_user_id: appUser.id,
      organization_id: organization.id,
      usage_scope: "commercial",
      value_type: valueType,
      title,
      description,
      unit_type: unitType,
      default_price: defaultPrice,
      default_currency: defaultCurrency,
      default_duration_minutes: defaultDurationMinutes,
      is_marketplace_sellable: isMarketplaceSellable,
      is_free_possible: isFreePossible,
      commercial_usage: "none",
      visibility: "private",
      source: "manual",
      status: "active",
    })
    .select(
      `
      *,
      organizations (
        id,
        organization_name,
        organization_type,
        status
      )
    `,
    )
    .single();

  if (valueObjectError) {
    return NextResponse.json(
      { error: valueObjectError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "legacy_commercial_active",
    valueObject,
  });
}

export async function POST(request: Request) {
  const { appUser, personActor, errorResponse } = await getCurrentUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  let body: ValueObjectRequestBody;

  try {
    body = (await request.json()) as ValueObjectRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const intermediateDraftRequested =
    normalizeIntermediateDraftCreationMode(body.creationMode);

  if (intermediateDraftRequested) {
    return createIntermediateDraftValueObject(
      body,
      appUser,
      personActor,
    );
  }

  const leafDraftRequested = normalizeLeafDraftCreationMode(
    body.creationMode,
  );

  if (leafDraftRequested) {
    return createLeafDraftValueObject(body, appUser, personActor);
  }

  const rootDraftRequested = normalizeRootDraftCreationMode(
    body.creationMode,
  );

  if (rootDraftRequested) {
    return createRootDraftValueObject(body, appUser, personActor);
  }

  const usageScope = normalizeUsageScope(body.usageScope);
  const draftModeRequested = normalizeDraftCreationMode(body.creationMode);

  if (draftModeRequested && !usageScope) {
    return NextResponse.json(
      { error: "usageScope is required for draft-first Value Object creation" },
      { status: 400 },
    );
  }

  if (usageScope) {
    return createDraftValueObject(body, appUser, personActor, usageScope);
  }

  return createLegacyCommercialValueObject(body, appUser, personActor);
}
