import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

type UsageScope = "private" | "commercial";

type AppUserRow = {
  id: string;
  auth0_sub?: string | null;
};

type PersonRow = {
  id: string;
  user_id?: string | null;
};

type ActorRow = {
  id: string;
  person_id?: string | null;
  actor_type?: string | null;
};

type OrganizationRow = {
  id: string;
  organization_name: string | null;
  organization_type: string | null;
  status: string | null;
  created_by_user_id: string | null;
};

type CurrentUserContext =
  | {
      appUser: AppUserRow;
      person: PersonRow;
      personActor: ActorRow;
      errorResponse: null;
    }
  | {
      appUser: null;
      person: null;
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
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      ),
    };
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("id, auth0_sub")
    .eq("auth0_sub", session.user.sub)
    .single();

  if (appUserError || !appUser) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: appUserError?.message ?? "App user not found" },
        { status: 500 },
      ),
    };
  }

  const { data: person, error: personError } = await supabase
    .from("persons")
    .select("id, user_id")
    .eq("user_id", appUser.id)
    .single();

  if (personError || !person) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: personError?.message ?? "Person not found" },
        { status: 500 },
      ),
    };
  }

  const { data: personActor, error: personActorError } = await supabase
    .from("actors")
    .select("id, person_id, actor_type")
    .eq("person_id", person.id)
    .eq("actor_type", "person")
    .single();

  if (personActorError || !personActor) {
    return {
      appUser: null,
      person: null,
      personActor: null,
      errorResponse: NextResponse.json(
        { error: personActorError?.message ?? "Person actor not found" },
        { status: 500 },
      ),
    };
  }

  return {
    appUser,
    person,
    personActor,
    errorResponse: null,
  };
}

async function verifyOrganizationAccess(
  appUserId: string,
  organizationId: string,
): Promise<OrganizationAccessResult> {
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, organization_name, organization_type, status, created_by_user_id")
    .eq("id", organizationId)
    .eq("created_by_user_id", appUserId)
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
  const { personActor, errorResponse } = await getCurrentUserContext();

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
    .eq("owner_actor_id", personActor.id)
    .order("created_at", { ascending: false });

  if (valueObjectsError) {
    return NextResponse.json(
      { error: valueObjectsError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    valueObjects,
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
    } = await verifyOrganizationAccess(appUser.id, organizationId);

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
    await verifyOrganizationAccess(appUser.id, organizationId);

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